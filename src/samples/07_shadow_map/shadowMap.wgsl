struct Scene {
    lightViewProjMatrix: mat4x4f,
    cameraViewProjMatrix: mat4x4f,
    lightDir: vec4f,
}
struct Model {
    modelMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> scene : Scene;
@group(1) @binding(0) var<uniform> model : Model;

struct VertexOutput {
    @builtin(position) position: vec4f,
}

@vertex
fn vs_main(@location(0) pos: vec3f) -> VertexOutput {
    var output: VertexOutput;
    output.position = scene.lightViewProjMatrix * model.modelMatrix * vec4f(pos, 1.0);
    return output;
}
