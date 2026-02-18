import { existsSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';
import { execSync } from 'node:child_process';

const distDir = 'dist';
const outputDir = 'dist_zip';
const outputFile = `${outputDir}/${basename(process.cwd())}.zip`;

if (!existsSync(distDir)) {
  throw new Error('dist directory does not exist. Run npm run build first.');
}

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

execSync(`zip -r ${outputFile} ${distDir}`, { stdio: 'inherit' });
console.log(`Created ${outputFile}`);
