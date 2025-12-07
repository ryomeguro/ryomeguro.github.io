/**
 * @fileoverview 一つの三角形ポリゴンを表示するサンプル
 * @author ryomeguro
 */

import shaderCode from './shader.wgsl?raw';

const init = async () => {
    // ブラウザが WebGPU をサポートしているか確認
    if (!navigator.gpu) {
        throw new Error('WebGPU not supported on this browser.');
    }

    // GPU ハードウェアとドライバーを抽象化したオブジェクトであるGPUAdapterを非同期で取得します。
    // 処理の前にawaitがついているので、adapterが取得されるまで待機します。
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('No appropriate GPUAdapter found.');
    }

    // 実際にGPUリソースを作成・操作するためのメインオブジェクトであるGPUDeviceを非同期で取得します。すべてのWebGPU APIコールは、このGPUDeviceを通じて行われます。
    const device = await adapter.requestDevice();

    // HTMLCanvasElementを取得します。
    const canvas = document.querySelector('#webgpu-canvas') as HTMLCanvasElement;
    canvas.width = 1280;
    canvas.height = 720;
    // HTMLCanvasElementからWebGPUコンテキストを取得します。
    // @memo 他にも2DコンテキストやWebGLコンテキストなどが存在する
    const context = canvas.getContext('webgpu');

    if (!context) {
        throw new Error('WebGPU context not found.');
    }

    // Canvasのフォーマットを取得します。
    // @memo navigator.gpu.getPreferredCanvasFormat()は、ブラウザが推奨する色空間フォーマットを返します。
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    // 使用するGPUDeviceとCanvasのフォーマットを設定します。
    context.configure({
        device: device,
        format: canvasFormat,
    });

    // シェーダーをコンパイルします。
    // @memo createShaderModuleは同期的に動作するため、awaitは不要です。
    const shaderModule = device.createShaderModule({
        code: shaderCode,
    });

    // レンダリングパイプラインを設定します。
    const pipeline = device.createRenderPipeline({
        // リソースバインディングレイアウトを自動生成する
        // @memo 'auto'は、シェーダーのレイアウトを自動的に生成する
        // @memo リソースバインディングレイアウト = テクスチャなどのリソースをシェーダーに渡すためのバインドグループのレイアウト
        layout: 'auto',
        // 頂点シェーダーを設定します。
        // @memo ここでは設定していないが、buffersプロパティを設定することで頂点アトリビュートを指定できる
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
        },
        // フラグメントシェーダーを設定します。
        fragment: {
            module: shaderModule,
            entryPoint: 'fs_main',
            // レンダーターゲットの情報を指定する
            targets: [
                {
                    format: canvasFormat,
                },
            ],
        },
        // プリミティブのタイプを設定する
        // @memo 'triangle-list'は、一般的な描画の設定
        primitive: {
            topology: 'triangle-list',
        },
    });

    // コマンドエンコーダーを作成します。
    // @memo コマンドエンコーダーは、GPUコマンドを記録するためのエンコーダーです。
    const commandEncoder = device.createCommandEncoder();
    // テクスチャビューを作成します。
    // @memo テクスチャビューは、描画先のことです
    // @memo context.getCurrentTexture()で現在Canvasに表示されているテクスチャを取得します
    const textureView = context.getCurrentTexture().createView();

    // レンダーパスの設定をします
    const renderPassDescriptor: GPURenderPassDescriptor = {
        // カラーアタッチメントを設定します
        colorAttachments: [
            {
                // @memo 描画先を設定します
                view: textureView,
                // @memo 描画前にテクスチャをクリアする
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                // 描画開始時の動作
                loadOp: 'clear',
                // 描画終了時の動作
                // @memo 'store'は、描画結果をテクスチャに書き込むことを意味する
                // @memo 'discard'だｔ、描画結果を書き込まない（デプスだけ書き込んでカラーは書き込まない場合などに用いる）
                storeOp: 'store',
            },
        ],
        // @memo デプス書き込みを行いたい場合は、depthAttachmentも設定する
    };

    // レンダーパスを開始します
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    // パイプラインを設定します
    passEncoder.setPipeline(pipeline);
    // 描画を行います
    // @memo 3は頂点数を表します
    passEncoder.draw(3);
    // レンダーパスを終了します
    passEncoder.end();

    // @memo この時点ではまだコマンドエンコーダーにコマンドを記録しているだけ

    // コマンドエンコーダーを実行します
    // @memo commandEncoder.finish()で描画命令を一つのGPUCommandBufferにまとめる
    // @memo GPUDeviceのqueueにGPUCommandBufferを送信することで、GPUで描画命令を実行します
    device.queue.submit([commandEncoder.finish()]);
};

// init処理を一回だけ行う
// @memo つまり描画処理は一回だけ行っている
init().catch((err) => {
    console.error(err);
});

export { };
