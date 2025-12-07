export function initNavigation() {
    const sidebar = document.querySelector('#sidebar');
    if (!sidebar) return;

    // ページを追加した場合、vite.config.tsにも追加する必要がある
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
}

initNavigation();
