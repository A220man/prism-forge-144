
/**
 * Tests for inspection-files module.
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve, join } from 'node:path';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  defaultOutDirName,
  getOutputDir,
  cleanOutputDir,
  ensureOutputDir,
  getScreenshotPaths,
} from '../lib/inspection-files.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_ROOT = resolve(__dirname, '..', '.test-inspect');
const ORIGINAL_CWD = process.cwd();

beforeEach(() => {
  // Create isolated test directory
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
  mkdirSync(TEST_ROOT, { recursive: true });
  process.chdir(TEST_ROOT);
});

afterEach(() => {
  process.chdir(ORIGINAL_CWD);
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
});

describe('defaultOutDirName', () => {
  test('derives name from local file path', () => {
    const name = defaultOutDirName('pages/about.html', ORIGINAL_CWD);
    assert.strictEqual(name, 'inspect-pages-about');
  });

  test('handles index.html', () => {
    const name = defaultOutDirName('pages/about/index.html', ORIGINAL_CWD);
    assert.strictEqual(name, 'inspect-pages-about');
  });

  test('derives name from URL', () => {
    const name = defaultOutDirName('https://example.com/blog/post', ORIGINAL_CWD);
    assert.ok(name.startsWith('inspect-example.com-blog-post'));
  });

  test('falls back for unknown input', () => {
    const name = defaultOutDirName('weird///input', ORIGINAL_CWD);
    assert.ok(name.startsWith('inspect-'));
  });
});

describe('getOutputDir', () => {
  test('uses custom out dir when provided', () => {
    const dir = getOutputDir('page.html', 'custom-out', ORIGINAL_CWD);
    assert.ok(dir.endsWith('.taste-skill/custom-out'));
  });

  test('derives from target when no custom out', () => {
    const dir = getOutputDir('pages/about.html', undefined, ORIGINAL_CWD);
    assert.ok(dir.endsWith('.taste-skill/inspect-pages-about'));
  });

  test('creates .taste-skill base directory', () => {
    getOutputDir('page.html', undefined, ORIGINAL_CWD);
    assert.ok(existsSync(join(ORIGINAL_CWD, '.taste-skill')));
  });
});

describe('cleanOutputDir', () => {
  test('creates directory if not exists', () => {
    const dir = join(TEST_ROOT, 'new-dir');
    cleanOutputDir(dir);
    assert.ok(existsSync(dir));
  });

  test('removes existing files', async () => {
    const dir = join(TEST_ROOT, 'clean-test');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'test.txt'), 'hello');
    cleanOutputDir(dir);
    assert.ok(existsSync(dir));
    // Directory should be empty
    const { readdirSync } = await import('node:fs');
    assert.strictEqual(readdirSync(dir).length, 0);
  });
});

describe('ensureOutputDir', () => {
  test('creates directory if not exists', () => {
    const dir = join(TEST_ROOT, 'ensure-test');
    ensureOutputDir(dir);
    assert.ok(existsSync(dir));
  });

  test('does not error if exists', () => {
    const dir = join(TEST_ROOT, 'ensure-test2');
    mkdirSync(dir, { recursive: true });
    ensureOutputDir(dir);
    assert.ok(existsSync(dir));
  });
});

describe('getScreenshotPaths', () => {
  test('returns fold and full paths with width prefix', () => {
    const paths = getScreenshotPaths('/tmp/out', 1440);
    assert.strictEqual(paths.fold, '/tmp/out/w1440-fold.jpg');
    assert.strictEqual(paths.full, '/tmp/out/w1440-full.jpg');
  });

  test('works with different widths', () => {
    const paths = getScreenshotPaths('/tmp/out', 375);
    assert.strictEqual(paths.fold, '/tmp/out/w375-fold.jpg');
    assert.strictEqual(paths.full, '/tmp/out/w375-full.jpg');
  });
});
