import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { execSync } from 'node:child_process';

const distDir = 'dist';
const outputDir = 'dist_zip';
const archiveName = `${basename(process.cwd())}.zip`;
const outputFile = join(outputDir, archiveName);

execSync('npm run build', { stdio: 'inherit' });

if (!existsSync(distDir)) {
  throw new Error('Build failed: dist directory does not exist after npm run build.');
}

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}
if (existsSync(outputFile)) {
  rmSync(outputFile);
}

execSync(`cd ${distDir} && zip -r ../${outputFile} .`, { stdio: 'inherit' });
console.log(`Created ${outputFile}`);
