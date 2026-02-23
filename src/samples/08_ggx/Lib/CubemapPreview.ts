import cubemapPreviewShaderCode from './cubemapPreview.wgsl?raw';
import * as quad from './quad';

export class CubemapPreview {
    private shaderModule: GPUShaderModule;
    private bindGroup: GPUBindGroup;
    private pipeline: GPURenderPipeline;
    private viewPort: { x: number, y: number, width: number, height: number };
    private passDescriptor: GPURenderPassDescriptor;
    private quadModel: quad.Quad;

    constructor(textureView: GPUTextureView, device: GPUDevice, format: GPUTextureFormat) {
        this.shaderModule = device.createShaderModule({
            code: cubemapPreviewShaderCode,
        });

        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        viewDimension: '2d-array',
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {},
                },
            ],
        });

        this.quadModel = new quad.Quad(device);

        this.pipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
            }),
            vertex: {
                module: this.shaderModule,
                entryPoint: 'vs_main',
                buffers: this.quadModel.getVertexBufferLayouts(),
            },
            fragment: {
                module: this.shaderModule,
                entryPoint: 'fs_main',
                targets: [{
                    format,
                    blend: {
                        color: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add',
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add',
                        },
                    },
                }],
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back',
            }
        });

        this.bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: textureView,
                },
                {
                    binding: 1,
                    resource: device.createSampler({
                        magFilter: 'linear',
                        minFilter: 'linear',
                    }),
                },
            ],
        });

        this.passDescriptor = {
            label: 'Cubemap Preview Render Pass',
            colorAttachments: [{
                view: undefined as any,
                loadOp: 'load',
                storeOp: 'store',
            }],
        };

        this.viewPort = { x: 0, y: 0, width: 512, height: 384 }; // Default 128px per face (4x3)
    }

    public setFaceSize(x: number, y: number, faceSize: number): void {
        this.viewPort = { x, y, width: faceSize * 4, height: faceSize * 3 };
    }

    public draw(commandEncoder: GPUCommandEncoder, context: GPUCanvasContext): void {
        (this.passDescriptor.colorAttachments as GPURenderPassColorAttachment[])[0].view = context.getCurrentTexture().createView();
        const renderPass = commandEncoder.beginRenderPass(this.passDescriptor);

        renderPass.setViewport(this.viewPort.x, this.viewPort.y, this.viewPort.width, this.viewPort.height, 0, 1);
        renderPass.setPipeline(this.pipeline);
        renderPass.setBindGroup(0, this.bindGroup);
        renderPass.setVertexBuffer(0, this.quadModel.getVertexBuffer());
        renderPass.setIndexBuffer(this.quadModel.getIndexBuffer(), 'uint16');
        renderPass.drawIndexed(this.quadModel.getIndexCount());

        renderPass.end();
    }
}
