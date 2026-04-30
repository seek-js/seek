import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ACTIVE_PACKAGES = [
  {
    name: '@seekjs/extractor',
    role: 'library',
    dir: 'packages/extractor',
    requiredKeys: ['name', 'version', 'type', 'exports', 'types', 'files'],
    targets: [
      { keyPath: ['exports', '.', 'import'], kind: 'runtime' },
      { keyPath: ['exports', '.', 'types'], kind: 'types' },
      { keyPath: ['types'], kind: 'types' },
    ],
  },
  {
    name: '@seekjs/cli',
    role: 'cli',
    dir: 'packages/cli',
    requiredKeys: ['name', 'version', 'type', 'bin', 'files'],
    targets: [{ keyPath: ['bin', 'seek'], kind: 'runtime' }],
  },
];

function getValueByPath(source, keyPath) {
  return keyPath.reduce((value, key) => (value == null ? undefined : value[key]), source);
}

function keyPathToString(keyPath) {
  return keyPath.join('.');
}

function assertPathInsidePackage(pkgRoot, targetPath) {
  const rel = path.relative(pkgRoot, targetPath);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function validatePackage(pkgConfig) {
  const errors = [];
  const packageRoot = path.resolve(ROOT_DIR, pkgConfig.dir);
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));

  if (packageJson.name !== pkgConfig.name) {
    errors.push(`name mismatch (expected "${pkgConfig.name}", got "${packageJson.name ?? 'missing'}")`);
  }

  for (const requiredKey of pkgConfig.requiredKeys) {
    if (!(requiredKey in packageJson)) {
      errors.push(`missing required key "${requiredKey}"`);
    }
  }

  for (const target of pkgConfig.targets) {
    const targetValue = getValueByPath(packageJson, target.keyPath);
    const label = keyPathToString(target.keyPath);

    if (typeof targetValue !== 'string' || targetValue.trim() === '') {
      errors.push(`invalid or missing target "${label}"`);
      continue;
    }

    const resolvedTarget = path.resolve(packageRoot, targetValue);
    if (!assertPathInsidePackage(packageRoot, resolvedTarget)) {
      errors.push(`target "${label}" escapes package boundary (${targetValue})`);
      continue;
    }

    if (target.kind === 'runtime' && targetValue.includes('/src/')) {
      errors.push(`runtime target "${label}" points to source path (${targetValue})`);
    }

    if (!(await pathExists(resolvedTarget))) {
      errors.push(`target "${label}" does not exist (${targetValue})`);
    }
  }

  if (pkgConfig.role === 'cli') {
    const binPath = getValueByPath(packageJson, ['bin', 'seek']);
    if (typeof binPath === 'string' && binPath.trim() !== '') {
      const resolvedBinPath = path.resolve(packageRoot, binPath);
      if (await pathExists(resolvedBinPath)) {
        const cliFile = await readFile(resolvedBinPath, 'utf8');
        if (!cliFile.startsWith('#!/usr/bin/env node')) {
          errors.push(`bin.seek target missing shebang (${binPath})`);
        }
      }
    }
  }

  return errors;
}

async function main() {
  const allErrors = [];

  for (const pkgConfig of ACTIVE_PACKAGES) {
    const errors = await validatePackage(pkgConfig);
    for (const err of errors) {
      allErrors.push(`${pkgConfig.name}: ${err}`);
    }
  }

  if (allErrors.length > 0) {
    console.error('Metadata validation failed:');
    for (const err of allErrors) {
      console.error(`- ${err}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Metadata validation passed for active publish packages.');
}

await main();
