//============================================
//
// シェーダボール
//
//============================================
import { GltfLoader } from 'gltf-loader-ts';

export class ShaderBall {
    private vertexBuffer: GPUBuffer;
    private indexBuffer: GPUBuffer;
    private indexCount: number;
    private vertexBufferLayouts: Iterable<GPUVertexBufferLayout>;

    private constructor(vertexBuffer: GPUBuffer, indexBuffer: GPUBuffer, indexCount: number, vertexBufferLayouts: Iterable<GPUVertexBufferLayout>) {
        this.vertexBuffer = vertexBuffer;
        this.indexBuffer = indexBuffer;
        this.indexCount = indexCount;
        this.vertexBufferLayouts = vertexBufferLayouts;
    }

    static async create(device: GPUDevice) {
        // 頂点, インデックスデータの作成
        const modelData = await this.createModelData();

        // 頂点バッファの作成
        const vertexBuffer = device.createBuffer({
            size: modelData.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(vertexBuffer, 0, modelData.vertices);

        // インデックスバッファの作成
        const indexBuffer = device.createBuffer({
            size: modelData.indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(indexBuffer, 0, modelData.indices);

        // 頂点バッファのレイアウト
        const vertexSize = 6 * 4; // 4(float32) * 6(position + normal)
        const positionOffset = 0 * 4;
        const normalOffset = 3 * 4; // 4(float32) * 3(position)
        const vertexBufferLayouts: Iterable<GPUVertexBufferLayout> = [
            {
                arrayStride: vertexSize,
                attributes: [
                    { shaderLocation: 0, offset: positionOffset, format: 'float32x3' },
                    { shaderLocation: 1, offset: normalOffset, format: 'float32x3' },
                ],
            },
        ];

        const indexCount = modelData.indices.length;

        return new ShaderBall(vertexBuffer, indexBuffer, indexCount, vertexBufferLayouts);
    }

    getIndexCount(): number {
        return this.indexCount;
    }

    getVertexBufferLayouts(): Iterable<GPUVertexBufferLayout> {
        return this.vertexBufferLayouts;
    }

    getVertexBuffer(): GPUBuffer {
        return this.vertexBuffer;
    }

    getIndexBuffer(): GPUBuffer {
        return this.indexBuffer;
    }

    private static async createModelData() {
        // GLTFモデルの読み込み
        const loader = new GltfLoader();
        const uri = '/assets/model/ShaderBall.glb';
        const asset = await loader.load(uri);
        const gltf = asset.gltf;

        // 最初のメッシュのプリミティブを取得
        const mesh = gltf.meshes![0];
        const primitive = mesh.primitives[0];

        // 頂点データを取得
        const positionAccessorIndex = primitive.attributes.POSITION!;
        const normalAccessorIndex = primitive.attributes.NORMAL!;
        const indexAccessorIndex = primitive.indices!;

        const positionBufferData = await asset.accessorData(positionAccessorIndex)!;
        const normalBufferData = await asset.accessorData(normalAccessorIndex)!;
        const indexBufferData = await asset.accessorData(indexAccessorIndex)!;

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

        for (let i = 0; i < vertexCount; i++) {
            vertices[i * 6 + 0] = positionData[i * 3 + 0];
            vertices[i * 6 + 1] = positionData[i * 3 + 1];
            vertices[i * 6 + 2] = positionData[i * 3 + 2];
            vertices[i * 6 + 3] = normalData[i * 3 + 0];
            vertices[i * 6 + 4] = normalData[i * 3 + 1];
            vertices[i * 6 + 5] = normalData[i * 3 + 2];
        }

        return {
            vertices: vertices,
            indices: indexData,
        };
    }
}