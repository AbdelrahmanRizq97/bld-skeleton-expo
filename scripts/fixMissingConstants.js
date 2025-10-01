'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function getExportedConstants(filePath) {
  if (!fs.existsSync(filePath)) return new Set();
  const src = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, src, ts.ScriptTarget.ESNext);
  const exports = new Set();

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((decl) => {
        if (decl.name && decl.name.text) exports.add(decl.name.text);
      });
    }
    if (ts.isFunctionDeclaration(node) && node.name) exports.add(node.name.text);
    if (ts.isClassDeclaration(node) && node.name) exports.add(node.name.text);
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      node.exportClause.elements.forEach((el) => exports.add(el.name.text));
    }
  });

  return exports;
}

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

function findUnknownNamesInFiles(filePaths) {
  const program = ts.createProgram(filePaths, {
    allowJs: true,
    skipLibCheck: true,
    noEmit: true,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);

  const fileUnknownNames = new Map();

  diagnostics.forEach((d) => {
    if (d.file) {
      const filePath = d.file.fileName;
      const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');

      if (msg.startsWith("Cannot find name '")) {
        const match = msg.match(/Cannot find name '(.+?)'/);
        if (match) {
          const unknownName = match[1];
          if (!fileUnknownNames.has(filePath)) {
            fileUnknownNames.set(filePath, new Set());
          }
          fileUnknownNames.get(filePath).add(unknownName);
        }
      }
    }
  });

  return fileUnknownNames;
}

function addImportIfNeeded(filePath, constantName, importPathAlias) {
  let content = fs.readFileSync(filePath, 'utf8');
  const alreadyImported = new RegExp(
    `import\\s*{[^}]*\\b${constantName}\\b[^}]*}\\s*from\\s*["']${importPathAlias}["']`
  ).test(content);
  if (alreadyImported) return false;

  const newImport = `import { ${constantName} } from "${importPathAlias}";\n`;
  content = newImport + content;
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

async function fixMissingConstants(options) {
  const { componentsDir, appDir, constantsFile, importPath, logger } = options;

  const exportedConstants = getExportedConstants(constantsFile);
  if (exportedConstants.size === 0) {
    logger?.info({ constantsFile }, 'fixMissingConstants: no exports found in constants file');
  }

  const componentFiles = fs.existsSync(componentsDir) ? getAllTsFiles(componentsDir) : [];
  const appFiles = fs.existsSync(appDir) ? getAllTsFiles(appDir) : [];
  const allFiles = [...componentFiles, ...appFiles];

  if (allFiles.length === 0) {
    logger?.info('fixMissingConstants: no files to scan');
    return;
  }

  logger?.info({ count: allFiles.length }, 'fixMissingConstants: scanning files');

  const fileUnknownNames = findUnknownNamesInFiles(allFiles);
  let added = 0;

  for (const [filePath, unknownNames] of fileUnknownNames) {
    unknownNames.forEach((name) => {
      if (exportedConstants.has(name)) {
        const didWrite = addImportIfNeeded(filePath, name, importPath);
        if (didWrite) {
          added++;
          logger?.info({ file: path.basename(filePath), name }, 'fixMissingConstants: added import');
        }
      }
    });
  }

  logger?.info({ added }, 'fixMissingConstants: done');
}

async function main() {
  const root = process.cwd();
  const componentsDir = path.join(root, 'src/components');
  const appDir = path.join(root, 'app');
  const constantsFile = path.join(root, 'src/utils/constants.ts');
  const importPath = '@/src/utils/constants';

  await fixMissingConstants({
    componentsDir,
    appDir,
    constantsFile,
    importPath,
    logger: console,
  });
}

main().catch((err) => {
  console.error('fixMissingConstants: error', err);
  process.exitCode = 1;
});


