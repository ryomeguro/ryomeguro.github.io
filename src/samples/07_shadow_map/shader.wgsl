override shadowDepthTextureSize: f32 = 1024.0;

struct Scene {
    lightViewProjMatrix: mat4x4f,
    cameraViewProjMatrix: mat4x4f,
    lightDir: vec4f,
}

struct Model {
    modelMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> scene : Scene;
@group(0) @binding(1) var shadowMap: texture_depth_2d;
@group(0) @binding(2) var shadowSampler: sampler_comparison;
@group(1) @binding(0) var<uniform> model : Model;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) shadowPos: vec3f,
    @location(1) fragPos: vec3f,
    @location(2) fragNorm: vec3f,
}

@vertex
fn vs_main(@location(0) position: vec3f, @location(1) normal: vec3f) -> VertexOutput {
    var output: VertexOutput;

    // XY is in (-1, 1) space, Z is in (0, 1) space
    let posFromLight = scene.lightViewProjMatrix * model.modelMatrix * vec4f(position, 1.0);

    // Convert XY to (0, 1)
    // Y is flipped because texture coords are Y-down.
    output.shadowPos = vec3f(
        posFromLight.xy * vec2f(0.5, -0.5) + vec2f(0.5),
        posFromLight.z
    );

    output.position = scene.cameraViewProjMatrix * model.modelMatrix * vec4f(position, 1.0);
    output.fragPos = output.position.xyz;
    output.fragNorm = (model.modelMatrix * vec4f(normal, 0.0)).xyz;
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    var visibility = textureSampleCompare(
        shadowMap, shadowSampler,
        input.shadowPos.xy, input.shadowPos.z - 0.002
    );

    // Phong shading
    let viewDir = normalize(vec3f(0.0, 0.0, 5.0) - input.fragPos);
    let norm = normalize(input.fragNorm);

    // Ambient
    let ambient = mix(vec3f(0.8, 0.5, 0.2), vec3f(0.3, 0.4, 0.8), norm.y * 0.5 + 0.5) * 0.5;

    // Diffuse
    let diff = max(dot(norm, scene.lightDir.xyz), 0.0) * visibility;
    let diffuse = vec3f(diff);

    let result = ambient + diffuse;
    return vec4f(result, 1.0);
}