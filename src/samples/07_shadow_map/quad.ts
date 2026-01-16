//============================================
//
// 板ポリモデル
//
//============================================

export class Quad {
    private vertexBuffer: GPUBuffer;
    private indexBuffer: GPUBuffer;
    private indexCount: number;
    private vertexBufferLayouts: Iterable<GPUVertexBufferLayout>;

    constructor(device: GPUDevice) {
        // 頂点, インデックスデータの作成
        const modelData = this.createModelData();

        // 頂点バッファの作成
        this.vertexBuffer = device.createBuffer({
            size: modelData.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.vertexBuffer, 0, modelData.vertices);

        // インデックスバッファの作成
        this.indexBuffer = device.createBuffer({
            size: modelData.indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.indexBuffer, 0, modelData.indices);

        // 頂点バッファのレイアウト
        const vertexSize = 6 * 4; // 4(float32) * 6(position + normal)
        const positionOffset = 0 * 4;
        const normalOffset = 3 * 4; // 4(float32) * 3(position)
        this.vertexBufferLayouts = [
            {
                arrayStride: vertexSize,
                attributes: [
                    { shaderLocation: 0, offset: positionOffset, format: 'float32x3' },
                    { shaderLocation: 1, offset: normalOffset, format: 'float32x3' },
                ],
            },
        ];

        this.indexCount = modelData.indices.length;
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

    private createModelData() {
        const vertices = new Float32Array([
            // position (3), normal (3)
            -1, -1, 0, 0, 0, 1,
            1, -1, 0, 0, 0, 1,
            1, 1, 0, 0, 0, 1,
            -1, 1, 0, 0, 0, 1,
        ]);

        const indices = new Uint16Array([
            0, 1, 2, 0, 2, 3,
        ]);

        return {
            vertices,
            indices,
        };
    }
}