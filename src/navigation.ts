export function initNavigation() {
    const sidebar = document.querySelector('#sidebar');
    if (!sidebar) return;

    // Side navigation content
    sidebar.innerHTML = `
        <h2>WebGPU Samples</h2>
        <ul>
            <li><a href="/index.html">Home</a></li>
        </ul>
        <h3>Basic</h3>
        <ul>
            <li><a href="/src/samples/01_triangle/index.html">Draw Single Triangle</a></li>
            <li><a href="/src/samples/02_cube/index.html">Draw Cube</a></li>
            <li><a href="/src/samples/03_twocube/index.html">Draw Two Cubes</a></li>
        </ul>
    `;

    // Check if we are on a sample page and inject source link/viewer
    const checkAndInit = () => {
        const path = window.location.pathname;
        console.log('[Navigation] Checking path:', path);

        // Relaxed regex to match /src/samples/{name} with or without trailing slash/file
        const match = path.match(/\/src\/samples\/([^/]+)/);
        if (match && match[1]) {
            const sampleName = match[1];
            console.log('[Navigation] Detected sample:', sampleName);

            const canvasContainer = document.querySelector('#canvas-container');
            if (canvasContainer) {
                console.log('[Navigation] Canvas container found');

                // 1. Create GitHub source link at top-right
                if (!canvasContainer.querySelector('.source-link')) {
                    const link = document.createElement('a');
                    link.href = `https://github.com/ryomeguro/ryomeguro.github.io/tree/master/src/samples/${sampleName}`;
                    link.className = 'source-link';
                    link.textContent = 'View Source on GitHub';
                    link.target = '_blank';
                    canvasContainer.appendChild(link);
                }

                // 2. Initialize persistent SourceViewer at bottom
                if (!document.getElementById('source-viewer')) {



                    import('./ui/SourceViewer').then(({ SourceViewer }) => {
                        console.log('[Navigation] SourceViewer imported');
                        import('./sourceLoader').then(({ getSampleSources }) => {
                            const sources = getSampleSources(sampleName);
                            console.log('[Navigation] Loaded sources:', sources);

                            const viewer = new SourceViewer('canvas-container');
                            viewer.setSources(sources);



                        }).catch(e => console.error('[Navigation] Error loading sources:', e));
                    }).catch(e => console.error('[Navigation] Error importing SourceViewer:', e));
                }
            } else {
                console.error('[Navigation] #canvas-container not found');
            }
        } else {
            console.log('[Navigation] No sample name matched in path');
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndInit);
    } else {
        checkAndInit();
    }
}

initNavigation();
