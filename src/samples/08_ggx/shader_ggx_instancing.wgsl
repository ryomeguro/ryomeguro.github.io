override shadowDepthTextureSize: f32 = 1024.0;

const F_PI = 3.1415926535897932384626433832795;
const F_INV_PI = 1.0 / F_PI;

struct Scene {
    lightViewProjMatrix: mat4x4f,
    cameraViewProjMatrix: mat4x4f,
    lightDir: vec4f,
    cameraPos: vec4f,
}

struct Model {
    modelMatrix: array<mat4x4f, 100>,
    param0: array<vec4f, 100>,
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
    @location(3) roughness: f32,
    @location(4) metallic: f32,
}

@vertex
fn vs_main(@location(0) position: vec3f, @location(1) normal: vec3f, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    var output: VertexOutput;

    // XY is in (-1, 1) space, Z is in (0, 1) space
    let posFromLight = scene.lightViewProjMatrix * model.modelMatrix[instanceIndex] * vec4f(position, 1.0);

    // Convert XY to (0, 1)
    // Y is flipped because texture coords are Y-down.
    output.shadowPos = vec3f(
        posFromLight.xy * vec2f(0.5, -0.5) + vec2f(0.5),
        posFromLight.z
    );

    output.position = scene.cameraViewProjMatrix * model.modelMatrix[instanceIndex] * vec4f(position, 1.0);
    output.fragPos = (model.modelMatrix[instanceIndex] * vec4f(position, 1.0)).xyz;
    output.fragNorm = (model.modelMatrix[instanceIndex] * vec4f(normal, 0.0)).xyz;
    output.roughness = model.param0[instanceIndex].x;
    output.metallic = model.param0[instanceIndex].y;
    return output;
}

fn D_GGX(NdotH: f32, m2: f32) -> f32 {
    let f = NdotH * NdotH * (m2 - 1.0) + 1.0;
    return m2 / (F_PI * f * f);
}

fn G2_Smith(NdotV: f32, NdotL: f32, m2: f32) -> f32 {
    let NdotL2 = NdotL * NdotL;
    let NdotV2 = NdotV * NdotV;

    let lambdaL = NdotV * sqrt(NdotL2 * (1.0 - m2) + m2);
    let lambdaV = NdotL * sqrt(NdotV2 * (1.0 - m2) + m2);
    
    return 0.5 / (lambdaL + lambdaV + 1e-6);
}

fn F_Schlick(F0: vec3f, VdotH: f32) -> vec3f {
    return F0 + (1.0 - F0) * pow(1.0 - VdotH, 5.0);
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    var shadow = textureSampleCompare(
        shadowMap, shadowSampler,
        input.shadowPos.xy, input.shadowPos.z - 0.001
    );

    let baseColor = vec3f(1.0, 0.5, 0.0);
    let specColor = mix(vec3f(0.04), baseColor, input.metallic);

    // constはコンパイル時定数 letは変更不可能、varは変更可能
    let N = normalize(input.fragNorm);
    let V = normalize(scene.cameraPos.xyz - input.fragPos);
    let L = scene.lightDir.xyz;
    let H = normalize(L + V);

    let NdotV = max(dot(N, V), 0.0);
    let NdotL = max(dot(N, L), 0.0);
    let NdotH = max(dot(N, H), 0.0);
    let VdotH = max(dot(V, H), 0.0);

    let a = input.roughness * input.roughness;
    let m2 = a * a;

    // Direct Lighting (GGX)
    let D = D_GGX(NdotH, m2);
    let Gv = G2_Smith(NdotV, NdotL, m2);
    let F = F_Schlick(specColor, VdotH);

    let kS = F;
    let kD = (vec3f(1.0) - kS) * (1.0 - input.metallic);

    // Diffuse
    let albedo = baseColor;
    let diffuse_direct = kD * albedo * NdotL * F_INV_PI * shadow;
    let diffuse_ambient = kD * albedo * mix(vec3f(0.8, 0.5, 0.2), vec3f(0.3, 0.4, 0.8), N.y * 0.5 + 0.5) * 0.5;
    let diffuse = diffuse_direct + diffuse_ambient;

    // Specular
    let specular = D * Gv * F * NdotL * shadow;

    let result = diffuse + specular;
    return vec4f(result, 1.0);
}