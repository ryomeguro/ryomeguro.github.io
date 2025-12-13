import shaderCode from './shader.wgsl?raw';
import copyShaderCode from './copy.wgsl?raw';
import { mat4, quat } from 'gl-matrix';
import * as dat from 'dat.gui';

const init = async () => {
    if (!navigator.gpu) throw new Error('WebGPU not supported');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No adapter');
    const device = await adapter.requestDevice();
    const canvas = document.querySelector('#webgpu-canvas') as HTMLCanvasElement;
    const context = canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'premultiplied' });

    const viewNum = 4;

    // Cube data
    const cubeVertices = new Float32Array([
        // position (3), color (3)
        // Front face
        -1, -1, 1, 1, 0, 0,
        1, -1, 1, 0, 1, 0,
        1, 1, 1, 0, 0, 1,
        -1, 1, 1, 1, 1, 0,
        // Back face
        -1, -1, -1, 1, 0, 1,
        -1, 1, -1, 0, 1, 1,
        1, 1, -1, 1, 1, 1,
        1, -1, -1, 0, 0, 0,
        // Top face
        -1, 1, -1, 1, 0, 0,
        -1, 1, 1, 0, 1, 0,
        1, 1, 1, 0, 0, 1,
        1, 1, -1, 1, 1, 0,
        // Bottom face
        -1, -1, -1, 1, 0, 1,
        1, -1, -1, 0, 1, 1,
        1, -1, 1, 1, 1, 1,
        -1, -1, 1, 0, 0, 0,
        // Right face
        1, -1, -1, 1, 0, 0,
        1, 1, -1, 0, 1, 0,
        1, 1, 1, 0, 0, 1,
        1, -1, 1, 1, 1, 0,
        // Left face
        -1, -1, -1, 1, 0, 1,
        -1, -1, 1, 0, 1, 1,
        -1, 1, 1, 1, 1, 1,
        -1, 1, -1, 0, 0, 0,
    ]);

    const cubeIndices = new Uint16Array([
        0, 1, 2, 0, 2, 3, // Front
        4, 5, 6, 4, 6, 7, // Back
        8, 9, 10, 8, 10, 11, // Top
        12, 13, 14, 12, 14, 15, // Bottom
        16, 17, 18, 16, 18, 19, // Right
        20, 21, 22, 20, 22, 23, // Left
    ]);

    const quadVertices = new Float32Array([
        // position (3), uv (2)
        -1, -1, 0, 0, 0,
        1, -1, 0, 1, 0,
        1, 1, 0, 1, 1,
        -1, 1, 0, 0, 1,
    ]);

    const quadIndices = new Uint16Array([
        0, 1, 2, 0, 2, 3,
    ]);

    const cubeVertexBuffer = device.createBuffer({
        size: cubeVertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(cubeVertexBuffer, 0, cubeVertices);

    const cubeIndexBuffer = device.createBuffer({
        size: cubeIndices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(cubeIndexBuffer, 0, cubeIndices);

    const quadVertexBuffer = device.createBuffer({
        size: quadVertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(quadVertexBuffer, 0, quadVertices);

    const quadIndexBuffer = device.createBuffer({
        size: quadIndices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(quadIndexBuffer, 0, quadIndices);

    /*
     * Cubeの描画に必要なものを生成する
     */
    const cubeShaderModule = device.createShaderModule({
        code: shaderCode,
    });

    const cubePipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: cubeShaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: 24,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: 'float32x3' },
                    { shaderLocation: 1, offset: 12, format: 'float32x3' },
                ],
            }],
        },
        fragment: {
            module: cubeShaderModule,
            entryPoint: 'fs_main',
            targets: [{ format }],
        },
        primitive: {
            topology: 'triangle-list',
            cullMode: 'back',
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });

    const matrixSize = 4 * 16; // 4x4 matrix
    const offset = 256; // uniformBindGroup offset must be 256-byte aligned
    const cubeUniformBufferSize = offset * (viewNum * 2 - 1) + matrixSize;

    // 今回はモデルが2つあるのでこのuniformBufferにUBOを2つ確保する
    const cubeUniformBuffer = device.createBuffer({
        size: cubeUniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    /*
     * テクスチャのコピーに必要なものを生成する
     */
    const copyShaderModule = device.createShaderModule({
        code: copyShaderCode,
    });

    const copyPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: copyShaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: 20,
                attributes: [
                    { shaderLocation: 0, offset: 0, format: 'float32x3' },
                    { shaderLocation: 1, offset: 12, format: 'float32x2' },
                ],
            }],
        },
        fragment: {
            module: copyShaderModule,
            entryPoint: 'fs_main',
            targets: [{ format }],
        },
        primitive: {
            topology: 'triangle-list',
            cullMode: 'back',
        },
    });

    // サンプラの作成
    const copySampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        mipmapFilter: 'linear',
    });

    /*
     * dat.GUIの設定
     */
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

    /*
     * フレームの更新
     */

    let previousTime = Date.now() / 1000;
    let currentAngle = previousTime; // Start with current time to match previous behavior roughly, or 0

    function frame() {

        const commandEncoder = device.createCommandEncoder();

        /*
         * 時間の更新（ループの前で1回だけ）
         */
        const now = Date.now() / 1000;
        const deltaTime = now - previousTime;
        previousTime = now;
        currentAngle += deltaTime * settings.speed;

        /*
         * キューブのモデル行列の作成
         */
        const modelMatrix0 = mat4.create();
        const modelMatrix1 = mat4.create();
        mat4.identity(modelMatrix0);
        {
            mat4.fromScaling(modelMatrix0, [0.8, 0.8, 0.8]);
        }

        mat4.identity(modelMatrix1);
        {
            const rot = quat.create();
            quat.rotateX(rot, rot, currentAngle);
            quat.rotateY(rot, rot, currentAngle);
            mat4.fromRotationTranslationScale(modelMatrix1, rot, [-Math.cos(currentAngle) * 1.6, 0, -Math.sin(currentAngle) * 1.6], [0.3, 0.3, 0.3]);
        }

        // 描画範囲
        let viewPorts = [
            { x: 0, y: 0, width: canvas.width / 2, height: canvas.height / 2 },
            { x: canvas.width / 2, y: 0, width: canvas.width / 2, height: canvas.height / 2 },
            { x: 0, y: canvas.height / 2, width: canvas.width / 2, height: canvas.height / 2 },
            { x: canvas.width / 2, y: canvas.height / 2, width: canvas.width / 2, height: canvas.height / 2 },
        ];

        // 背景色
        let backgroundColor = [
            { r: 0.1, g: 0.0, b: 0.0, a: 1.0 },
            { r: 0.0, g: 0.1, b: 0.0, a: 1.0 },
            { r: 0.0, g: 0.0, b: 0.1, a: 1.0 },
            { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
        ];

        // カメラ位置
        let cameraPositions = [
            [0, 0, 5],
            [0, 4, 5],
            [1, 2, 5],
            [-1, 2, 5],
        ];

        let renderBufferSize = [
            [canvas.width / 2, canvas.height / 2],
            [canvas.width / 3, canvas.height / 3],
            [canvas.width / 4, canvas.height / 4],
            [canvas.width / 5, canvas.height / 5],
        ]

        for (let i = 0; i < viewNum; i++) {
            /*
             * レンダーターゲットとなるテクスチャの作成
             * テクスチャは使用されなくなるとガベージコレクションされるため、明示的なdestroy()は不要
             */
            const colorTexture = device.createTexture({
                size: renderBufferSize[i],
                format,
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            });
            const depthTexture = device.createTexture({
                size: renderBufferSize[i],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT,
            });

            /*
             * キューブの描画
             */
            {
                const projectionMatrix = mat4.create();
                const viewMatrix = mat4.create();
                const mvpMatrix0 = mat4.create();
                const mvpMatrix1 = mat4.create();

                // Setup projection matrix
                const aspect = canvas.width / canvas.height;
                const fov = (45 * Math.PI) / 180;
                const near = 0.1;
                const far = 100.0;
                mat4.perspective(projectionMatrix, fov, aspect, near, far);

                // Setup view matrix (camera at (0, 0, 5) looking at origin)
                mat4.lookAt(
                    viewMatrix,
                    cameraPositions[i],  // eye position
                    [0, 0, 0],  // target position
                    [0, 1, 0]   // up vector
                );

                // Calculate MVP = Projection * View * Model
                const temp = mat4.create();
                mat4.multiply(temp, viewMatrix, modelMatrix0);
                mat4.multiply(mvpMatrix0, projectionMatrix, temp);

                mat4.multiply(temp, viewMatrix, modelMatrix1);
                mat4.multiply(mvpMatrix1, projectionMatrix, temp);

                var mvpMatrix0Array = new Float32Array(mvpMatrix0);
                var mvpMatrix1Array = new Float32Array(mvpMatrix1);
                // バッファを書き込む
                device.queue.writeBuffer(cubeUniformBuffer, i * offset * 2, mvpMatrix0Array.buffer, mvpMatrix0Array.byteOffset, mvpMatrix0Array.byteLength);
                device.queue.writeBuffer(cubeUniformBuffer, i * offset * 2 + offset, mvpMatrix1Array.buffer, mvpMatrix1Array.byteOffset, mvpMatrix1Array.byteLength);    // オフセットを指定して書き込む

                const cubeBindGroup0 = device.createBindGroup({
                    layout: cubePipeline.getBindGroupLayout(0),
                    entries: [{ binding: 0, resource: { buffer: cubeUniformBuffer, size: matrixSize, offset: i * offset * 2 } }],
                });

                const cubeBindGroup1 = device.createBindGroup({
                    layout: cubePipeline.getBindGroupLayout(0),
                    entries: [{ binding: 0, resource: { buffer: cubeUniformBuffer, size: matrixSize, offset: i * offset * 2 + offset } }],
                });

                const renderPass = commandEncoder.beginRenderPass({
                    colorAttachments: [{
                        view: colorTexture.createView(),
                        clearValue: backgroundColor[i],
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

                renderPass.setPipeline(cubePipeline);
                renderPass.setVertexBuffer(0, cubeVertexBuffer);
                renderPass.setIndexBuffer(cubeIndexBuffer, 'uint16');

                // 2つのモデルを描画する
                renderPass.setBindGroup(0, cubeBindGroup0);
                renderPass.drawIndexed(cubeIndices.length);

                renderPass.setBindGroup(0, cubeBindGroup1);
                renderPass.drawIndexed(cubeIndices.length);

                renderPass.end();
            }

            /*
            * テクスチャをフレームバッファにコピー
            */
            {
                const copyBindGroup = device.createBindGroup({
                    layout: copyPipeline.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: colorTexture.createView() },
                        { binding: 1, resource: copySampler },
                    ],
                });

                const textureView = context.getCurrentTexture().createView();

                const renderPass = commandEncoder.beginRenderPass({
                    colorAttachments: [{
                        view: textureView,
                        loadOp: 'load',
                        storeOp: 'store',
                    }],
                });
                renderPass.setViewport(viewPorts[i].x, viewPorts[i].y, viewPorts[i].width, viewPorts[i].height, 0, 1);
                renderPass.setPipeline(copyPipeline);
                renderPass.setVertexBuffer(0, quadVertexBuffer);
                renderPass.setIndexBuffer(quadIndexBuffer, 'uint16');

                renderPass.setBindGroup(0, copyBindGroup);
                renderPass.drawIndexed(quadIndices.length);

                renderPass.end();
            }
        }

        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

init().catch(console.error);

export { };
