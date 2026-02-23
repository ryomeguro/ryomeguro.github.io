//============================================
//
// DatGUIのラッパー
//
//============================================

import * as dat from 'dat.gui';

export interface GuiItem {
    value: any;
    label: string;
    min?: number;
    max?: number;
    options?: string[] | object;
}

export interface GuiSchema {
    [key: string]: GuiItem;
}

export class GuiManager<T extends GuiSchema> {
    public values: { [K in keyof T]: T[K]['value'] };
    private gui: dat.GUI;

    constructor(schema: T, title: string = "Setting") {
        this.gui = new dat.GUI();

        // 初期値を抽出して valuesオブジェクトを作成
        const initialValues = {} as any;
        for (const key in schema) {
            initialValues[key] = schema[key].value;
        }
        this.values = initialValues;

        // GUIを構築
        this.setup(schema);

        // GUIをDOMにマウント
        this.mount();
    }

    private setup(schema: T) {
        for (const key in schema) {
            const item = schema[key];
            const controller = this.gui.add(this.values, key);

            controller.name(item.label);

            if (typeof item.min === 'number') {
                controller.min(item.min);
            }
            if (typeof item.max === 'number') {
                controller.max(item.max);
            }

            // オプションがある場合はaddをやりなおす
            if (item.options !== undefined) {
                this.gui.remove(controller);
                this.gui.add(this.values, key, item.options);
            }
        }
    }

    private mount() {
        // Append GUI to sample controls
        const controlsContainer = document.querySelector('.sample-controls');
        if (controlsContainer) {
            controlsContainer.appendChild(this.gui.domElement);
        } else {
            // Fallback or create if not exists (though navigation.ts should have created it)
            const header = document.querySelector('.sample-header');
            if (header) {
                const controls = document.createElement('div');
                controls.className = 'sample-controls';
                header.appendChild(controls);
                controls.appendChild(this.gui.domElement);
            } else {
                // Absolute fallback if no header
                document.body.appendChild(this.gui.domElement);
                this.gui.domElement.style.position = 'absolute';
                this.gui.domElement.style.top = '10px';
                this.gui.domElement.style.right = '10px';
            }
        }
    }
}
