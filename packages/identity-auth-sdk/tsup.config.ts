import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/user.ts', 'src/admin.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
});
