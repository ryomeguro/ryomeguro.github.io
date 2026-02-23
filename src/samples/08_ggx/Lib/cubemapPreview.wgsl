@binding(0) @group(0) var cubemap: texture_2d_array<f32>;
@binding(1) @group(0) var cubeSampler: sampler;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@vertex
fn vs_main(@location(0) pos: vec3f, @location(1) normal: vec3f) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f(pos, 1.0);
    output.uv = pos.xy * vec2f(0.5, -0.5) + vec2f(0.5);
    return output;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    // 4 columns, 3 rows for a "net" or "cross" layout
    let col = u32(uv.x * 4.0);
    let row = u32(uv.y * 3.0);
    
    // Mapping 4x3 grid to cubemap faces:
    // Inverted Net Layout (as requested):
    //       [-Y(3)]
    // [+X(0)][+Z(4)][-X(1)][-Z(5)]
    //       [+Y(2)]
    
    var face: u32 = 99u; // Invalid face
    
    if (row == 0u && col == 1u) { face = 3u; }      // Row 0: -Y
    else if (row == 1u) {
        if (col == 0u) { face = 0u; }                // Row 1: -Z
        else if (col == 1u) { face = 4u; }           // Row 1: +X
        else if (col == 2u) { face = 1u; }           // Row 1: +Z
        else if (col == 3u) { face = 5u; }           // Row 1: -X
    }
    else if (row == 2u && col == 1u) { face = 2u; } // Row 2: +Y
    
    if (face > 5u) {
        // Return transparent color for empty tiles in the grid
        return vec4f(0.0, 0.0, 0.0, 0.0);
    }
    
    // Normalize UV to the specific face quad
    // Invert both X and Y to match the inverted layout and WebGPU texture space
    let faceUV = vec2f(
        1.0 - ((uv.x * 4.0) % 1.0),
        1.0 - ((uv.y * 3.0) % 1.0)
    );
    
    let color = textureSampleLevel(cubemap, cubeSampler, faceUV, face, 0.0);
    
    // Tone mapping (simple exposure for HDR preview)
    let exposure = 1.0;
    let mapped = 1.0 - exp(-color.rgb * exposure);
    
    return vec4f(mapped, 1.0);
}
