/* Quick diagnostics for missing Node type definitions */
import fs from 'node:fs';
import path from 'node:path';

const SERVER_ENDPOINT = 'http://127.0.0.1:7244/ingest/35d58844-0703-4737-9627-a9468d68ea52';
const sessionId = 'debug-session';
const runId = 'pre-fix';

const sendLog = async (hypothesisId, location, message, data = {}) => {
  const payload = {
    sessionId,
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  const fallbackLogPath = path.join(process.cwd(), '.cursor', 'debug.log');
  // #region agent log
  try {
    await fetch(SERVER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    /* ignore network/logging errors */
  }
  try {
    fs.mkdirSync(path.dirname(fallbackLogPath), { recursive: true });
    fs.appendFileSync(fallbackLogPath, `${JSON.stringify(payload)}\n`, 'utf8');
  } catch {
    /* ignore fs/logging errors */
  }
  // #endregion
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const main = async () => {
  const cwd = process.cwd();
  await sendLog('A', 'scripts/node-types-debug.js:38', 'script start', {
    cwd,
    nodeVersion: process.version,
  });

  const pkgPath = path.join(cwd, 'package.json');
  const tsconfigPath = path.join(cwd, 'tsconfig.json');
  const pkg = readJson(pkgPath);
  const tsconfig = readJson(tsconfigPath);

  const pkgNodeTypesVersion =
    pkg?.devDependencies?.['@types/node'] || pkg?.dependencies?.['@types/node'] || null;
  await sendLog('B', 'scripts/node-types-debug.js:49', 'package.json node types', {
    pkgNodeTypesVersion,
  });

  const nodeTypesDir = path.join(cwd, 'node_modules', '@types', 'node');
  const nodeTypesExists = fs.existsSync(nodeTypesDir);
  let installedNodeTypesVersion = null;
  if (nodeTypesExists) {
    try {
      const installedPkg = readJson(path.join(nodeTypesDir, 'package.json'));
      installedNodeTypesVersion = installedPkg.version;
    } catch {
      installedNodeTypesVersion = 'read-error';
    }
  }
  await sendLog('B', 'scripts/node-types-debug.js:64', 'installed node types', {
    nodeTypesExists,
    installedNodeTypesVersion,
  });

  const compilerOptions = tsconfig?.compilerOptions || {};
  await sendLog('C', 'scripts/node-types-debug.js:70', 'tsconfig compilerOptions types', {
    types: compilerOptions.types || null,
    typeRoots: compilerOptions.typeRoots || null,
    moduleResolution: compilerOptions.moduleResolution || null,
  });

  const nodeTypesEntry = Array.isArray(compilerOptions.types)
    ? compilerOptions.types.includes('node')
    : false;
  await sendLog('D', 'scripts/node-types-debug.js:78', 'node types referenced', {
    nodeTypesEntry,
  });
};

main().catch(async (err) => {
  await sendLog('Z', 'scripts/node-types-debug.js:84', 'script error', {
    error: err?.message || String(err),
  });
  process.exitCode = 1;
});
