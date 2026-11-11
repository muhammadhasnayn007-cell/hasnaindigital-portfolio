const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['.git', '.vercel', 'node_modules', '.next', 'dist', 'coverage']);
const sourceFiles = [];

function collectJavaScript(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectJavaScript(absolutePath);
    } else if (entry.isFile() && /\.(?:c?js|mjs)$/.test(entry.name)) {
      sourceFiles.push(absolutePath);
    }
  }
}

collectJavaScript(projectRoot);

for (const filePath of sourceFiles) {
  const result = spawnSync(process.execPath, ['--check', filePath], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(`${path.relative(projectRoot, filePath)}\n${result.stderr || result.error?.message || 'Syntax check failed.'}`);
    process.exitCode = 1;
  }
}

if (!process.exitCode) process.stdout.write(`Syntax checks passed for ${sourceFiles.length} JavaScript files.\n`);
