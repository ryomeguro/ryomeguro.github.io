struct Scene {
    lightViewProjMatrix: mat4x4f,
    cameraViewProjMatrix: mat4x4f,
    lightDir: vec4f,
}

struct ModelShape{
    modelMatrix: mat4x4f,
    roughness: f32,
    metallic: f32,
    padding: vec2f,
}
struct Model {
    shape: array<ModelShape, 100>,
}

@group(0) @binding(0) var<uniform> scene : Scene;
@group(1) @binding(0) var<uniform> model : Model;

struct VertexOutput {
    @builtin(position) position: vec4f,
}

@vertex
fn vs_main(@location(0) pos: vec3f, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    var output: VertexOutput;
    output.position = scene.lightViewProjMatrix * model.shape[instanceIndex].modelMatrix * vec4f(pos, 1.0);
    return output;
}
