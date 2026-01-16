//============================================
//
// テクスチャをプレビューする
//
//============================================
import texturePreviewShaderCode from './texturePreView.wgsl?raw';

import * as quad from './quad';

export class TextureDepthPreview {
    private shaderModule: GPUShaderModule;
    private bindGroup: GPUBindGroup;
    private pipeline: GPURenderPipeline;
    private vertexBuffer: GPUBuffer;
    private indexBuffer: GPUBuffer;
    private viewPort: { x: number, y: number, width: number, height: number };
    private texturePreviewPassDescriptor: GPURenderPassDescriptor;

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

        // 頂点バッファのレイアウト
        const vertexBufferLayouts: Iterable<GPUVertexBufferLayout> = [
            {
                arrayStride: quad.vertexSize,
                attributes: [
                    { shaderLocation: 0, offset: quad.positionOffset, format: 'float32x3' },
                    { shaderLocation: 1, offset: quad.normalOffset, format: 'float32x3' },
                ],
            },
        ];

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
                buffers: vertexBufferLayouts,
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

        // 板ポリのバッファ作成
        this.vertexBuffer = device.createBuffer({
            size: quad.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.vertexBuffer, 0, quad.vertices);

        this.indexBuffer = device.createBuffer({
            size: quad.indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(this.indexBuffer, 0, quad.indices);

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
        renderPass.setVertexBuffer(0, this.vertexBuffer);
        renderPass.setIndexBuffer(this.indexBuffer, 'uint16');
        renderPass.drawIndexed(quad.indices.length);

        renderPass.end();
    }
}