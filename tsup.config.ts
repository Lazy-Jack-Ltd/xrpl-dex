import { defineConfig } from 'tsup';

export default defineConfig([
  // Core (no React dependency)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['react', 'xrpl'],
  },
  // React hooks (optional)
  {
    entry: ['src/react/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    outDir: 'dist/react',
    external: ['react', 'xrpl'],
  },
]);
