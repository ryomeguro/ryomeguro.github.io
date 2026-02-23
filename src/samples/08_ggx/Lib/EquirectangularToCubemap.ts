import equirectToCubemapShaderCode from './equirectToCubemap.wgsl?raw';
import { ExrLoader } from './ExrLoader';
import * as THREE from 'three';

export class EquirectangularToCubemap {
    private device: GPUDevice;
    private pipeline: GPUComputePipeline;

    constructor(device: GPUDevice) {
        this.device = device;

        const shaderModule = device.createShaderModule({
            code: equirectToCubemapShaderCode,
        });

        this.pipeline = device.createComputePipeline({
            label: 'Equirectangular to Cubemap Pipeline',
            layout: 'auto',
            compute: {
                module: shaderModule,
                entryPoint: 'computeMain',
            },
        });
    }

    public async convert(exrUrl: string, cubemapSize: number = 1024): Promise<GPUTexture> {
        const loader = new ExrLoader();
        const exrData = await loader.load(exrUrl);

        // 1. Create source texture
        // Use rgba16float because rgba32float is usually "unfilterable" in WebGPU
        const sourceTexture = this.device.createTexture({
            size: [exrData.width, exrData.height],
            format: 'rgba16float',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });

        // Convert Float32Array to Uint16Array (Half Float) for high compatibility
        const halfFloatData = new Uint16Array(exrData.data.length);
        for (let i = 0; i < exrData.data.length; i++) {
            // Clamp value to Half Float range (max ~65504) to prevent out of range errors
            const val = Math.max(-65504, Math.min(65504, exrData.data[i]));
            halfFloatData[i] = THREE.DataUtils.toHalfFloat(val);
        }

        this.device.queue.writeTexture(
            { texture: sourceTexture },
            halfFloatData,
            { bytesPerRow: exrData.width * 8 }, // 4 channels * 2 bytes (f16)
            [exrData.width, exrData.height]
        );

        // 2. Create destination cubemap texture
        // Note: rgba16float might not be storage-capable on all devices.
        // rgba32float is safer for storage.
        const cubemapTexture = this.device.createTexture({
            size: [cubemapSize, cubemapSize, 6],
            format: 'rgba16float',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
        });

        // Wait, if I use rgba16float as storage, I MUST specify it in the shader.
        // Let's check my shader... it used rgba16float.
        // If it fails on some hardware, we'd need to fall back to rgba32float.

        // 3. Create conversion config buffer
        const configBuffer = this.device.createBuffer({
            size: 32, // Match WGSL struct size (f32 + padding + vec3f = 32 bytes)
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(configBuffer, 0, new Float32Array([cubemapSize]));

        const sampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
        });

        const bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sourceTexture.createView() },
                { binding: 1, resource: sampler },
                { binding: 2, resource: cubemapTexture.createView({ dimension: '2d-array' }) },
                { binding: 3, resource: { buffer: configBuffer } },
            ],
        });

        // 4. Run compute shader
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.dispatchWorkgroups(Math.ceil(cubemapSize / 8), Math.ceil(cubemapSize / 8), 6);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);

        return cubemapTexture;
    }
}
