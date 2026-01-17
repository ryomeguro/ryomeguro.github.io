//============================================
//
// テクスチャをプレビューする
//
//============================================
import texturePreviewShaderCode from './texturePreview.wgsl?raw';

import * as quad from './quad';

export class TextureDepthPreview {
    private shaderModule: GPUShaderModule;
    private bindGroup: GPUBindGroup;
    private pipeline: GPURenderPipeline;
    private viewPort: { x: number, y: number, width: number, height: number };
    private texturePreviewPassDescriptor: GPURenderPassDescriptor;
    private quadModel: quad.Quad;

    constructor(textureView: GPUTextureView, device: GPUDevice, format: GPUTextureFormat) {
        // シェーダモジュールの作成
        this.shaderModule = device.createShaderModule({
            code: texturePreviewShaderCode,
        });

        // テクスチャプレビューに関する情報を入れるレイアウト
        const texturePreviewBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: 'depth',
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: 'non-filtering', // デプスを参照する場合はnon-filteringにする必要がある
                    },
                },
            ],
        });

        this.quadModel = new quad.Quad(device);

        // レンダリングパイプラインの作成
        this.pipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [
                    texturePreviewBindGroupLayout,
                ],
            }),
            vertex: {
                module: this.shaderModule,
                entryPoint: 'vs_main',
                buffers: this.quadModel.getVertexBufferLayouts(),
            },
            fragment: {
                module: this.shaderModule,
                entryPoint: 'fs_main',
                targets: [{ format }],
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back',
            }
        });

        // バインドグループの作成
        this.bindGroup = device.createBindGroup({
            layout: texturePreviewBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: textureView,
                },
                {
                    binding: 1,
                    resource: device.createSampler({}),
                },
            ],
        });

        // レンダリングパスの設定
        this.texturePreviewPassDescriptor = {
            label: 'Texture Preview Render Pass',
            colorAttachments: [{
                view: undefined as any, // ここは後で入れるので仮置き
                loadOp: 'load',
                storeOp: 'store',
            }],
        };

        // ビューポートの初期化
        this.viewPort = { x: 0, y: 0, width: 256, height: 256 };
    }

    public setViewPort(x: number, y: number, width: number, height: number): void {
        this.viewPort = { x, y, width, height };
    }

    public draw(commandEncoder: GPUCommandEncoder, context: GPUCanvasContext): void {
        (this.texturePreviewPassDescriptor.colorAttachments as GPURenderPassColorAttachment[])[0].view = context.getCurrentTexture().createView();
        const renderPass = commandEncoder.beginRenderPass(this.texturePreviewPassDescriptor);

        renderPass.setViewport(this.viewPort.x, this.viewPort.y, this.viewPort.width, this.viewPort.height, 0, 1);
        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.bindGroup);
        renderPass.setVertexBuffer(0, this.quadModel.getVertexBuffer());
        renderPass.setIndexBuffer(this.quadModel.getIndexBuffer(), 'uint16');
        renderPass.drawIndexed(this.quadModel.getIndexCount());

        renderPass.end();
    }
}