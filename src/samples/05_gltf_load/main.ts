import shaderCode from './shader.wgsl?raw';
import { mat4 } from 'gl-matrix';
import { GltfLoader } from 'gltf-loader-ts';

const init = async () => {
    // WebGPUの初期化
    if (!navigator.gpu) throw new Error('WebGPU not supported');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No adapter');
    const device = await adapter.requestDevice();
    const canvas = document.querySelector('#webgpu-canvas') as HTMLCanvasElement;
    const context = canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'premultiplied' });

    // GLTFモデルの読み込み
    const loader = new GltfLoader();
    const uri = '/assets/model/monkey.glb';
    const asset = await loader.load(uri);
    const gltf = asset.gltf;

    // 最初のメッシュのプリミティブを取得
    const mesh = gltf.meshes![0];
    const primitive = mesh.primitives[0];

    // アトリビュートのインデックスを取得する
    const positionAccessorIndex = primitive.attributes.POSITION!;
    const normalAccessorIndex = primitive.attributes.NORMAL!;
    const indexAccessorIndex = primitive.indices!;

    // gltf-loader-tsのaccessorDataメソッドを使用してデータを取得
    // ここではまだバイナリデータなのでuint8arrayになっている
    const positionBufferData = await asset.accessorData(positionAccessorIndex);
    const normalBufferData = await asset.accessorData(normalAccessorIndex);
    const indexBufferData = await asset.accessorData(indexAccessorIndex);

    // Float32Arrayに変換 - バッファをfloat32として正しく解釈する
    const positionData = new Float32Array(
        positionBufferData.buffer,      // バッファ
        positionBufferData.byteOffset,  // データがバッファ内のどこから始まるか
        positionBufferData.length / 4   // 要素数 (4 = Float32のサイズ 元がuint8arrayなので4で割る)
    );
    const normalData = new Float32Array(
        normalBufferData.buffer,
        normalBufferData.byteOffset,
        normalBufferData.length / 4
    );

    // アクセサーの情報を取得
    const indexAccessor = gltf.accessors![indexAccessorIndex];

    // インデックスデータの型を確認して適切に変換
    // 5121 = UNSIGNED_BYTE, 5123 = UNSIGNED_SHORT, 5125 = UNSIGNED_INT
    // https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#_accessor_componenttype
    let indexData: Uint16Array | Uint32Array;
    if (indexAccessor.componentType === 5121) {
        // UNSIGNED_BYTE - そのままUint16Arrayに変換
        indexData = new Uint16Array(indexBufferData);
    } else if (indexAccessor.componentType === 5123) {
        // UNSIGNED_SHORT - slice()を使って新しいArrayBufferを作成
        const tempView = new Uint16Array(indexBufferData.buffer, indexBufferData.byteOffset, indexBufferData.length / 2);
        indexData = tempView.slice();
    } else {
        // UNSIGNED_INT - slice()を使って新しいArrayBufferを作成
        const tempView = new Uint32Array(indexBufferData.buffer, indexBufferData.byteOffset, indexBufferData.length / 4);
        indexData = tempView.slice();
    }

    // 頂点データをインターリーブ形式に変換 (position + normal)
    const positionAccessor = gltf.accessors![positionAccessorIndex];
    const vertexCount = positionAccessor.count;
    const vertices = new Float32Array(vertexCount * 6); // position(3) + normal(3)

    // バウンディングボックスを計算
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < vertexCount; i++) {
        const x = positionData[i * 3 + 0];
        const y = positionData[i * 3 + 1];
        const z = positionData[i * 3 + 2];

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);

        vertices[i * 6 + 0] = x;
        vertices[i * 6 + 1] = y;
        vertices[i * 6 + 2] = z;
        vertices[i * 6 + 3] = normalData[i * 3 + 0];
        vertices[i * 6 + 4] = normalData[i * 3 + 1];
        vertices[i * 6 + 5] = normalData[i * 3 + 2];
    }

    // モデルのセンターとサイズを計算
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    const maxSize = Math.max(sizeX, sizeY, sizeZ);

    // GPU バッファの作成
    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertices);

    const indexBuffer = device.createBuffer({
        size: indexData.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    // @ts-expect-error - TypeScript型システムの制限によるエラー（実行時には問題なし）
    device.queue.writeBuffer(indexBuffer, 0, indexData);

    const shaderModule = device.createShaderModule({
        code: shaderCode,
    });

    // レンダリングパイプラインの作成
    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: 24,    // 1頂点あたりのバイト数 24 = 4(float32) * 6(position + normal)
                attributes: [
                    { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
                    { shaderLocation: 1, offset: 12, format: 'float32x3' }, // normal
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

    // デプステクスチャを作成
    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Uniform バッファ (MVP + Normal Matrix)
    const uniformBuffer = device.createBuffer({
        size: 128, // mat4x4 * 2
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // バインドグループを作成
    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
        ],
    });

    // モデルビュー射影行列を作成する
    const projectionMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const modelMatrix = mat4.create();
    const mvpMatrix = mat4.create();
    const normalMatrix = mat4.create();

    // Setup projection matrix
    const aspect = canvas.width / canvas.height;
    const fov = (45 * Math.PI) / 180;
    const near = 0.1;
    const far = 1000.0;
    mat4.perspective(projectionMatrix, fov, aspect, near, far);

    // カメラ距離を計算（モデルが画面に収まるように）
    const distance = maxSize / Math.tan(fov / 2) * 1.5; // 1.5倍でマージンを確保

    // Setup view matrix (camera looking at model center)
    mat4.lookAt(
        viewMatrix,
        [centerX, centerY, centerZ + distance],  // eye position (モデルの前方)
        [centerX, centerY, centerZ],  // target position (モデルの中心)
        [0, 1, 0]   // up vector
    );

    function frame() {
        const now = Date.now() / 1000;

        // Reset and rotate model matrix (モデルの中心を原点として回転)
        mat4.identity(modelMatrix);
        mat4.translate(modelMatrix, modelMatrix, [centerX, centerY, centerZ]);
        mat4.rotateY(modelMatrix, modelMatrix, now * 0.5);
        mat4.translate(modelMatrix, modelMatrix, [-centerX, -centerY, -centerZ]);

        // Calculate MVP = Projection * View * Model
        const temp = mat4.create();
        mat4.multiply(temp, viewMatrix, modelMatrix);
        mat4.multiply(mvpMatrix, projectionMatrix, temp);

        // Calculate normal matrix (inverse transpose of model matrix)
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        // Uniform データを準備
        const uniformData = new Float32Array(32); // 16 + 16
        uniformData.set(mvpMatrix, 0);
        uniformData.set(normalMatrix, 16);

        // Uniform をGPUに送る
        device.queue.writeBuffer(uniformBuffer, 0, uniformData);

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
        renderPass.drawIndexed(indexData.length);
        renderPass.end();

        // 描画実行
        device.queue.submit([commandEncoder.finish()]);

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
};

init().catch(console.error);

export { };
