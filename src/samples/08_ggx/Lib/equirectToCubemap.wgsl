const PI: f32 = 3.14159265359;

@group(0) @binding(0) var sourceTexture: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;
@group(0) @binding(2) var destTexture: texture_storage_2d_array<rgba16float, write>;

struct Config {
    size: f32,
    padding: vec3f,
}
@group(0) @binding(3) var<uniform> config: Config;

@compute @workgroup_size(8, 8, 1)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
    let cubeSize = u32(config.size);
    if (global_id.x >= cubeSize || global_id.y >= cubeSize) {
        return;
    }

    let face = global_id.z;
    let x = f32(global_id.x);
    let y = f32(global_id.y);

    // Normalize coordinates to [-1, 1]
    let uv = (vec2f(x, y) + 0.5) / config.size;
    let p = uv * 2.0 - 1.0;

    var dir: vec3f;

    // Calculate 3D direction vector based on face index
    // WebGPU Cube Map layout: 
    // 0: +X, 1: -X, 2: +Y, 3: -Y, 4: +Z, 5: -Z
    // Note: Y is usually flipped in texture space
    switch face {
        case 0u: { dir = vec3f( 1.0, -p.y, -p.x); } // +X
        case 1u: { dir = vec3f(-1.0, -p.y,  p.x); } // -X
        case 2u: { dir = vec3f( p.x,  1.0,  p.y); } // +Y
        case 3u: { dir = vec3f( p.x, -1.0, -p.y); } // -Y
        case 4u: { dir = vec3f( p.x, -p.y,  1.0); } // +Z
        case 5u: { dir = vec3f(-p.x, -p.y, -1.0); } // -Z
        default: { dir = vec3f(0.0); }
    }

    let normalizedDir = normalize(dir);

    // Map 3D direction to spherical coordinates (phi, theta)
    // Equirectangular projection:
    // u = (1 + atan2(x, -z) / PI) / 2
    // v = acos(y) / PI
    let phi = atan2(normalizedDir.x, -normalizedDir.z);
    let theta = acos(normalizedDir.y);

    let srcUV = vec2f(
        (phi / PI + 1.0) * 0.5,
        theta / PI
    );

    let color = textureSampleLevel(sourceTexture, sourceSampler, srcUV, 0.0);
    
    textureStore(destTexture, vec2u(global_id.xy), face, color);
}
