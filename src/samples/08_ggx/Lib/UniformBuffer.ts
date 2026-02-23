type UniformType = 'f32' | 'vec3f' | 'vec4f' | 'mat4f';

interface UniformMember {
    offset: number;
    size: number;
    type: UniformType;
    count: number;
    stride: number;
}

export class UniformBuffer {
    private members: Map<string, UniformMember> = new Map();
    private arrayBuffer: ArrayBuffer;
    private view: DataView;
    private byteLength: number;
    private buffer: GPUBuffer;

    constructor(device: GPUDevice, layout: Record<string, { type: UniformType, count?: number }>) {
        let currentOffset = 0;

        for (const [key, config] of Object.entries(layout)) {
            const type = config.type;
            const count = config.count ?? 1;

            let baseAlignment = 4;
            let elementSize = 4;

            if (type === 'vec3f' || type === 'vec4f') {
                baseAlignment = 16;
                elementSize = 16;
            } else if (type === 'mat4f') {
                baseAlignment = 16;
                elementSize = 64;
            }

            // アライメント調整
            currentOffset = Math.ceil(currentOffset / baseAlignment) * baseAlignment;

            this.members.set(key, {
                offset: currentOffset,
                size: elementSize * count,
                type,
                count,
                stride: elementSize,
            });

            currentOffset += elementSize * count;
        }

        // バッファ初期化
        this.arrayBuffer = new ArrayBuffer(Math.ceil(currentOffset / 16) * 16);
        this.view = new DataView(this.arrayBuffer);
        this.byteLength = Math.ceil(currentOffset / 16) * 16;
        this.buffer = device.createBuffer({
            size: this.arrayBuffer.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    public setValue(name: string, value: number | number[] | Float32Array, index?: number) {
        const member = this.members.get(name);
        if (!member) {
            throw new Error(`Uniform member ${name} not found`);
        }

        const data = Array.isArray(value) || value instanceof Float32Array ? value : [value];

        let count = index !== undefined ? 1 : member.count;

        for (let i = 0; i < count; ++i) {
            let elementOffset = member.offset + (i * member.stride);
            if (index !== undefined) {
                elementOffset += index * member.stride;
            }

            if (member.type === 'f32') {
                this.view.setFloat32(elementOffset, data[i] as number, true);
            }
            else if (member.type === 'vec3f' || member.type === 'vec4f') {
                const startIdx = i * (member.type === 'vec3f' ? 3 : 4);
                const componentCount = member.type === 'vec3f' ? 3 : 4;
                for (let j = 0; j < componentCount; ++j) {
                    const val = data[startIdx + j] ?? 0;
                    this.view.setFloat32(elementOffset + j * 4, val as number, true);
                }
            }
            else if (member.type === 'mat4f') {
                const matData = data as Float32Array;
                new Float32Array(this.arrayBuffer, elementOffset, 16).set(matData.subarray(i * 16, (i + 1) * 16));
            }
        }
    }

    public update(device: GPUDevice) {
        device.queue.writeBuffer(this.buffer, 0, this.arrayBuffer, 0, this.byteLength);
    }

    public getBuffer(): GPUBuffer {
        return this.buffer;
    }
}