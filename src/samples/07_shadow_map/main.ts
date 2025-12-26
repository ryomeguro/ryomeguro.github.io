import materialShaderCode from './shader.wgsl?raw';
import shadowMapShaderCode from './shadowMap.wgsl?raw';
import texturePreviewShaderCode from './texturePreview.wgsl?raw';
import { mat4, quat } from 'gl-matrix';
import * as dat from 'dat.gui';

import * as torus from './torus';
import * as quad from './quad';

const init = async () => {
    // 初期化
    if (!navigator.gpu) throw new Error('WebGPU not supported');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No adapter');
    const device = await adapter.requestDevice();
    const canvas = document.querySelector('#webgpu-canvas') as HTMLCanvasElement;
    const context = canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'premultiplied' });

    // トーラスのバッファ作成
    const torusVertexBuffer = device.createBuffer({
        size: torus.vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(torusVertexBuffer, 0, torus.vertices);

    const torusIndexBuffer = device.createBuffer({
        size: torus.indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(torusIndexBuffer, 0, torus.indices);

    // 板ポリのバッファ作成
    const quadVertexBuffer = device.createBuffer({
        size: quad.vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(quadVertexBuffer, 0, quad.vertices);

    const quadIndexBuffer = device.createBuffer({
        size: quad.indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(quadIndexBuffer, 0, quad.indices);

    // 頂点バッファのレイアウト
    const vertexBufferLayouts: Iterable<GPUVertexBufferLayout> = [
        {
            arrayStride: torus.vertexSize,
            attributes: [
                { shaderLocation: 0, offset: torus.positionOffset, format: 'float32x3' },
                { shaderLocation: 1, offset: torus.normalOffset, format: 'float32x3' },
            ],
        },
    ];

    // シェーダモジュール作成
    const materialShaderModule = device.createShaderModule({
        code: materialShaderCode,
    });

    const shadowMapShaderModule = device.createShaderModule({
        code: shadowMapShaderCode,
    });

    const texturePreviewShaderModule = device.createShaderModule({
        code: texturePreviewShaderCode,
    });

    // uniformを1つ入れるレイアウトの作成
    const uniformBufferBindGroupLayout = device.createBindGroupLayout({
        label: 'Uniform Buffer Bind Group Layout',
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform',
                },
            },
        ],
    });

    // シャドウマップに関する情報を入れるレイアウト
    const shadowMapBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform',
                },
            },
            {
                binding: 1,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: 'depth',
                },
            },
            {
                binding: 2,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                sampler: {
                    type: 'comparison',
                },
            },
        ],
    });

    // プリミティブの設定
    // 全て同じなのでここで定義しておく
    const primitive: GPUPrimitiveState = {
        topology: 'triangle-list',
        cullMode: 'back',
    };

    const torusPipeline = device.createRenderPipeline({
        label: 'Torus render pipeline',
        layout: device.createPipelineLayout({
            bindGroupLayouts: [
                shadowMapBindGroupLayout,
                uniformBufferBindGroupLayout,
            ],
        }),
        vertex: {
            module: materialShaderModule,
            entryPoint: 'vs_main',
            buffers: vertexBufferLayouts,
        },
        fragment: {
            module: materialShaderModule,
            entryPoint: 'fs_main',
            targets: [{ format }],
        },
        primitive,
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    const quadPipeline = device.createRenderPipeline({
        label: 'Quad render pipeline',
        layout: device.createPipelineLayout({
            bindGroupLayouts: [
                shadowMapBindGroupLayout,
                uniformBufferBindGroupLayout,
            ],
        }),
        vertex: {
            module: materialShaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: quad.vertexSize,
                attributes: [
                    { shaderLocation: 0, offset: quad.positionOffset, format: 'float32x3' },
                    { shaderLocation: 1, offset: quad.normalOffset, format: 'float32x3' },
                ],
            }],
        },
        fragment: {
            module: materialShaderModule,
            entryPoint: 'fs_main',
            targets: [{ format }],
        },
        primitive,
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    const shadowMapPipeline = device.createRenderPipeline({
        label: 'Shadow map render pipeline',
        layout: device.createPipelineLayout({
            label: 'Shadow map pipeline layout',
            bindGroupLayouts: [
                uniformBufferBindGroupLayout,
                uniformBufferBindGroupLayout,
            ],
        }),
        vertex: {
            module: shadowMapShaderModule,
            entryPoint: 'vs_main',
            buffers: vertexBufferLayouts,
        },
        primitive,
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    // const texturePreviewPipeline = device.createRenderPipeline({
    //     layout: 'auto',
    //     vertex: {
    //         module: texturePreviewShaderModule,
    //         entryPoint: 'vs_main',
    //         buffers: [{
    //             arrayStride: quad.vertexSize,
    //             attributes: [
    //                 { shaderLocation: 0, offset: quad.positionOffset, format: 'float32x3' }
    //             ],
    //         }],
    //     },
    //     fragment: {
    //         module: texturePreviewShaderModule,
    //         entryPoint: 'fs_main',
    //         targets: [{ format }],
    //     },
    //     primitive: {
    //         topology: 'triangle-list',
    //         cullMode: 'back',
    //     },
    //     depthStencil: {
    //         depthWriteEnabled: true,
    //         depthCompare: 'less',
    //         format: 'depth24plus',
    //     },
    // });

    const shadowMapTexture = device.createTexture({
        size: [1024, 1024],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    const shadowMapTextureView = shadowMapTexture.createView();

    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const matrixSize = 4 * 16; // 4x4 matrix

    const torusModelUniformBuffer = device.createBuffer({
        size: matrixSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const quadModelUniformBuffer = device.createBuffer({
        size: matrixSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const sceneUniformBuffer = device.createBuffer({
        size: 2 * 4 * 16 + 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const modelBindGroupForTorus = device.createBindGroup({
        layout: uniformBufferBindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: torusModelUniformBuffer } },
        ],
    });
    const modelBindGroupForQuad = device.createBindGroup({
        layout: uniformBufferBindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: quadModelUniformBuffer } }
        ],
    });
    const sceneBindGroupForRender = device.createBindGroup({
        layout: shadowMapBindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: sceneUniformBuffer } },
            { binding: 1, resource: shadowMapTextureView },
            {
                binding: 2, resource: device.createSampler({
                    compare: 'less',
                })
            }
        ],
    });

    const sceneBindGroupForShadowMap = device.createBindGroup({
        layout: uniformBufferBindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: sceneUniformBuffer } },
        ],
    });

    const shadowPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [],
        depthStencilAttachment: {
            view: shadowMapTextureView,
            depthStoreOp: 'store',
            depthLoadOp: 'clear',
            depthClearValue: 1.0,
        },
    };

    // カメラの行列計算
    const cameraProjectionMatrix = mat4.create();
    const cameraViewMatrix = mat4.create();
    const cameraViewProjMatrix = mat4.create();

    // Setup projection matrix
    const aspect = canvas.width / canvas.height;
    const fov = (30 * Math.PI) / 180;
    const near = 0.1;
    const far = 100.0;
    mat4.perspective(cameraProjectionMatrix, fov, aspect, near, far);

    // Setup view matrix (camera at (0, 0, 5) looking at origin)
    mat4.lookAt(
        cameraViewMatrix,
        [0, 0, 5],  // eye position
        [0, 0, 0],  // target position
        [0, 1, 0]   // up vector
    );
    mat4.multiply(cameraViewProjMatrix, cameraProjectionMatrix, cameraViewMatrix);

    var cameraViewProjMatrixArray = new Float32Array(cameraViewProjMatrix);

    // ライトの行列計算
    const lightProjectionMatrix = mat4.create();
    const lightViewMatrix = mat4.create();
    const lightViewProjMatrix = mat4.create();
    const lightPosition = [50, 100, 100];
    {
        const left = -2;
        const right = 2;
        const bottom = -2;
        const top = 2;
        const near = 50;
        const far = 200;
        mat4.ortho(lightProjectionMatrix, left, right, bottom, top, near, far);
    }
    {
        const center = [0, 0, 0];
        const up = [0, 1, 0];
        mat4.lookAt(lightViewMatrix, lightPosition, center, up);
    }
    mat4.multiply(lightViewProjMatrix, lightProjectionMatrix, lightViewMatrix);

    // Setup dat.GUI
    const settings = {
        speed: 1.0,
    };
    const gui = new dat.GUI({ autoPlace: false });
    gui.add(settings, 'speed', 0.0, 5.0).name('Rotation Speed');

    // Append GUI to sample controls
    const controlsContainer = document.querySelector('.sample-controls');
    if (controlsContainer) {
        controlsContainer.appendChild(gui.domElement);
    } else {
        // Fallback or create if not exists (though navigation.ts should have created it)
        const header = document.querySelector('.sample-header');
        if (header) {
            const controls = document.createElement('div');
            controls.className = 'sample-controls';
            header.appendChild(controls);
            controls.appendChild(gui.domElement);
        } else {
            // Absolute fallback if no header
            document.body.appendChild(gui.domElement);
            gui.domElement.style.position = 'absolute';
            gui.domElement.style.top = '10px';
            gui.domElement.style.right = '10px';
        }
    }

    let previousTime = Date.now() / 1000;
    let currentAngle = previousTime; // Start with current time to match previous behavior roughly, or 0

    function frame() {
        const now = Date.now() / 1000;
        const deltaTime = now - previousTime;
        previousTime = now;

        currentAngle += deltaTime * settings.speed;

        const modelMatrixTorus = mat4.create();
        const modelMatrixQuad = mat4.create();
        // Reset and rotate model matrix
        mat4.identity(modelMatrixTorus);
        {
            const rot = quat.create();
            quat.rotateX(rot, rot, currentAngle);
            quat.rotateZ(rot, rot, currentAngle);
            mat4.fromRotationTranslationScale(modelMatrixTorus, rot, [0, 0, 0], [0.5, 0.5, 0.5]);
        }

        mat4.identity(modelMatrixQuad);
        {
            const rot = quat.create();
            mat4.fromRotationTranslationScale(modelMatrixQuad, rot, [0, -1, 0], [5.0, 5.0, 5.0]);
        }

        // バッファを書き込む
        // byteOffsetとはTypedArrayがbufferの何バイト目から参照しているかを表している(Float32Arrayを作る時に指定できる。今回は0バイト目から参照している。)
        // byteLengthとはTypedArrayがbufferの何バイト分参照しているかを表している
        var lightViewProjMatrixArray = new Float32Array(lightViewProjMatrix);
        device.queue.writeBuffer(sceneUniformBuffer, 0, lightViewProjMatrixArray.buffer, lightViewProjMatrixArray.byteOffset, lightViewProjMatrixArray.byteLength);
        device.queue.writeBuffer(sceneUniformBuffer, 64, cameraViewProjMatrixArray.buffer, cameraViewProjMatrixArray.byteOffset, cameraViewProjMatrixArray.byteLength);
        var lightPositionArray = new Float32Array(lightPosition);
        device.queue.writeBuffer(sceneUniformBuffer, 128, lightPositionArray.buffer, lightPositionArray.byteOffset, lightPositionArray.byteLength);

        var modelMatrixTorusArray = new Float32Array(modelMatrixTorus);
        device.queue.writeBuffer(torusModelUniformBuffer, 0, modelMatrixTorusArray.buffer, modelMatrixTorusArray.byteOffset, modelMatrixTorusArray.byteLength);
        var modelMatrixQuadArray = new Float32Array(modelMatrixQuad);
        device.queue.writeBuffer(quadModelUniformBuffer, 0, modelMatrixQuadArray.buffer, modelMatrixQuadArray.byteOffset, modelMatrixQuadArray.byteLength);

        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();


        // シャドウの描画
        {
            const renderPass = commandEncoder.beginRenderPass(shadowPassDescriptor);

            renderPass.setPipeline(shadowMapPipeline);
            renderPass.setVertexBuffer(0, torusVertexBuffer);
            renderPass.setIndexBuffer(torusIndexBuffer, 'uint16');
            renderPass.setBindGroup(0, sceneBindGroupForShadowMap);
            renderPass.setBindGroup(1, modelBindGroupForTorus);
            renderPass.drawIndexed(torus.indices.length);

            renderPass.end();
        }

        // モデルの描画
        {
            const renderPass = commandEncoder.beginRenderPass({
                label: 'Model Render Pass',
                colorAttachments: [{
                    view: textureView,
                    clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
                depthStencilAttachment: {
                    view: depthTexture.createView(),
                    depthClearValue: 1.0,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store',
                },
            });

            // Torusの描画
            renderPass.setPipeline(torusPipeline);
            renderPass.setVertexBuffer(0, torusVertexBuffer);
            renderPass.setIndexBuffer(torusIndexBuffer, 'uint16');
            renderPass.setBindGroup(0, sceneBindGroupForRender);
            renderPass.setBindGroup(1, modelBindGroupForTorus);
            renderPass.drawIndexed(torus.indices.length);

            // Quadの描画
            renderPass.setPipeline(quadPipeline);
            renderPass.setVertexBuffer(0, quadVertexBuffer);
            renderPass.setIndexBuffer(quadIndexBuffer, 'uint16');
            renderPass.setBindGroup(0, sceneBindGroupForRender);
            renderPass.setBindGroup(1, modelBindGroupForQuad);
            renderPass.drawIndexed(quad.indices.length);

            renderPass.end();
        }

        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

init().catch(console.error);

export { };
