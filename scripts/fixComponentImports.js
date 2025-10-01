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

function fixComponentImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /import\s*\{\s*(\w+)\s*\}\s*from\s*(['"]@\/src\/components\/(\1)['"];?)/g;
  const matches = content.match(importRegex);
  if (!matches || matches.length === 0) return 0;

  let fixes = 0;
  const updated = content.replace(importRegex, (_m, name, fromPart) => {
    fixes++;
    return `import ${name} from ${fromPart}`;
  });

  if (fixes > 0) {
    fs.writeFileSync(filePath, updated, 'utf8');
  }
  return fixes;
}

async function fixComponentImports(options) {
  const { componentsDir, appDir, logger } = options;
  const componentFiles = fs.existsSync(componentsDir) ? getAllTsFiles(componentsDir) : [];
  const appFiles = fs.existsSync(appDir) ? getAllTsFiles(appDir) : [];
  const allFiles = [...componentFiles, ...appFiles];

  if (allFiles.length === 0) {
    logger?.info('fixComponentImports: no files to scan');
    return;
  }

  let totalFixes = 0;
  for (const file of allFiles) {
    try {
      const fixed = fixComponentImportsInFile(file);
      if (fixed > 0) {
        totalFixes += fixed;
        logger?.info({ file: path.basename(file), fixed }, 'fixComponentImports: fixed');
      }
    } catch {
      // ignore per-file errors
    }
  }
  logger?.info({ totalFixes }, 'fixComponentImports: done');
}

async function main() {
  const root = process.cwd();
  const componentsDir = path.join(root, 'src/components');
  const appDir = path.join(root, 'app');

  await fixComponentImports({
    componentsDir,
    appDir,
    logger: console,
  });
}

main().catch((err) => {
  console.error('fixComponentImports: error', err);
  process.exitCode = 1;
});


