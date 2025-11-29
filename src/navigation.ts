export function initNavigation() {
    const sidebar = document.querySelector('#sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
    <h2>WebGPU Samples</h2>
    <ul>
      <li><a href="/index.html">Home</a></li>
      <li><a href="/src/samples/01_triangle/index.html">01. Triangle</a></li>
      <li><a href="/src/samples/02_cube/index.html">02. Cube</a></li>
    </ul>
  `;
}

initNavigation();
