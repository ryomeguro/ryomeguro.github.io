# WebGPU Samples

WebGPU samples built with TypeScript and Vite.

## Prerequisites

- Node.js (Latest LTS recommended)
- A browser with WebGPU support (Chrome 113+, Edge 113+, etc.)

## Setup

Install dependencies:

```bash
npm install
```

## Development

Start the local development server:

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Build

Build the project for production (MPA):

```bash
npm run build
```

The output will be in the `dist` directory.

## Preview

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

- `src/samples/`: Contains individual WebGPU samples.
- `src/styles/`: Shared styles.
- `vite.config.ts`: Vite configuration for Multi-Page Application.
