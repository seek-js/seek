import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validatePackage } from '../scripts/validate-metadata.mjs';

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

describe('validatePackage', () => {
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

    const errors = await validatePackage(
      {
        name: '@seekjs/extractor',
        role: 'library',
        dir: 'packages/extractor',
        requiredKeys: ['name', 'version', 'type', 'exports', 'types', 'files'],
      },
      { rootDir },
    );

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

    const errors = await validatePackage(
      {
        name: '@seekjs/extractor',
        role: 'library',
        dir: 'packages/extractor',
        requiredKeys: ['name', 'version', 'type', 'exports', 'types', 'files'],
      },
      { rootDir },
    );

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

    const errors = await validatePackage(
      {
        name: '@seekjs/extractor',
        role: 'library',
        dir: 'packages/extractor',
        requiredKeys: ['name', 'version', 'type', 'exports', 'types', 'files'],
      },
      { rootDir },
    );

    expect(errors).toContain('files must include "dist" for active publish package');
  });

  test('fails when cli bin target missing shebang', async () => {
    const rootDir = await createTempWorkspace();
    const packageDir = path.join(rootDir, 'packages/cli');
    const distDir = path.join(packageDir, 'dist');

    await mkdir(distDir, { recursive: true });
    await writeFile(path.join(distDir, 'cli.js'), "console.log('cli');\n");
    await writePackageJson(packageDir, {
      name: '@seekjs/cli',
      version: '0.0.0',
      type: 'module',
      bin: {
        seek: './dist/cli.js',
      },
      files: ['dist'],
    });

    const errors = await validatePackage(
      {
        name: '@seekjs/cli',
        role: 'cli',
        dir: 'packages/cli',
        requiredKeys: ['name', 'version', 'type', 'bin', 'files'],
      },
      { rootDir },
    );

    expect(errors).toContain('bin.seek target missing shebang (./dist/cli.js)');
  });
});
