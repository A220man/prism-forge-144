
/**
 * Design rule probes for inspecting web pages.
 * Runs in the browser context via Playwright.
 */

const PROBES = [];

/**
 * Register a probe function.
 * @param {string} name - Probe name (e.g., 'eyebrow')
 * @param {Function} fn - Async function(page, options) returning findings array
 */
export function registerProbe(name, fn) {
  PROBES.push({ name, fn });
}

/**
 * Get all registered probes.
 * @returns {Array<{name: string, fn: Function}>}
 */
export function getProbes() {
  return PROBES;
}

/**
 * Run all probes on a page.
 * @param {import('playwright').Page} page - Playwright page
 * @param {object} options - Probe options
 * @returns {Promise<Array<{probe: string, findings: any[]}>>}
 */
export async function runProbes(page, options = {}) {
  const results = [];
  for (const { name, fn } of PROBES) {
    if (options.allow?.includes(name)) continue;
    try {
      const findings = await fn(page, options);
      if (findings?.length) {
        results.push({ probe: name, findings });
      }
    } catch (err) {
      console.error(`[${name}] Probe error:`, err.message);
    }
  }
  return results;
}

/**
 * Color contrast probe: detects text with insufficient contrast against background.
 * Checks WCAG AA (4.5:1 normal, 3:1 large) and AAA (7:1 normal, 4.5:1 large).
 */
registerProbe('color-contrast', async (page) => {
  return await page.evaluate(() => {
    const findings = [];
    const elements = document.querySelectorAll('p, span, a, li, td, th, h1, h2, h3, h4, h5, h6, button, label, input, textarea, select, option');

    /**
     * Get computed background color, walking up the DOM tree.
     * Returns null if transparent or can't be determined.
     */
    function getBackgroundColor(el) {
      let current = el;
      while (current) {
        const style = getComputedStyle(current);
        const bg = style.backgroundColor;
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
          return parseColor(bg);
        }
        current = current.parentElement;
      }
      return null;
    }

    /**
     * Parse CSS color string to RGBA object.
     * Supports rgb(), rgba(), #hex, #hexa, and named colors (basic).
     */
    function parseColor(str) {
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.fillStyle = str;
      const computed = ctx.fillStyle;
      if (computed.startsWith('#')) {
        const hex = computed.slice(1);
        if (hex.length === 3 || hex.length === 4) {
          const r = parseInt(hex[0] + hex[0], 16);
          const g = parseInt(hex[1] + hex[1], 16);
          const b = parseInt(hex[2] + hex[2], 16);
          const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
          return { r, g, b, a };
        }
        if (hex.length === 6 || hex.length === 8) {
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
          return { r, g, b, a };
        }
      }
      const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3]),
          a: match[4] ? parseFloat(match[4]) : 1,
        };
      }
      return null;
    }

    /**
     * Calculate relative luminance per WCAG.
     */
    function luminance({ r, g, b }) {
      const srgb = [r, g, b].map(v => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    }

    /**
     * Calculate contrast ratio between two colors.
     */
    function contrastRatio(fg, bg) {
      const l1 = luminance(fg);
      const l2 = luminance(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    /**
     * Determine if text is "large" per WCAG (18pt+ or 14pt+ bold).
     * 1pt = 1.333px, so 18pt = 24px, 14pt = ~18.67px.
     */
    function isLargeText(fontSize, fontWeight) {
      const weight = typeof fontWeight === 'string' ? parseInt(fontWeight) : fontWeight;
      return fontSize >= 24 || (fontSize >= 18.67 && weight >= 600);
    }

    for (const el of elements) {
      const style = getComputedStyle(el);
      const color = parseColor(style.color);
      const bgColor = getBackgroundColor(el);
      const fontSize = parseFloat(style.fontSize);
      const fontWeight = style.fontWeight;

      if (!color || !bgColor) continue;

      // Handle alpha blending for foreground
      if (color.a < 1) {
        // Blend with background
        color.r = Math.round(color.r * color.a + bgColor.r * (1 - color.a));
        color.g = Math.round(color.g * color.a + bgColor.g * (1 - color.a));
        color.b = Math.round(color.b * color.a + bgColor.b * (1 - color.a));
        color.a = 1;
      }

      const ratio = contrastRatio(color, bgColor);
      const largeText = isLargeText(fontSize, fontWeight);

      // WCAG AA: 4.5:1 normal, 3:1 large
      // WCAG AAA: 7:1 normal, 4.5:1 large
      const aaThreshold = largeText ? 3 : 4.5;
      const aaaThreshold = largeText ? 4.5 : 7;

      let level = null;
      if (ratio < aaThreshold) {
        level = 'AA';
      } else if (ratio < aaaThreshold) {
        level = 'AAA';
      }

      if (level) {
        findings.push({
          text: el.textContent.trim().slice(0, 60),
          tagName: el.tagName.toLowerCase(),
          fontSize: Math.round(fontSize),
          fontWeight: fontWeight,
          contrastRatio: Math.round(ratio * 100) / 100,
          requiredAA: aaThreshold,
          requiredAAA: aaaThreshold,
          level,
        });
      }
    }

    return findings;
  });
});

/**
 * Eyebrow/kicker probe: detects small labels sitting above headings.
 * Skips text inside <figcaption> and text inside scrolling/clipping containers.
 */
registerProbe('eyebrow', async (page) => {
  return await page.evaluate(() => {
    const findings = [];
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

    for (const heading of headings) {
      const headingRect = heading.getBoundingClientRect();
      const headingStyle = getComputedStyle(heading);
      const headingFontSize = parseFloat(headingStyle.fontSize);

      // Look for text nodes above the heading within ~72-140px
      const searchTop = headingRect.top - 140;
      const searchBottom = headingRect.top - 20;

      // Walk previous siblings and their descendants
      let node = heading.previousSibling;
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (text && text.length < 80) {
            const range = document.createRange();
            range.selectNode(node);
            const rect = range.getBoundingClientRect();

            if (
              rect.bottom >= searchTop &&
              rect.top <= searchBottom &&
              rect.width > 0
            ) {
              const style = getComputedStyle(node.parentElement);
              const fontSize = parseFloat(style.fontSize);
              if (fontSize <= 18 && fontSize < headingFontSize * 0.6) {
                // Check if inside figcaption
                let inFigcaption = false;
                let el = node.parentElement;
                while (el) {
                  if (el.tagName === 'FIGCAPTION') {
                    inFigcaption = true;
                    break;
                  }
                  el = el.parentElement;
                }
                if (inFigcaption) continue;

                // Check if inside scrolling/clipping container
                let inScrollContainer = false;
                el = node.parentElement;
                while (el) {
                  const style = getComputedStyle(el);
                  const overflow = style.overflow;
                  const overflowX = style.overflowX;
                  const overflowY = style.overflowY;

                  const scrolls =
                    (el.scrollHeight > el.clientHeight &&
                      (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll')) ||
                    (el.scrollWidth > el.clientWidth &&
                      (overflow === 'auto' || overflow === 'scroll' || overflowX === 'auto' || overflowX === 'scroll'));

                  if (scrolls) {
                    inScrollContainer = true;
                    break;
                  }
                  el = el.parentElement;
                }
                if (inScrollContainer) continue;

                findings.push({
                  text: text.slice(0, 60),
                  fontSize: Math.round(fontSize),
                  above: heading.tagName.toLowerCase(),
                  headingText: heading.textContent.trim().slice(0, 60),
                });
              }
            }
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Recurse into element for text nodes
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          let textNode;
          while ((textNode = walker.nextNode())) {
            const text = textNode.textContent.trim();
            if (text && text.length < 80) {
              const range = document.createRange();
              range.selectNode(textNode);
              const rect = range.getBoundingClientRect();

              if (
                rect.bottom >= searchTop &&
                rect.top <= searchBottom &&
                rect.width > 0
              ) {
                const style = getComputedStyle(textNode.parentElement);
                const fontSize = parseFloat(style.fontSize);
                if (fontSize <= 18 && fontSize < headingFontSize * 0.6) {
                  // Check figcaption
                  let inFigcaption = false;
                  let el = textNode.parentElement;
                  while (el) {
                    if (el.tagName === 'FIGCAPTION') {
                      inFigcaption = true;
                      break;
                    }
                    el = el.parentElement;
                  }
                  if (inFigcaption) continue;

                  // Check scroll container
                  let inScrollContainer = false;
                  el = textNode.parentElement;
                  while (el) {
                    const style = getComputedStyle(el);
                    const overflow = style.overflow;
                    const overflowX = style.overflowX;
                    const overflowY = style.overflowY;

                    const scrolls =
                      (el.scrollHeight > el.clientHeight &&
                        (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll')) ||
                      (el.scrollWidth > el.clientWidth &&
                        (overflow === 'auto' || overflow === 'scroll' || overflowX === 'auto' || overflowX === 'scroll'));

                    if (scrolls) {
                      inScrollContainer = true;
                      break;
                    }
                    el = el.parentElement;
                  }
                  if (inScrollContainer) continue;

                  findings.push({
                    text: text.slice(0, 60),
                    fontSize: Math.round(fontSize),
                    above: heading.tagName.toLowerCase(),
                    headingText: heading.textContent.trim().slice(0, 60),
                  });
                }
              }
            }
          }
        }
        node = node.previousSibling;
      }
    }

    return findings;
  });
});
