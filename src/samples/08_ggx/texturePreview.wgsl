@binding(0) @group(0) var shadowMap: texture_depth_2d;
@binding(1) @group(0) var shadowSampler: sampler;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@vertex
fn vs_main(@location(0) pos: vec3f, @location(1) normal: vec3f) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f(pos, 1.0);
    // 位置からUVを計算する
    output.uv = pos.xy * vec2f(0.5, -0.5) + vec2f(0.5);
    return output;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let depth = textureSample(shadowMap, shadowSampler, uv);
    return vec4f(depth, depth, depth, 1.0);
}
