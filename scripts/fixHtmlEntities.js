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

function fixHtmlEntitiesInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const hasLt = content.includes('&lt;');
  const hasGt = content.includes('&gt;');
  if (!hasLt && !hasGt) return 0;

  let updated = content;
  let fixes = 0;
  if (hasLt) {
    const m = updated.match(/&lt;/g);
    if (m) {
      updated = updated.replace(/&lt;/g, '<');
      fixes += m.length;
    }
  }
  if (hasGt) {
    const m = updated.match(/&gt;/g);
    if (m) {
      updated = updated.replace(/&gt;/g, '>');
      fixes += m.length;
    }
  }
  if (fixes > 0) fs.writeFileSync(filePath, updated, 'utf8');
  return fixes;
}

async function fixHtmlEntities(options) {
  const { componentsDir, appDir, logger } = options;
  const componentFiles = fs.existsSync(componentsDir) ? getAllTsFiles(componentsDir) : [];
  const appFiles = fs.existsSync(appDir) ? getAllTsFiles(appDir) : [];
  const allFiles = [...componentFiles, ...appFiles];

  if (allFiles.length === 0) {
    logger?.info('fixHtmlEntities: no files to scan');
    return;
  }

  let totalFixes = 0;
  for (const file of allFiles) {
    try {
      const fixed = fixHtmlEntitiesInFile(file);
      if (fixed > 0) {
        totalFixes += fixed;
        logger?.info({ file: path.basename(file), fixed }, 'fixHtmlEntities: fixed');
      }
    } catch {
      // ignore per-file errors
    }
  }
  logger?.info({ totalFixes }, 'fixHtmlEntities: done');
}

async function main() {
  const root = process.cwd();
  const componentsDir = path.join(root, 'src/components');
  const appDir = path.join(root, 'app');

  await fixHtmlEntities({
    componentsDir,
    appDir,
    logger: console,
  });
}

main().catch((err) => {
  console.error('fixHtmlEntities: error', err);
  process.exitCode = 1;
});


