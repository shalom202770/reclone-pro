import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

async function buildElectron() {
  try {
    console.log('⚡ Building Electron Main and Preload...');

    // Main process
    await esbuild.build({
      entryPoints: [path.join(root, 'electron/main.ts')],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: path.join(root, 'dist-electron/main.js'),
      external: ['electron', 'fsevents'],
      sourcemap: process.env.NODE_ENV === 'development',
      minify: process.env.NODE_ENV !== 'development',
      format: 'cjs',
    });

    // Preload script
    await esbuild.build({
      entryPoints: [path.join(root, 'electron/preload.ts')],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: path.join(root, 'dist-electron/preload.js'),
      external: ['electron'],
      sourcemap: process.env.NODE_ENV === 'development',
      minify: process.env.NODE_ENV !== 'development',
      format: 'cjs',
    });

    console.log('✅ Electron build completed successfully.');
  } catch (error) {
    console.error('❌ Error building Electron:', error);
    process.exit(1);
  }
}

buildElectron();
