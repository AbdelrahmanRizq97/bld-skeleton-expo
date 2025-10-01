'use strict';

const fs = require('fs');
const path = require('path');

function getAllTsFiles(rootDir) {
  const files = [];

  function traverse(currentDir) {
    let items = [];
    try {
      items = fs.readdirSync(currentDir);
    } catch {
      return;
    }

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        if (/(^|\/ )node_modules(\/+|\/|$)/.test(fullPath)) continue;
        traverse(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }

  traverse(rootDir);
  return files;
}

function fixUseAuthImportInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /import\s*\{\s*useAuth\s*\}\s*from\s*(['"]@\/src\/hooks\/useAuth['"];?)/g;
  const matches = content.match(importRegex);
  if (!matches || matches.length === 0) return 0;

  let fixes = 0;
  const updated = content.replace(importRegex, (_m, fromPart) => {
    fixes++;
    return `import useAuth from ${fromPart}`;
  });

  if (fixes > 0) {
    fs.writeFileSync(filePath, updated, 'utf8');
  }
  return fixes;
}

async function fixUseAuthImport(options) {
  const { appDir, srcDir, logger } = options;
  const appFiles = fs.existsSync(appDir) ? getAllTsFiles(appDir) : [];
  const srcFiles = fs.existsSync(srcDir) ? getAllTsFiles(srcDir) : [];
  const allFiles = [...appFiles, ...srcFiles];

  if (allFiles.length === 0) {
    logger?.info('fixUseAuthImport: no files to scan');
    return;
  }

  let totalFixes = 0;
  for (const file of allFiles) {
    try {
      const fixed = fixUseAuthImportInFile(file);
      if (fixed > 0) {
        totalFixes += fixed;
        logger?.info({ file: path.basename(file), fixed }, 'fixUseAuthImport: fixed');
      }
    } catch {
      // ignore per-file errors
    }
  }
  logger?.info({ totalFixes }, 'fixUseAuthImport: done');
}

async function main() {
  const root = process.cwd();
  const appDir = path.join(root, 'app');
  const srcDir = path.join(root, 'src');

  await fixUseAuthImport({
    appDir,
    srcDir,
    logger: console,
  });
}

main().catch((err) => {
  console.error('fixUseAuthImport: error', err);
  process.exitCode = 1;
});


