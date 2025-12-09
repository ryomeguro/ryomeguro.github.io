struct Uniforms {
    mvp: mat4x4<f32>,
    normalMatrix: mat4x4<f32>,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) worldPos: vec3f,
}

@vertex
fn vs_main(@location(0) pos: vec3f, @location(1) normal: vec3f) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.mvp * vec4f(pos, 1.0);
    output.normal = (uniforms.normalMatrix * vec4f(normal, 0.0)).xyz;
    output.worldPos = pos;
    return output;
}

@fragment
fn fs_main(@location(0) normal: vec3f, @location(1) worldPos: vec3f) -> @location(0) vec4f {
    // Phong shading
    let lightDir = normalize(vec3f(1.0, 1.0, 1.0));
    let viewDir = normalize(vec3f(0.0, 0.0, 5.0) - worldPos);
    let norm = normalize(normal);
    
    // Ambient
    let ambient = vec3f(0.2, 0.2, 0.2);
    
    // Diffuse
    let diff = max(dot(norm, lightDir), 0.0);
    let diffuse = diff * vec3f(0.8, 0.8, 0.8);
    
    // Specular
    let reflectDir = reflect(-lightDir, norm);
    let spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    let specular = spec * vec3f(0.5, 0.5, 0.5);

    let result = ambient + diffuse + specular;
    return vec4f(result, 1.0);
}
