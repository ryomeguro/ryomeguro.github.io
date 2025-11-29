

// Since I didn't install gl-matrix, I should probably install it or write a simple one.
// I'll write a simple one to avoid extra dependencies if I haven't installed it yet.
// Wait, I didn't install gl-matrix. I should probably install it to make this easier and more correct.
// But I can't interactively ask now. I'll use a simple implementation here.

const createCamera = (aspect: number) => {
    const projection = new Float32Array(16);
    const view = new Float32Array(16);
    const mvp = new Float32Array(16);

    // Simple perspective matrix
    const fov = (45 * Math.PI) / 180;
    const near = 0.1;
    const far = 100.0;
    const f = 1.0 / Math.tan(fov / 2);

    projection[0] = f / aspect;
    projection[5] = f;
    projection[10] = (far + near) / (near - far);
    projection[11] = -1;
    projection[14] = (2 * far * near) / (near - far);
    projection[15] = 0;

    // View matrix (lookAt) - simplified for fixed camera
    // Eye (0,0,4), Center (0,0,0), Up (0,1,0)
    view[0] = 1; view[5] = 1; view[10] = 1; view[15] = 1; // Identity-ish
    view[12] = 0; view[13] = 0; view[14] = -4; // Translate back 4 units
    // Actually, identity is enough if we just move vertices.
    // Let's do a proper lookAt if possible, but for a simple cube, translation is enough.

    return { projection, view, mvp };
};

// Simple matrix multiply
function multiply(out: Float32Array, a: Float32Array, b: Float32Array) {
    const ae = a;
    const be = b;
    const te = out;

    const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
    const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
    const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
    const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];

    const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
    const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
    const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
    const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];

    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
}

function rotateY(out: Float32Array, a: Float32Array, rad: number) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];

    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;

    // Copy remaining
    out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
    out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
}

function rotateX(out: Float32Array, a: Float32Array, rad: number) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];

    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;

    // Copy remaining
    out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
    out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
}

const init = async () => {
    if (!navigator.gpu) throw new Error('WebGPU not supported');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No adapter');
    const device = await adapter.requestDevice();
    const canvas = document.querySelector('#webgpu-canvas') as HTMLCanvasElement;
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

    const uniformBuffer = device.createBuffer({
        size: 64, // 4x4 matrix
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const shaderModule = device.createShaderModule({
        code: `
      struct Uniforms {
        mvp : mat4x4f,
      }
      @binding(0) @group(0) var<uniform> uniforms : Uniforms;

      struct VertexOutput {
        @builtin(position) position : vec4f,
        @location(0) color : vec3f,
      }

      @vertex
      fn vs_main(@location(0) pos : vec3f, @location(1) color : vec3f) -> VertexOutput {
        var output : VertexOutput;
        output.position = uniforms.mvp * vec4f(pos, 1.0);
        output.color = color;
        return output;
      }

      @fragment
      fn fs_main(@location(0) color : vec3f) -> @location(0) vec4f {
        return vec4f(color, 1.0);
      }
    `,
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

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    const proj = new Float32Array(16);
    const view = new Float32Array(16);
    const model = new Float32Array(16);
    const mvp = new Float32Array(16);

    // Init matrices
    const aspect = canvas.width / canvas.height;
    const fov = (45 * Math.PI) / 180;
    const f = 1.0 / Math.tan(fov / 2);
    const near = 0.1;
    const far = 100.0;

    // Projection
    proj.fill(0);
    proj[0] = f / aspect;
    proj[5] = f;
    proj[10] = (far + near) / (near - far);
    proj[11] = -1;
    proj[14] = (2 * far * near) / (near - far);

    // View (translate back 5)
    view.fill(0);
    view[0] = 1; view[5] = 1; view[10] = 1; view[15] = 1;
    view[14] = -5;

    function frame() {
        const now = Date.now() / 1000;

        // Model rotation
        model.fill(0);
        model[0] = 1; model[5] = 1; model[10] = 1; model[15] = 1;
        rotateX(model, model, now);
        rotateY(model, model, now);

        // MVP = Proj * View * Model
        const temp = new Float32Array(16);
        multiply(temp, view, model);
        multiply(mvp, proj, temp);

        device.queue.writeBuffer(uniformBuffer, 0, mvp);

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

        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

init().catch(console.error);

export { };
