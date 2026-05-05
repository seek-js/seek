import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validatePackage } from '../../../scripts/validate-metadata.mjs';

const tmpDirs: string[] = [];

afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function createTempWorkspace() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'seek-metadata-'));
  tmpDirs.push(rootDir);
  return rootDir;
}

async function writePackageJson(packageDir: string, content: object) {
  await mkdir(packageDir, { recursive: true });
  await writeFile(path.join(packageDir, 'package.json'), `${JSON.stringify(content, null, 2)}\n`);
}

const extractorConfig = {
  name: '@seekjs/extractor',
  role: 'library',
  dir: 'packages/extractor',
  requiredKeys: ['name', 'version', 'type', 'exports', 'types', 'files'],
} as const;

describe('validatePackage (extractor)', () => {
  test('passes for valid library metadata', async () => {
    const rootDir = await createTempWorkspace();
    const packageDir = path.join(rootDir, 'packages/extractor');

    await writePackageJson(packageDir, {
      name: '@seekjs/extractor',
      version: '0.0.0',
      type: 'module',
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts',
        },
      },
      types: './dist/index.d.ts',
      files: ['dist'],
    });

    const errors = await validatePackage(extractorConfig, { rootDir });

    expect(errors).toEqual([]);
  });

  test('fails when required key is missing', async () => {
    const rootDir = await createTempWorkspace();
    const packageDir = path.join(rootDir, 'packages/extractor');

    await writePackageJson(packageDir, {
      name: '@seekjs/extractor',
      version: '0.0.0',
      type: 'module',
      types: './dist/index.d.ts',
      files: ['dist'],
    });

    const errors = await validatePackage(extractorConfig, { rootDir });

    expect(errors).toContain('missing required key "exports"');
  });

  test('fails when files field omits dist', async () => {
    const rootDir = await createTempWorkspace();
    const packageDir = path.join(rootDir, 'packages/extractor');

    await writePackageJson(packageDir, {
      name: '@seekjs/extractor',
      version: '0.0.0',
      type: 'module',
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts',
        },
      },
      types: './dist/index.d.ts',
      files: ['src'],
    });

    const errors = await validatePackage(extractorConfig, { rootDir });

    expect(errors).toContain('files must include "dist" for active publish package');
  });

  test('fails when package.json is missing', async () => {
    const rootDir = await createTempWorkspace();

    const errors = await validatePackage(extractorConfig, { rootDir });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('unable to read or parse package.json at');
  });

  test('fails when package.json contains invalid JSON', async () => {
    const rootDir = await createTempWorkspace();
    const packageDir = path.join(rootDir, 'packages/extractor');
    await mkdir(packageDir, { recursive: true });
    await writeFile(path.join(packageDir, 'package.json'), '{"name": "@seekjs/extractor",');

    const errors = await validatePackage(extractorConfig, { rootDir });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('unable to read or parse package.json at');
  });
});
