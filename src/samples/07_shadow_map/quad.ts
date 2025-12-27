export const vertexSize = 6 * 4; // 4(float32) * 6(position + normal)
export const positionOffset = 0 * 4;
export const normalOffset = 3 * 4; // 4(float32) * 3(position)
export const vertexCount = 4;

export const vertices = new Float32Array([
    // position (3), normal (3)
    -1, -1, 0, 0, 0, 1,
    1, -1, 0, 0, 0, 1,
    1, 1, 0, 0, 0, 1,
    -1, 1, 0, 0, 0, 1,
]);

export const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,
]);