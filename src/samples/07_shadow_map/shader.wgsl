struct CommonUBO {
    lightDir: vec4f,
}
struct ModelUBO {
    mvp: mat4x4<f32>,
    modelMtx: mat4x4<f32>,
}
@binding(0) @group(0) var<uniform> commonUBO : CommonUBO;
@binding(1) @group(0) var<uniform> modelUBO : ModelUBO;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) worldPos: vec3f,
}

@vertex
fn vs_main(@location(0) pos: vec3f, @location(1) normal: vec3f) -> VertexOutput {
    var output: VertexOutput;
    output.position = modelUBO.mvp * vec4f(pos, 1.0);
    output.normal = (modelUBO.modelMtx * vec4f(normal, 0.0)).xyz;
    output.worldPos = (modelUBO.modelMtx * vec4f(pos, 1.0)).xyz;
    return output;
}

@fragment
fn fs_main(@location(0) normal: vec3f, @location(1) worldPos: vec3f) -> @location(0) vec4f {
    // Phong shading
    let lightDir = normalize(commonUBO.lightDir.xyz);
    let viewDir = normalize(vec3f(0.0, 0.0, 5.0) - worldPos);
    let norm = normalize(normal);

    // Ambient
    let ambient = mix(vec3f(0.8, 0.5, 0.2), vec3f(0.3, 0.4, 0.8), norm.y * 0.5 + 0.5) * 0.5;
    
    // Diffuse
    let diff = max(dot(norm, lightDir), 0.0);
    let diffuse = diff;
    
    // Specular
    let reflectDir = reflect(-lightDir, norm);
    let spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    let specular = spec;

    let result = ambient + diffuse + specular;
    return vec4f(result, 1.0);
}