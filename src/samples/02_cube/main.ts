import shaderCode from './shader.wgsl?raw';
import { mat4 } from 'gl-matrix';

const init = async () => {
    /*
     * WebGPUの初期化
     */
    if (!navigator.gpu) throw new Error('WebGPU not supported');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No adapter');
    const device = await adapter.requestDevice();
    const canvas = document.querySelector('#webgpu-canvas') as HTMLCanvasElement;
    const context = canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'premultiplied' });

    /*
     * Cubeのデータ定義
     */
    const vertices = new Float32Array([
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

    const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3, // Front
        4, 5, 6, 4, 6, 7, // Back
        8, 9, 10, 8, 10, 11, // Top
        12, 13, 14, 12, 14, 15, // Bottom
        16, 17, 18, 16, 18, 19, // Right
        20, 21, 22, 20, 22, 23, // Left
    ]);

    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertices);

    const indexBuffer = device.createBuffer({
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indexBuffer, 0, indices);

    // matrixを渡すUBOを入れるバッファ
    const uniformBuffer = device.createBuffer({
        size: 64, // 4x4 matrix
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    /*
     * シェーダモジュールの作成
     */
    const shaderModule = device.createShaderModule({
        code: shaderCode,
    });

    /*
     * レンダリングパイプラインの作成
     */
    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: 24,    // 1頂点あたりのバイト数 24 = 4(float32) * 6(position + color)
                attributes: [
                    { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
                    { shaderLocation: 1, offset: 12, format: 'float32x3' }, // color offset = 4(float32) * 3(position)
                ],
            }],
        },
        fragment: {
            module: shaderModule,
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
            format: 'depth24plus',  // ハードウェアに応じて24ビット以上になるデプスフォーマット
        },
    });

    // デプステクスチャを作成
    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // バインドグループを作成
    // シェーダーのスロットとリソースをバインドする
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }], // シェーダーの0番目のスロットにuniformBufferをバインド
    });

    // モデルビュー射影行列を作成する
    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const modelMatrix = mat4.create();
    const mvpMatrix = mat4.create();

    // Setup projection matrix
    const aspect = canvas.width / canvas.height;
    const fov = (45 * Math.PI) / 180;
    const near = 0.1;
    const far = 100.0;
    mat4.perspective(projectionMatrix, fov, aspect, near, far);

    // Setup view matrix (camera at (0, 0, 5) looking at origin)
    mat4.lookAt(
        viewMatrix,
        [0, 0, 5],  // eye position
        [0, 0, 0],  // target position
        [0, 1, 0]   // up vector
    );

    function frame() {
        const now = Date.now() / 1000;

        // Reset and rotate model matrix
        mat4.identity(modelMatrix);
        mat4.rotateX(modelMatrix, modelMatrix, now);
        mat4.rotateY(modelMatrix, modelMatrix, now);

        // Calculate MVP = Projection * View * Model
        const temp = mat4.create();
        mat4.multiply(temp, viewMatrix, modelMatrix);
        mat4.multiply(mvpMatrix, projectionMatrix, temp);

        // MVP行列をGPUに送る
        device.queue.writeBuffer(uniformBuffer, 0, new Float32Array(mvpMatrix));

        // 描画準備
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();

        const renderPass = commandEncoder.beginRenderPass({
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

        renderPass.setPipeline(pipeline);
        renderPass.setBindGroup(0, bindGroup);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setIndexBuffer(indexBuffer, 'uint16');
        renderPass.drawIndexed(36);
        renderPass.end();

        // 描画実行
        device.queue.submit([commandEncoder.finish()]);

        // requestAnimationFrameとはブラウザが提供するWeb APIの一つ
        // 次の描画タイミングに合わせて指定した関数を実行する
        // 再帰関数にすることで無限ループで毎フレーム描画を繰り返す
        // requestAnimationFrameは関数を非同期的にスケジュールするため、スタックオーバーフローは心配ない
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

init().catch(console.error);

export { };
