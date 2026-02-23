export interface SourceFile {
    name: string;
    content: string;
}

// Ensure we catch all likely source files in samples
// Ensure we catch all likely source files in samples
const modules = import.meta.glob('./samples/**/*.(ts|wgsl)', {
    query: '?raw',
    import: 'default',
    eager: true,
});

export function getSampleSources(sampleName: string): SourceFile[] {
    const sources: SourceFile[] = [];
    const prefix = `./samples/${sampleName}/`;

    for (const path in modules) {
        if (path.startsWith(prefix)) {
            const fileName = path.substring(prefix.length);
            if (!fileName.startsWith('Lib/')) {
                sources.push({
                    name: fileName,
                    content: modules[path] as string
                });
            }
        }
    }

    // Sort so main.ts is usually first, or by name
    sources.sort((a, b) => {
        if (a.name === 'main.ts') return -1;
        if (b.name === 'main.ts') return 1;
        return a.name.localeCompare(b.name);
    });

    return sources;
}
