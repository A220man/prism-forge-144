#!/usr/bin/env node
/**
 * Inspect CLI - Analyze web pages for design quality issues.
 * Captures screenshots and runs design probes.
 */
import { program } from 'commander';
import { resolve, isAbsolute, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFileServer, getServeRoot } from '../lib/server.mjs';
import { getOutputDir, cleanOutputDir, getScreenshotPaths, defaultOutDirName } from '../lib/inspection-files.mjs';
import { runProbes, getProbes } from '../lib/probe.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

program
  .name('inspect')
  .description('Analyze web pages for design quality issues')
  .argument('<target>', 'Local HTML file path or URL to inspect')
  .option('-w, --widths <widths...>', 'Viewport widths to test (default: 1440)', ['1440'])
  .option('-o, --out <dir>', 'Output directory (default: derived from target)')
  .option('-r, --root <dir>', 'Serve root directory for local files (default: auto-detect)')
  .option('--allow <probes...>', 'Probes to allow/skip (default: none)')
  .option('--no-headless', 'Run browser in headed mode')
  .option('--timeout <ms>', 'Page load timeout in ms (default: 30000)', '30000')
  .action(async (target, options) => {
    const widths = options.widths.map(Number);
    const allow = options.allow || [];
    const headless = options.headless !== false;
    const timeout = Number(options.timeout);

    let serverInfo = null;
    let targetUrl = target;

    try {
      // Determine if target is a local file
      const isLocalFile = !target.startsWith('http://') && !target.startsWith('https://');

      if (isLocalFile) {
        const filePath = isAbsolute(target) ? target : resolve(process.cwd(), target);
        const serveRoot = getServeRoot(filePath, options.root);
        console.log(`[inspect] Serving from: ${serveRoot}`);
        serverInfo = await createFileServer(serveRoot);
        // URL path is just the filename since server root is the file's directory
        const fileName = filePath.split('/').pop();
        targetUrl = `${serverInfo.url}/${fileName}`;
        console.log(`[inspect] Serving at: ${targetUrl}`);
      }

      // Setup output directory
      const outDir = getOutputDir(target, options.out);
      console.log(`[inspect] Output directory: ${outDir}`);
      cleanOutputDir(outDir);

      // Launch Playwright
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless });
      const context = await browser.newContext();

      try {
        for (const width of widths) {
          console.log(`\\n[inspect] Testing width: ${width}px`);

          const page = await context.newPage();
          await page.setViewportSize({ width, height: 900 });

          // Navigate and wait for load
          await page.goto(targetUrl, { waitUntil: 'networkidle', timeout });

          // Wait for fonts to load, then brief stabilization
          await page.waitForFunction(() => document.fonts.ready.then(() => true), { timeout: 10000 });
          await page.waitForTimeout(200);

          // Capture screenshots
          const { fold, full } = getScreenshotPaths(outDir, width);
          await page.screenshot({ path: fold, fullPage: false });
          await page.screenshot({ path: full, fullPage: true });

          // Run probes
          const probeResults = await runProbes(page, { allow });

          if (probeResults.length) {
            for (const { probe, findings } of probeResults) {
              console.log(`[${probe}] @${width}px  ${findings.length} finding(s):`);
              for (const f of findings) {
                if (probe === 'eyebrow') {
                  console.log(`  - "${f.text}" (${f.fontSize}px) above <${f.above}> "${f.headingText}"`);
                } else if (probe === 'color-contrast') {
                  console.log(`  - "${f.text}" (${f.fontSize}px, ${f.fontWeight}, ${f.contrastRatio}:1) <${f.tagName}> fails WCAG ${f.level} (need ${f.requiredAA}:1 AA, ${f.requiredAAA}:1 AAA)`);
                }<<<TRUNCATED>>>>>>
                  }
                } else {
                  console.log(`  - ${JSON.stringify(f)}`);
                }
              }
            }
          } else {
            console.log(`[inspect] @${width}px  No issues found`);
          }

          await page.close();
        }
      } finally {
        await browser.close();
      }

      console.log(`\\n[inspect] Done. Results in: ${outDir}`);
    } catch (err) {
      console.error('[inspect] Error:', err.message);
      process.exitCode = 1;
    } finally {
      if (serverInfo) {
        await serverInfo.close();
      }
    }
  });

program.parse();