struct Uniforms {
    mvp: mat4x4<f32>,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;
@binding(1) @group(0) var colorTexture : texture_2d<f32>;
@binding(2) @group(0) var colorSampler : sampler;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@vertex
fn vs_main(@location(0) pos: vec3f, @location(1) uv: vec2f) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.mvp * vec4f(pos, 1.0);
    output.uv = uv;
    return output;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    return textureSample(colorTexture, colorSampler, uv);
}
