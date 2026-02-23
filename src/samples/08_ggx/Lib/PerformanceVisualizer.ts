//============================================
//
// 処理負荷の可視化
//
//============================================

import Stats from 'stats.js';

export class PerformanceVisualizer {
    private stats: Stats;

    constructor(canvas: HTMLCanvasElement) {
        // Setup Stats
        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom

        if (canvas.parentElement) {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.lineHeight = '0'; // Fixes potential whitespace issue
            canvas.parentElement.insertBefore(wrapper, canvas);
            wrapper.appendChild(canvas);
            wrapper.appendChild(this.stats.dom);
            this.stats.dom.style.position = 'absolute';
            this.stats.dom.style.left = '0px';
            this.stats.dom.style.top = '0px';
        } else {
            document.body.appendChild(this.stats.dom);
        }
    }

    begin() {
        this.stats.begin();
    }

    end() {
        this.stats.end();
    }
}
