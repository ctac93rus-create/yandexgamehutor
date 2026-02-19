import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const distDir = join(process.cwd(), 'dist');
const artifactsDir = join(process.cwd(), 'artifacts');
const outputPath = join(artifactsDir, 'dist.zip');

if (!existsSync(distDir)) {
  throw new Error('dist directory not found. Run npm run build first.');
}

mkdirSync(artifactsDir, { recursive: true });

const pythonScript = `
import os
import zipfile

dist_dir = r'''${distDir}'''
output_path = r'''${outputPath}'''

file_count = 0
with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as archive:
    for root, _, files in os.walk(dist_dir):
        for name in files:
            abs_path = os.path.join(root, name)
            rel_path = os.path.relpath(abs_path, dist_dir)
            archive.write(abs_path, rel_path)
            file_count += 1

print(file_count)
`;

const pythonCmd = ['python3', 'python'].find((cmd) => {
  const check = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
  return check.status === 0;
});

if (!pythonCmd) {
  throw new Error('Python runtime not found. Cannot create dist.zip in this environment.');
}

const result = spawnSync(pythonCmd, ['-c', pythonScript], { encoding: 'utf-8' });
if (result.status !== 0) {
  throw new Error(result.stderr || 'zip creation failed');
}

const filesCount = Number(result.stdout.trim());
const topLevelNames = readdirSync(distDir);

console.log(`Created ${outputPath}`);
console.log(`Files in archive: ${filesCount}`);
console.log(`Top-level dist entries: ${topLevelNames.join(', ')}`);
