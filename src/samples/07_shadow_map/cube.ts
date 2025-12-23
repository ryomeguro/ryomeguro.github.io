export const vertexSize = 6 * 4; // 4(float32) * 6(position + normal)
export const positionOffset = 0 * 4;
export const normalOffset = 3 * 4; // 4(float32) * 3(position)
export const vertexCount = 24;

export const vertices = new Float32Array([
    // position (3), normal (3)
    // Front face
    -1, -1, 1, 0, 0, 1,
    1, -1, 1, 0, 0, 1,
    1, 1, 1, 0, 0, 1,
    -1, 1, 1, 0, 0, 1,
    // Back face
    -1, -1, -1, 0, 0, -1,
    -1, 1, -1, 0, 0, -1,
    1, 1, -1, 0, 0, -1,
    1, -1, -1, 0, 0, -1,
    // Top face
    -1, 1, -1, 0, 1, 0,
    -1, 1, 1, 0, 1, 0,
    1, 1, 1, 0, 1, 0,
    1, 1, -1, 0, 1, 0,
    // Bottom face
    -1, -1, -1, 0, -1, 0,
    1, -1, -1, 0, -1, 0,
    1, -1, 1, 0, -1, 0,
    -1, -1, 1, 0, -1, 0,
    // Right face
    1, -1, -1, 1, 0, 0,
    1, 1, -1, 1, 0, 0,
    1, 1, 1, 1, 0, 0,
    1, -1, 1, 1, 0, 0,
    // Left face
    -1, -1, -1, -1, 0, 0,
    -1, -1, 1, -1, 0, 0,
    -1, 1, 1, -1, 0, 0,
    -1, 1, -1, -1, 0, 0,
]);

export const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3, // Front
    4, 5, 6, 4, 6, 7, // Back
    8, 9, 10, 8, 10, 11, // Top
    12, 13, 14, 12, 14, 15, // Bottom
    16, 17, 18, 16, 18, 19, // Right
    20, 21, 22, 20, 22, 23, // Left
]);