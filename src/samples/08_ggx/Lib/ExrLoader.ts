import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { FloatType } from 'three';

export interface ExrData {
    width: number;
    height: number;
    data: Float32Array;
}

export class ExrLoader {
    private loader: EXRLoader;

    constructor() {
        this.loader = new EXRLoader();
        this.loader.setDataType(FloatType);
    }

    public async load(url: string): Promise<ExrData> {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (textureData) => {
                    const image = (textureData as any).image;
                    resolve({
                        width: image.width,
                        height: image.height,
                        data: image.data as Float32Array
                    });
                },
                undefined,
                (err) => {
                    reject(err);
                }
            );
        });
    }
}
