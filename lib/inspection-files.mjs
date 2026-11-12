
/**
 * Inspection file utilities for managing output directories and screenshots.
 */

import { resolve, dirname, basename, extname, join, isAbsolute } from 'node:path';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// PROJECT_ROOT removed - use cwd parameter instead

/**
 * Derive a default output directory name from the target path or URL.
 * @param {string} target - File path or URL to inspect
 * @param {string} [cwd] - Working directory (default: process.cwd())
 * @returns {string} Default output directory name (without .taste-skill/ prefix)
 */
export function defaultOutDirName(target, cwd = process.cwd()) {
  try {
    // Handle URL
    if (target.startsWith('http://') || target.startsWith('https://')) {
      const url = new URL(target);
      const host = url.hostname.replace(/[^a-z0-9.-]/gi, '-');
      const path = url.pathname
        .replace(/\/index\.html?$/, '')
        .replace(/\.(html?|php|asp|jsp)$/i, '')
        .replace(/[^a-z0-9/_-]/gi, '-')
        .replace(/\/+/g, '-')
        .replace(/^-+|-+$/g, '');
      return `inspect-${host}${path ? '-' + path : '-'}`;
    }

    // Handle local file path
    const PROJECT_ROOT = cwd;
    const resolved = resolve(cwd, target);
    const rel = resolved.startsWith(PROJECT_ROOT + '/')
      ? resolved.slice(PROJECT_ROOT.length + 1)
      : basename(resolved);

    // Remove extension and index.html
    const name = rel
      .replace(/\/index\.html?$/, '')
      .replace(/\.(html?|php|asp|jsp)$/i, '')
      .replace(/[^a-z0-9/_-]/gi, '-')
      .replace(/\/+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `inspect-${name || 'page'}`;
  } catch {
    return 'inspect-page';
  }
}

/**
 * Get the full output directory path.
 * @param {string} target - File path or URL to inspect
 * @param {string} [customOut] - Custom output directory from --out flag
 * @param {string} [cwd] - Working directory (default: process.cwd())
 * @returns {string} Full path to output directory
 */
export function getOutputDir(target, customOut, cwd = process.cwd()) {
  const baseDir = resolve(cwd, '.taste-skill');
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }

  let dirName;
  if (customOut) {
    // If customOut is absolute, use it directly; otherwise resolve under baseDir
    dirName = isAbsolute(customOut) ? customOut : resolve(baseDir, customOut);
  } else {
    dirName = resolve(baseDir, defaultOutDirName(target, cwd));
  }
  return dirName;
}

/**
 * Clean the output directory (remove all files).
 * @param {string} outDir - Output directory path
 */
export function cleanOutputDir(outDir) {
  if (existsSync(outDir)) {
    for (const file of readdirSync(outDir)) {
      rmSync(join(outDir, file), { recursive: true, force: true });
    }
  } else {
    mkdirSync(outDir, { recursive: true });
  }
}

/**
 * Ensure output directory exists.
 * @param {string} outDir - Output directory path
 */
export function ensureOutputDir(outDir) {
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
}

/**
 * Get screenshot paths for a given width.
 * @param {string} outDir - Output directory
 * @param {number} width - Viewport width
 * @returns {object} Paths for fold and full screenshots
 */
export function getScreenshotPaths(outDir, width) {
  const prefix = `w${width}`;
  return {
    fold: join(outDir, `${prefix}-fold.jpg`),
    full: join(outDir, `${prefix}-full.jpg`),
  };
}
