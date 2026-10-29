import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

const preserveFiles = ['.git', '.nojekyll', 'README.md', 'preview.png', 'src', 'scripts', 'node_modules', 'package.json', 'package-lock.json', 'vite.config.js'];

async function deploy() {
  console.log('Deploying dist to root for GitHub Pages...\n');

  const distFiles = await fs.readdir(dist);

  for (const file of distFiles) {
    const src = join(dist, file);
    const dest = join(root, file);

    const stat = await fs.stat(src);
    if (stat.isDirectory()) {
      await fs.cp(src, dest, { recursive: true, force: true });
    } else {
      await fs.copyFile(src, dest);
    }
    console.log(`  Copied: ${file}`);
  }

  const nojekyllPath = join(root, '.nojekyll');
  try {
    await fs.access(nojekyllPath);
  } catch {
    await fs.writeFile(nojekyllPath, '');
    console.log('  Created: .nojekyll');
  }

  console.log('\nDeploy complete! Files are ready for GitHub Pages.');
  console.log('Commit and push to update the live site.');
}

deploy().catch(console.error);
