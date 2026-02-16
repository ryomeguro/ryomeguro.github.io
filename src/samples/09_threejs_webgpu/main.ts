import * as THREE from 'three/webgpu';

async function init() {
    const canvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, 1280 / 720, 0.1, 100);
    camera.position.z = 3;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    // Geometry & Material
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Renderer
    const renderer = new THREE.WebGPURenderer({
        canvas: canvas,
        antialias: true
    });

    // In recent Three.js WebGPURenderer, sizes are typically handled via setSize
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(1280, 720);

    // Animation loop
    function animate() {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        renderer.render(scene, camera);
    }

    // Wait for renderer to be ready if necessary
    await renderer.init();

    renderer.setAnimationLoop(animate);
}

init().catch(err => {
    console.error('Failed to initialize WebGPU renderer:', err);
});
