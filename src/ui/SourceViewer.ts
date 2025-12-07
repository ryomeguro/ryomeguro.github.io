import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { rust } from "@codemirror/lang-rust";
import { oneDark } from "@codemirror/theme-one-dark";
import { SourceFile } from "../sourceLoader";

export class SourceViewer {
    private container: HTMLElement;
    private editorView: EditorView | null = null;
    private currentFileIndex: number = 0;
    private sources: SourceFile[] = [];
    private tabContainer: HTMLElement;
    private languageCompartment = new Compartment();

    constructor(parentId: string) {
        const parent = document.getElementById(parentId);
        if (!parent) throw new Error(`Parent element ${parentId} not found`);

        this.container = document.createElement('div');
        this.container.id = 'source-viewer';
        // Always visible layout

        // Tab header
        this.tabContainer = document.createElement('div');
        this.tabContainer.className = 'source-tabs';
        this.container.appendChild(this.tabContainer);

        // Editor container
        const editorContainer = document.createElement('div');
        editorContainer.className = 'source-editor';
        this.container.appendChild(editorContainer);

        parent.appendChild(this.container);

        // Initialize empty editor
        this.editorView = new EditorView({
            parent: editorContainer,
            extensions: [
                basicSetup,
                this.languageCompartment.of(javascript()), // Default
                oneDark,
                EditorView.lineWrapping,
                EditorState.readOnly.of(true)
            ]
        });
    }

    public setSources(sources: SourceFile[]) {
        this.sources = sources;
        this.currentFileIndex = 0;
        this.renderTabs();
        this.updateContent();
    }

    private renderTabs() {
        this.tabContainer.innerHTML = '';
        this.sources.forEach((source, index) => {
            const tab = document.createElement('button');
            tab.className = `source-tab ${index === this.currentFileIndex ? 'active' : ''}`;
            tab.textContent = source.name;
            tab.onclick = () => {
                this.currentFileIndex = index;
                this.renderTabs();
                this.updateContent();
            };
            this.tabContainer.appendChild(tab);
        });
    }

    private updateContent() {
        if (!this.editorView || this.sources.length === 0) return;

        const source = this.sources[this.currentFileIndex];
        const content = source.content;

        // Determine Mode
        const isWgsl = source.name.endsWith('.wgsl');
        const languageExtension = isWgsl ? rust() : javascript();

        this.editorView.dispatch({
            changes: {
                from: 0,
                to: this.editorView.state.doc.length,
                insert: content
            },
            effects: this.languageCompartment.reconfigure(languageExtension)
        });
    }
}
