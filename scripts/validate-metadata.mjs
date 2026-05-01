import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const ACTIVE_PACKAGES = [
  {
    name: '@seekjs/extractor',
    role: 'library',
    dir: 'packages/extractor',
    requiredKeys: ['name', 'version', 'type', 'exports', 'types', 'files'],
  },
  {
    name: '@seekjs/cli',
    role: 'cli',
    dir: 'packages/cli',
    requiredKeys: ['name', 'version', 'type', 'bin', 'files'],
  },
];

export function getValueByPath(source, keyPath) {
  return keyPath.reduce((value, key) => (value == null ? undefined : value[key]), source);
}

export async function validatePackage(pkgConfig, options = {}) {
  const errors = [];
  const rootDir = options.rootDir ?? ROOT_DIR;
  const packageRoot = path.resolve(rootDir, pkgConfig.dir);
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

  const filesField = packageJson.files;
  if (!Array.isArray(filesField) || !filesField.includes('dist')) {
    errors.push('files must include "dist" for active publish package');
  }

  if (pkgConfig.role === 'library') {
    const importTarget = getValueByPath(packageJson, ['exports', '.', 'import']);
    const typesTarget = getValueByPath(packageJson, ['exports', '.', 'types']);
    const rootTypes = getValueByPath(packageJson, ['types']);

    if (typeof importTarget !== 'string' || importTarget.trim() === '') {
      errors.push('exports["."].import is required for active library package');
    }

    if (typeof typesTarget !== 'string' || typesTarget.trim() === '') {
      errors.push('exports["."].types is required for active library package');
    }

    if (typeof rootTypes !== 'string' || rootTypes.trim() === '') {
      errors.push('types is required for active library package');
    }
  }

  if (pkgConfig.role === 'cli') {
    const binPath = getValueByPath(packageJson, ['bin', 'seek']);
    if (typeof binPath === 'string' && binPath.trim() !== '') {
      const resolvedBinPath = path.resolve(packageRoot, binPath);
      const cliFile = await readFile(resolvedBinPath, 'utf8').catch(() => null);
      if (cliFile == null) {
        errors.push(`bin.seek target not found (${binPath})`);
      } else if (!cliFile.startsWith('#!/usr/bin/env node')) {
        errors.push(`bin.seek target missing shebang (${binPath})`);
      }
    } else {
      errors.push('bin.seek is required for active CLI package');
    }
  }

  return errors;
}

export async function collectValidationErrors(options = {}) {
  const allErrors = [];
  const packageConfigs = options.packageConfigs ?? ACTIVE_PACKAGES;

  for (const pkgConfig of packageConfigs) {
    const errors = await validatePackage(pkgConfig, options);
    for (const err of errors) {
      allErrors.push(`${pkgConfig.name}: ${err}`);
    }
  }

  return allErrors;
}

export async function main() {
  const allErrors = await collectValidationErrors();

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
