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

const cliConfig = {
  name: '@seekjs/cli',
  role: 'cli',
  dir: 'packages/cli',
  requiredKeys: ['name', 'version', 'type', 'bin', 'files'],
} as const;

// No publishable library package exists today: `@seekjs/extractor` was removed with the
// retired architecture and `@seekjs/core` is still private. The validator keeps its
// `role: 'library'` branch for the first library that ships, so it is covered here by a
// synthetic fixture rather than by a real package it can drift away from.
const libraryConfig = {
  name: '@seekjs/example-library',
  role: 'library',
  dir: 'packages/example-library',
  requiredKeys: ['name', 'version', 'type', 'exports', 'types', 'files'],
} as const;

function validLibraryManifest() {
  return {
    name: '@seekjs/example-library',
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
  };
}

describe('validatePackage (cli)', () => {
  test('passes for valid cli metadata and executable bin target', async () => {
    const rootDir = await createTempWorkspace();
    const packageDir = path.join(rootDir, 'packages/cli');
    const distDir = path.join(packageDir, 'dist');

    await mkdir(distDir, { recursive: true });
    await writeFile(path.join(distDir, 'cli.js'), "#!/usr/bin/env node\nconsole.log('cli');\n");
    await writePackageJson(packageDir, {
      name: '@seekjs/cli',
      version: '0.0.0',
      type: 'module',
      bin: {
        seek: './dist/cli.js',
      },
      files: ['dist'],
    });

    const errors = await validatePackage(cliConfig, { rootDir });

    expect(errors).toEqual([]);
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

    const errors = await validatePackage(cliConfig, { rootDir });

    expect(errors).toContain('bin.seek target missing shebang (./dist/cli.js)');
  });

  test('fails when cli bin target is missing', async () => {
    const rootDir = await createTempWorkspace();
    const packageDir = path.join(rootDir, 'packages/cli');

    await writePackageJson(packageDir, {
      name: '@seekjs/cli',
      version: '0.0.0',
      type: 'module',
      bin: {
        seek: './dist/cli.js',
      },
      files: ['dist'],
    });

    const errors = await validatePackage(cliConfig, { rootDir });

    expect(errors).toContain('bin.seek target not found (./dist/cli.js)');
  });
});

describe('validatePackage (library)', () => {
  test('passes for valid library metadata', async () => {
    const rootDir = await createTempWorkspace();

    await writePackageJson(path.join(rootDir, libraryConfig.dir), validLibraryManifest());

    const errors = await validatePackage(libraryConfig, { rootDir });

    expect(errors).toEqual([]);
  });

  test('fails when exports import condition is missing', async () => {
    const rootDir = await createTempWorkspace();
    const manifest = { ...validLibraryManifest(), exports: { '.': { types: './dist/index.d.ts' } } };

    await writePackageJson(path.join(rootDir, libraryConfig.dir), manifest);

    const errors = await validatePackage(libraryConfig, { rootDir });

    expect(errors).toContain('exports["."].import is required for active library package');
  });

  test('fails when exports types condition is missing', async () => {
    const rootDir = await createTempWorkspace();
    const manifest = { ...validLibraryManifest(), exports: { '.': { import: './dist/index.js' } } };

    await writePackageJson(path.join(rootDir, libraryConfig.dir), manifest);

    const errors = await validatePackage(libraryConfig, { rootDir });

    expect(errors).toContain('exports["."].types is required for active library package');
  });

  test('fails when root types field is missing', async () => {
    const rootDir = await createTempWorkspace();
    const { types: _types, ...manifest } = validLibraryManifest();

    await writePackageJson(path.join(rootDir, libraryConfig.dir), manifest);

    const errors = await validatePackage(libraryConfig, { rootDir });

    expect(errors).toContain('types is required for active library package');
  });
});

// Role-agnostic contract shared by every active package, exercised through the library
// fixture. These branches lost their only coverage when the extractor package was removed.
describe('validatePackage (shared contract)', () => {
  test('fails when a required key is missing', async () => {
    const rootDir = await createTempWorkspace();
    const { exports: _exports, ...manifest } = validLibraryManifest();

    await writePackageJson(path.join(rootDir, libraryConfig.dir), manifest);

    const errors = await validatePackage(libraryConfig, { rootDir });

    expect(errors).toContain('missing required key "exports"');
  });

  test('fails when files field omits dist', async () => {
    const rootDir = await createTempWorkspace();
    const manifest = { ...validLibraryManifest(), files: ['src'] };

    await writePackageJson(path.join(rootDir, libraryConfig.dir), manifest);

    const errors = await validatePackage(libraryConfig, { rootDir });

    expect(errors).toContain('files must include "dist" for active publish package');
  });

  test('fails when package.json is missing', async () => {
    const rootDir = await createTempWorkspace();

    const errors = await validatePackage(libraryConfig, { rootDir });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('unable to read or parse package.json at');
  });

  test('fails when package.json contains invalid JSON', async () => {
    const rootDir = await createTempWorkspace();
    const packageDir = path.join(rootDir, libraryConfig.dir);

    await mkdir(packageDir, { recursive: true });
    await writeFile(path.join(packageDir, 'package.json'), '{"name": "@seekjs/example-library",');

    const errors = await validatePackage(libraryConfig, { rootDir });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('unable to read or parse package.json at');
  });
});
