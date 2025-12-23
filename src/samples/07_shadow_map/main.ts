import shaderCode from './shader.wgsl?raw';
import { mat4, quat } from 'gl-matrix';
import * as dat from 'dat.gui';

import * as cube from './cube';
import * as torus from './torus';
import * as quad from './quad';

const init = async () => {
    if (!navigator.gpu) throw new Error('WebGPU not supported');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No adapter');
    const device = await adapter.requestDevice();
    const canvas = document.querySelector('#webgpu-canvas') as HTMLCanvasElement;
    const context = canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'premultiplied' });

    const cubeVertexBuffer = device.createBuffer({
        size: cube.vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(cubeVertexBuffer, 0, cube.vertices);

    const cubeIndexBuffer = device.createBuffer({
        size: cube.indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(cubeIndexBuffer, 0, cube.indices);

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

    const shaderModule = device.createShaderModule({
        code: shaderCode,
    });

    const cubePipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: cube.vertexSize,
                attributes: [
                    { shaderLocation: 0, offset: cube.positionOffset, format: 'float32x3' },
                    { shaderLocation: 1, offset: cube.normalOffset, format: 'float32x3' },
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

    const torusPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: torus.vertexSize,
                attributes: [
                    { shaderLocation: 0, offset: torus.positionOffset, format: 'float32x3' },
                    { shaderLocation: 1, offset: torus.normalOffset, format: 'float32x3' },
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

    const quadPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: shaderModule,
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
    const matrixNum = 2;
    const offset = 256; // uniformBindGroup offset must be 256-byte aligned
    const uniformBufferSize = offset * 3 + matrixSize * matrixNum;

    const commonUBOSize = 4 * 4;

    // 今回はモデルが2つあるのでこのuniformBufferにUBOを2つ確保する
    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // sizeを省略した場合、バッファ全体を参照するため、今回はsizeを指定する必要がある
    const cubeBindGroup = device.createBindGroup({
        layout: cubePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer, size: commonUBOSize, offset: 0 } },
            { binding: 1, resource: { buffer: uniformBuffer, size: matrixSize * matrixNum, offset: offset } }
        ],
    });

    const torusBindGroup = device.createBindGroup({
        layout: torusPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer, size: commonUBOSize, offset: 0 } },
            { binding: 1, resource: { buffer: uniformBuffer, size: matrixSize * matrixNum, offset: offset * 2 } }
        ],
    });

    const quadBindGroup = device.createBindGroup({
        layout: quadPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer, size: commonUBOSize, offset: 0 } },
            { binding: 1, resource: { buffer: uniformBuffer, size: matrixSize * matrixNum, offset: offset * 3 } }
        ],
    });

    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const modelMatrix0 = mat4.create();
    const modelMatrix1 = mat4.create();
    const modelMatrix2 = mat4.create();
    const mvpMatrix0 = mat4.create();
    const mvpMatrix1 = mat4.create();
    const mvpMatrix2 = mat4.create();

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

        mat4.identity(modelMatrix2);
        {
            const rot = quat.create();
            mat4.fromRotationTranslationScale(modelMatrix2, rot, [0, -1, 0], [5.0, 5.0, 5.0]);
        }

        // Calculate MVP = Projection * View * Model
        const temp = mat4.create();
        mat4.multiply(temp, viewMatrix, modelMatrix0);
        mat4.multiply(mvpMatrix0, projectionMatrix, temp);

        mat4.multiply(temp, viewMatrix, modelMatrix1);
        mat4.multiply(mvpMatrix1, projectionMatrix, temp);

        mat4.multiply(temp, viewMatrix, modelMatrix2);
        mat4.multiply(mvpMatrix2, projectionMatrix, temp);

        var mvpMatrix0Array = new Float32Array(mvpMatrix0);
        var mvpMatrix1Array = new Float32Array(mvpMatrix1);
        var mvpMatrix2Array = new Float32Array(mvpMatrix2);
        var modelMatrix0Array = new Float32Array(modelMatrix0);
        var modelMatrix1Array = new Float32Array(modelMatrix1);
        var modelMatrix2Array = new Float32Array(modelMatrix2);

        // バッファを書き込む
        // byteOffsetとはTypedArrayがbufferの何バイト目から参照しているかを表している(Float32Arrayを作る時に指定できる。今回は0バイト目から参照している。)
        // byteLengthとはTypedArrayがbufferの何バイト分参照しているかを表している
        device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([1.0, 1.0, 1.0, 1.0]), 0, 4);

        device.queue.writeBuffer(uniformBuffer, offset, mvpMatrix0Array.buffer, mvpMatrix0Array.byteOffset, mvpMatrix0Array.byteLength);
        device.queue.writeBuffer(uniformBuffer, offset + matrixSize, modelMatrix0Array.buffer, modelMatrix0Array.byteOffset, modelMatrix0Array.byteLength);
        device.queue.writeBuffer(uniformBuffer, offset * 2, mvpMatrix1Array.buffer, mvpMatrix1Array.byteOffset, mvpMatrix1Array.byteLength);    // オフセットを指定して書き込む
        device.queue.writeBuffer(uniformBuffer, offset * 2 + matrixSize, modelMatrix1Array.buffer, modelMatrix1Array.byteOffset, modelMatrix1Array.byteLength);
        device.queue.writeBuffer(uniformBuffer, offset * 3, mvpMatrix2Array.buffer, mvpMatrix2Array.byteOffset, mvpMatrix2Array.byteLength);
        device.queue.writeBuffer(uniformBuffer, offset * 3 + matrixSize, modelMatrix2Array.buffer, modelMatrix2Array.byteOffset, modelMatrix2Array.byteLength);

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

        // Cubeの描画
        renderPass.setPipeline(cubePipeline);
        renderPass.setVertexBuffer(0, cubeVertexBuffer);
        renderPass.setIndexBuffer(cubeIndexBuffer, 'uint16');
        renderPass.setBindGroup(0, cubeBindGroup);
        renderPass.drawIndexed(cube.indices.length);

        // Torusの描画
        renderPass.setPipeline(torusPipeline);
        renderPass.setVertexBuffer(0, torusVertexBuffer);
        renderPass.setIndexBuffer(torusIndexBuffer, 'uint16');
        renderPass.setBindGroup(0, torusBindGroup);
        renderPass.drawIndexed(torus.indices.length);

        // Quadの描画
        renderPass.setPipeline(quadPipeline);
        renderPass.setVertexBuffer(0, quadVertexBuffer);
        renderPass.setIndexBuffer(quadIndexBuffer, 'uint16');
        renderPass.setBindGroup(0, quadBindGroup);
        renderPass.drawIndexed(quad.indices.length);

        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

init().catch(console.error);

export { };
