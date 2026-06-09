import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/shared.ts', 'src/user.ts', 'src/project-admin.ts', 'src/admin.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
});
