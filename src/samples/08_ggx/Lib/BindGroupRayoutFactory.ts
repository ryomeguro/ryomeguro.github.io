type EntryType = 'Uniform' | 'ColorTexture' | 'DepthTexture' | 'Sampler' | 'ComparisonSampler';

interface EntryConfig {
    visibility?: GPUShaderStageFlags;
    type: EntryType;
}

export function createBindGroupLayout(device: GPUDevice, label: string, entries: EntryConfig[]): GPUBindGroupLayout {
    return device.createBindGroupLayout({
        label: label,
        entries: entries.map((entry, index) => {
            let textureSampleType: GPUTextureSampleType | undefined = undefined;
            if (entry.type === 'ColorTexture') {
                textureSampleType = 'float';
            } else if (entry.type === 'DepthTexture') {
                textureSampleType = 'depth';
            }

            let samplerType: GPUSamplerBindingType | undefined = undefined;
            if (entry.type === 'Sampler') {
                samplerType = 'filtering';
            } else if (entry.type === 'ComparisonSampler') {
                samplerType = 'comparison';
            }

            return {
                binding: index,
                visibility: entry.visibility ?? GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: entry.type === 'Uniform' ? { type: 'uniform' } : undefined,
                texture: textureSampleType === undefined ? undefined : { sampleType: textureSampleType },
                sampler: samplerType === undefined ? undefined : { type: samplerType },
            };
        }),
    });
}