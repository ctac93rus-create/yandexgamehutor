import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const assetsDir = join(process.cwd(), 'dist', 'assets');

function formatKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

try {
  const files = readdirSync(assetsDir)
    .map((name) => {
      const fullPath = join(assetsDir, name);
      const stat = statSync(fullPath);
      return {
        name,
        bytes: stat.size,
      };
    })
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10);

  console.log('Bundle report: top 10 largest dist/assets files');
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name} — ${file.bytes} bytes (${formatKB(file.bytes)})`);
  });
} catch {
  console.log('Bundle report skipped: dist/assets not found. Run build first.');
}
