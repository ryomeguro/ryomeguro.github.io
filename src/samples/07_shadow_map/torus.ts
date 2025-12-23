/**
 * トーラスの生成
 * @param {number} ringSegments - 円環（中心の円）の分割数
 * @param {number} tubeSegments - チューブ（断面の円）の分割数
 * @param {number} R - 中心からチューブの中心までの半径
 * @param {number} r - チューブの半径
 */
function createTorus(ringSegments = 8, tubeSegments = 8, R = 1.0, r = 0.4) {
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

const ringSegments = 32;
const tubeSegments = 32;
const R = 1.0;
const r = 0.4;
const torusData = createTorus(ringSegments, tubeSegments, R, r);

export const vertices = torusData.vertices;
export const indices = torusData.indices;

export const vertexSize = 6 * 4; // 4(float32) * 6(position + normal)
export const positionOffset = 0 * 4;
export const normalOffset = 3 * 4; // 4(float32) * 3(position)
export const vertexCount = ringSegments * tubeSegments;
