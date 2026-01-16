//============================================
//
// トーラスモデル
//
//============================================

export class Torus {
    private vertexBuffer: GPUBuffer;
    private indexBuffer: GPUBuffer;
    private indexCount: number;
    private vertexBufferLayouts: Iterable<GPUVertexBufferLayout>;

    constructor(device: GPUDevice) {
        // 頂点, インデックスデータの作成
        const ringSegments = 32;
        const tubeSegments = 32;
        const torusData = this.createTorus(ringSegments, tubeSegments, 1.0, 0.4);

        // 頂点バッファの作成
        this.vertexBuffer = device.createBuffer({
            size: torusData.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.vertexBuffer, 0, torusData.vertices);

        // インデックスバッファの作成
        this.indexBuffer = device.createBuffer({
            size: torusData.indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.indexBuffer, 0, torusData.indices);

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

        this.indexCount = torusData.indices.length;
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

    private createTorus(ringSegments = 8, tubeSegments = 8, R = 1.0, r = 0.4) {
        const vertices = [];
        const indices = [];

        for (let j = 0; j <= ringSegments; j++) {
            const theta = (j * 2 * Math.PI) / ringSegments;
            const cosTheta = Math.cos(theta);
            const sinTheta = Math.sin(theta);

            for (let i = 0; i <= tubeSegments; i++) {
                const phi = (i * 2 * Math.PI) / tubeSegments;
                const cosPhi = Math.cos(phi);
                const sinPhi = Math.sin(phi);

                // 頂点座標 (Position)
                const x = (R + r * cosPhi) * cosTheta;
                const y = r * sinPhi;
                const z = (R + r * cosPhi) * sinTheta;

                // 法線ベクトル (Normal) - スムーズシェーディング用
                // チューブの中心から頂点へ向かうベクトル
                const nx = cosPhi * cosTheta;
                const ny = sinPhi;
                const nz = cosPhi * sinTheta;

                vertices.push(x, y, z, nx, ny, nz);
            }
        }

        for (let j = 0; j < ringSegments; j++) {
            for (let i = 0; i < tubeSegments; i++) {
                const first = j * (tubeSegments + 1) + i;
                const second = first + tubeSegments + 1;

                // インデックスの生成（四角形を2つの三角形に分割）
                indices.push(first, first + 1, second);
                indices.push(second, first + 1, second + 1);
            }
        }

        return {
            vertices: new Float32Array(vertices),
            indices: new Uint16Array(indices)
        };
    }
}
