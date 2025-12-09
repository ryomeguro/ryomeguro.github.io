import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        triangle: resolve(__dirname, 'src/samples/01_triangle/index.html'),
        cube: resolve(__dirname, 'src/samples/02_cube/index.html'),
        twocube: resolve(__dirname, 'src/samples/03_twocube/index.html'),
        texturecube: resolve(__dirname, 'src/samples/04_texturecube/index.html'),
        gltfload: resolve(__dirname, 'src/samples/05_gltf_load/index.html'),
      },
    },
  },
  server: {
    open: true,
  }
});
