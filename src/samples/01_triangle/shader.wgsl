/**
 * @fileoverview 一つの三角形ポリゴンを表示するシェーダー
 * @author ryomeguro
 */

// 頂点シェーダー
// エントリポイントとして設定するために @vertex が必要
@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  // @builtin(vertex_index) => 頂点インデックス
  // @memo @builtinは属性の1つで、WebGPUシステムから自動的に提供される特別な入力であることを示す
  // vertexIndex => 頂点インデックスを受け取る変数名
  // @builtin(position) => クリップ空間座標の出力
    var pos = array<vec2f, 3>(
        vec2f(0.0, 0.5),
        vec2f(-0.5, -0.5),
        vec2f(0.5, -0.5)
    );

    return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
    return vec4f(1.0, 0.0, 0.0, 1.0);
}
