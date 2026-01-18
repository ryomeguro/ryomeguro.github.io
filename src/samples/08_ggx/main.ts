import materialPhongShaderCode from './shader_phong.wgsl?raw';
import materialGgxShaderCode from './shader_ggx_instancing.wgsl?raw';
import shadowMapShaderCode from './shadowMap.wgsl?raw';
import { TextureDepthPreview } from './textureDepthPreview';
import { mat4, quat, vec3 } from 'wgpu-matrix';
import { GuiManager } from './GuiManager';
import { PerformanceVisualizer } from './PerformanceVisualizer';

import * as ShaderBall from './ShaderBall';
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

    const shaderBallModel = await ShaderBall.ShaderBall.create(device);
    const quadModel = new quad.Quad(device);

    // シェーダモジュール作成
    const materialPhongShaderModule = device.createShaderModule({
        code: materialPhongShaderCode,
    });

    const materialGgxShaderModule = device.createShaderModule({
        code: materialGgxShaderCode,
    });

    const shadowMapShaderModule = device.createShaderModule({
        code: shadowMapShaderCode,
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

    const shaderBallPipeline = device.createRenderPipeline({
        label: 'ShaderBall render pipeline',
        layout: device.createPipelineLayout({
            bindGroupLayouts: [
                shadowMapBindGroupLayout,
                uniformBufferBindGroupLayout,
            ],
        }),
        vertex: {
            module: materialGgxShaderModule,
            entryPoint: 'vs_main',
            buffers: shaderBallModel.getVertexBufferLayouts(),
        },
        fragment: {
            module: materialGgxShaderModule,
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
            module: materialPhongShaderModule,
            entryPoint: 'vs_main',
            buffers: quadModel.getVertexBufferLayouts(),
        },
        fragment: {
            module: materialPhongShaderModule,
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
            buffers: shaderBallModel.getVertexBufferLayouts(),
        },
        primitive,
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

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

    const shaderBallColNum = 10;
    const shaderBallRowNum = 10;
    const shaderBallModelUniformBuffer = device.createBuffer({
        size: (matrixSize + 4 * 4) * shaderBallColNum * shaderBallRowNum,
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

    for (let x = 0; x < shaderBallColNum; x++) {
        for (let z = 0; z < shaderBallRowNum; z++) {
            const modelMatrix = mat4.create();
            mat4.identity(modelMatrix);
            mat4.translate(modelMatrix, [(x - 4.5) * 0.4, -1.0, (z - 4.5) * 0.4], modelMatrix);
            mat4.scale(modelMatrix, [0.15, 0.15, 0.15], modelMatrix);

            let offset = (x * shaderBallRowNum + z) * (matrixSize + 4 * 4);
            device.queue.writeBuffer(shaderBallModelUniformBuffer, offset, modelMatrix.buffer);
            device.queue.writeBuffer(shaderBallModelUniformBuffer, offset + matrixSize, new Float32Array([x / (shaderBallColNum - 1.0), z / (shaderBallRowNum - 1.0), 0.0, 0.0]));
        }
    }

    const modelBindGroupForShaderBall = device.createBindGroup({
        layout: uniformBufferBindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: shaderBallModelUniformBuffer } },
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

    const texturePreview = new TextureDepthPreview(shadowMapTextureView, device, format);
    texturePreview.setViewPort(0, 0, 256, 256);

    // カメラの行列計算

    // Setup projection matrix
    const aspect = canvas.width / canvas.height;
    const fov = (20 * Math.PI) / 180;
    const near = 0.1;
    const far = 100.0;
    const cameraProjectionMatrix = mat4.perspective(fov, aspect, near, far);

    // Setup view matrix (camera at (0, 0, 5) looking at origin)
    const cameraViewMatrix = mat4.lookAt(
        [0, 3, 8],  // eye position
        [0, -1, 0],  // target position
        [0, 1, 0],  // up vector
    );
    const cameraViewProjMatrix = mat4.multiply(cameraProjectionMatrix, cameraViewMatrix);

    // Setup dat.GUI
    const settings = {
        lightAngle: { value: 45.0, label: 'Light Angle', min: 0.0, max: 360.0 },
        isPreviewShadowMap: { value: true, label: 'Preview Shadow Map' },
    };
    const guiManager = new GuiManager(settings);

    // Setup Stats
    const performanceVisualizer = new PerformanceVisualizer(canvas);

    let previousTime = Date.now() / 1000;
    let currentAngle = previousTime; // Start with current time to match previous behavior roughly, or 0

    function frame() {
        performanceVisualizer.begin();
        const now = Date.now() / 1000;
        const deltaTime = now - previousTime;
        previousTime = now;

        currentAngle += deltaTime;

        // ライトの行列計算
        const lightDir = vec3.set(Math.cos(guiManager.values.lightAngle * Math.PI / 180), 1, Math.sin(guiManager.values.lightAngle * Math.PI / 180));
        vec3.normalize(lightDir, lightDir);

        const lightProjectionMatrix = mat4.create();
        {
            const left = -3;
            const right = 3;
            const bottom = -3;
            const top = 3;
            const near = -10;
            const far = 10;
            mat4.ortho(left, right, bottom, top, near, far, lightProjectionMatrix);
        }

        const lightViewMatrix = mat4.create();
        {
            const center = vec3.create();
            vec3.set(0, 0, 0, center);
            const eye = vec3.create();
            const lightDirTmp = vec3.create();
            vec3.scale(lightDir, 5, lightDirTmp);
            vec3.subtract(lightDirTmp, center, eye);
            const up = vec3.create();
            vec3.set(0, 1, 0, up);
            mat4.lookAt(eye, center, up, lightViewMatrix);
        }
        const lightViewProjMatrix = mat4.multiply(lightProjectionMatrix, lightViewMatrix);

        // モデル行列の計算
        const modelMatrixQuad = mat4.create();
        // Reset and rotate model matrix
        mat4.identity(modelMatrixQuad);
        {
            const rot = quat.identity();
            quat.rotateX(rot, -Math.PI * 0.5, rot);
            mat4.translate(modelMatrixQuad, [0, -1, 0], modelMatrixQuad);
            mat4.multiply(modelMatrixQuad, mat4.fromQuat(rot), modelMatrixQuad);
            mat4.scale(modelMatrixQuad, [5.0, 5.0, 5.0], modelMatrixQuad);
        }

        // バッファを書き込む
        device.queue.writeBuffer(sceneUniformBuffer, 0, lightViewProjMatrix.buffer);
        device.queue.writeBuffer(sceneUniformBuffer, 64, cameraViewProjMatrix.buffer);
        device.queue.writeBuffer(sceneUniformBuffer, 128, lightDir.buffer);

        device.queue.writeBuffer(quadModelUniformBuffer, 0, modelMatrixQuad.buffer);

        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();


        // シャドウの描画
        {
            const renderPass = commandEncoder.beginRenderPass(shadowPassDescriptor);

            renderPass.setPipeline(shadowMapPipeline);
            renderPass.setVertexBuffer(0, shaderBallModel.getVertexBuffer());
            renderPass.setIndexBuffer(shaderBallModel.getIndexBuffer(), 'uint16');
            renderPass.setBindGroup(0, sceneBindGroupForShadowMap);
            renderPass.setBindGroup(1, modelBindGroupForShaderBall);
            renderPass.drawIndexed(shaderBallModel.getIndexCount(), shaderBallColNum * shaderBallRowNum);

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
            renderPass.setPipeline(shaderBallPipeline);
            renderPass.setVertexBuffer(0, shaderBallModel.getVertexBuffer());
            renderPass.setIndexBuffer(shaderBallModel.getIndexBuffer(), 'uint16');
            renderPass.setBindGroup(0, sceneBindGroupForRender);
            renderPass.setBindGroup(1, modelBindGroupForShaderBall);
            renderPass.drawIndexed(shaderBallModel.getIndexCount(), shaderBallColNum * shaderBallRowNum);

            // Quadの描画
            renderPass.setPipeline(quadPipeline);
            renderPass.setVertexBuffer(0, quadModel.getVertexBuffer());
            renderPass.setIndexBuffer(quadModel.getIndexBuffer(), 'uint16');
            renderPass.setBindGroup(0, sceneBindGroupForRender);
            renderPass.setBindGroup(1, modelBindGroupForQuad);
            renderPass.drawIndexed(quadModel.getIndexCount());

            renderPass.end();
        }

        // テクスチャのプレビュー
        if (guiManager.values.isPreviewShadowMap) {
            texturePreview.draw(commandEncoder, context);
        }

        device.queue.submit([commandEncoder.finish()]);
        performanceVisualizer.end();
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

init().catch(console.error);

export { };
