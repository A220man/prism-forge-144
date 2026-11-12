/**
 * Integration tests for inspect CLI
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { rmSync, existsSync } from 'node:fs';
const CLI_PATH = resolve('scripts/inspect.mjs');
const FIXTURE = resolve('tests/fixtures/simple.html');
const FIXTURE_CONTRAST = resolve('tests/fixtures/contrast.html');
const TASTE_SKILL_DIR = resolve('.taste-skill');

function runInspect(args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [CLI_PATH, ...args], {
      cwd: options.cwd || process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...options.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => (stdout += data.toString()));
    proc.stderr.on('data', (data) => (stderr += data.toString()));

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', reject);
  });
}

describe('inspect CLI integration', () => {
  before(() => {
    // Clean up any previous test output
    if (existsSync(TASTE_SKILL_DIR)) {
      rmSync(TASTE_SKILL_DIR, { recursive: true, force: true });
    }
  });

  after(() => {
    // Clean up after tests
    if (existsSync(TASTE_SKILL_DIR)) {
      rmSync(TASTE_SKILL_DIR, { recursive: true, force: true });
    }
  });

  it('inspects local file and detects eyebrow', async () => {
    const result = await runInspect([FIXTURE, '--widths', '1440']);
    assert.strictEqual(result.code, 0);
    assert.ok(result.stdout.includes('[eyebrow] @1440px'));
    assert.ok(result.stdout.includes('Real Kick'));
    assert.ok(result.stdout.includes('.taste-skill/inspect-'));
  });

  it('uses custom output directory with --out', async () => {
    const result = await runInspect([FIXTURE, '--widths', '1440', '--out', 'custom-test-dir']);
    assert.strictEqual(result.code, 0);
    assert.ok(result.stdout.includes('custom-test-dir'));
    assert.ok(existsSync(resolve('.taste-skill/custom-test-dir')));
  });

  it('respects --root flag', async () => {
    const result = await runInspect([FIXTURE, '--widths', '1440', '--root', '/tmp']);
    assert.strictEqual(result.code, 0);
    assert.ok(result.stdout.includes('Serving from: /tmp'));
  });

  it('supports multiple widths', async () => {
    const result = await runInspect([FIXTURE, '--widths', '1440', '375']);
    assert.strictEqual(result.code, 0);
    assert.ok(result.stdout.includes('Testing width: 1440px'));
    assert.ok(result.stdout.includes('Testing width: 375px'));
  });

  it('skips probes with --allow', async () => {
    const result = await runInspect([FIXTURE, '--widths', '1440', '--allow', 'eyebrow']);
    assert.strictEqual(result.code, 0);
    assert.ok(result.stdout.includes('No issues found'));
  });

  it('handles URL target with derived output dir', async () => {
    // Test URL handling - should derive output dir from URL
    const result = await runInspect(['https://example.com', '--widths', '1440']);
    assert.strictEqual(result.code, 0);
    assert.ok(result.stdout.includes('inspect-example.com'));
  });

  it('detects color contrast issues', async () => {
    const result = await runInspect([FIXTURE_CONTRAST, '--widths', '1440']);
    assert.strictEqual(result.code, 0);
    assert.ok(result.stdout.includes('[color-contrast] @1440px'));
    // Should detect failures: fail-aa, fail-aa-large, fail-aaa-only
    assert.ok(result.stdout.includes('fail'));
  });
});
