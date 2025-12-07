import shaderCode from './shader.wgsl?raw';
import { mat4, quat } from 'gl-matrix';
import * as dat from 'dat.gui';

const init = async () => {
    if (!navigator.gpu) throw new Error('WebGPU not supported');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No adapter');
    const device = await adapter.requestDevice();
    const canvas = document.querySelector('#webgpu-canvas') as HTMLCanvasElement;
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'premultiplied' });

    // Cube data
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

    const shaderModule = device.createShaderModule({
        code: shaderCode,
    });

    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: shaderModule,
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
            format: 'depth24plus',
        },
    });

    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const matrixSize = 4 * 16; // 4x4 matrix
    const offset = 256; // uniformBindGroup offset must be 256-byte aligned
    const uniformBufferSize = offset + matrixSize;

    // 今回はモデルが2つあるのでこのuniformBufferにUBOを2つ確保する
    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // sizeを省略した場合、バッファ全体を参照するため、今回はsizeを指定する必要がある
    const bindGroup0 = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer, size: matrixSize, offset: 0 } }],
    });

    const bindGroup1 = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer, size: matrixSize, offset: offset } }],
    });

    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const modelMatrix0 = mat4.create();
    const modelMatrix1 = mat4.create();
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
        [0, 0, 5],  // eye position
        [0, 0, 0],  // target position
        [0, 1, 0]   // up vector
    );

    // Setup dat.GUI
    const settings = {
        speed: 1.0,
    };
    const gui = new dat.GUI();
    gui.add(settings, 'speed', 0.0, 5.0).name('Rotation Speed');

    let previousTime = Date.now() / 1000;
    let currentAngle = previousTime; // Start with current time to match previous behavior roughly, or 0

    function frame() {
        const now = Date.now() / 1000;
        const deltaTime = now - previousTime;
        previousTime = now;

        currentAngle += deltaTime * settings.speed;

        // Reset and rotate model matrix
        mat4.identity(modelMatrix0);
        {
            const rot = quat.create();
            quat.rotateX(rot, rot, currentAngle);
            quat.rotateY(rot, rot, currentAngle);
            mat4.fromRotationTranslationScale(modelMatrix0, rot, [Math.cos(currentAngle), 0, Math.sin(currentAngle)], [0.5, 0.5, 0.5]);
        }

        mat4.identity(modelMatrix1);
        {
            const rot = quat.create();
            quat.rotateX(rot, rot, currentAngle);
            quat.rotateY(rot, rot, currentAngle);
            mat4.fromRotationTranslationScale(modelMatrix1, rot, [-Math.cos(currentAngle), 0, -Math.sin(currentAngle)], [0.5, 0.5, 0.5]);
        }

        // Calculate MVP = Projection * View * Model
        const temp = mat4.create();
        mat4.multiply(temp, viewMatrix, modelMatrix0);
        mat4.multiply(mvpMatrix0, projectionMatrix, temp);

        mat4.multiply(temp, viewMatrix, modelMatrix1);
        mat4.multiply(mvpMatrix1, projectionMatrix, temp);

        var mvpMatrix0Array = new Float32Array(mvpMatrix0);
        var mvpMatrix1Array = new Float32Array(mvpMatrix1);
        // バッファを書き込む
        // byteOffsetとはTypedArrayがbufferの何バイト目から参照しているかを表している(Float32Arrayを作る時に指定できる。今回は0バイト目から参照している。)
        // byteLengthとはTypedArrayがbufferの何バイト分参照しているかを表している
        device.queue.writeBuffer(uniformBuffer, 0, mvpMatrix0Array.buffer, mvpMatrix0Array.byteOffset, mvpMatrix0Array.byteLength);
        device.queue.writeBuffer(uniformBuffer, offset, mvpMatrix1Array.buffer, mvpMatrix1Array.byteOffset, mvpMatrix1Array.byteLength);    // オフセットを指定して書き込む

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
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setIndexBuffer(indexBuffer, 'uint16');

        // 2つのモデルを描画する
        renderPass.setBindGroup(0, bindGroup0);
        renderPass.drawIndexed(36);

        renderPass.setBindGroup(0, bindGroup1);
        renderPass.drawIndexed(36);

        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

init().catch(console.error);

export { };
