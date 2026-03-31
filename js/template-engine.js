/**
 * Template Engine — replaces {{placeholders}} in HTML template with values.
 */

/**
 * Fill all {{key}} placeholders in the template with values from the vals object.
 * @param {string} templateHtml - HTML string with {{placeholders}}
 * @param {Object} vals - key-value map of placeholder values
 * @returns {string} filled HTML
 */
export function fillTemplate(templateHtml, vals) {
  let output = templateHtml;
  for (const [key, value] of Object.entries(vals)) {
    const placeholder = '{{' + key + '}}';
    while (output.includes(placeholder)) {
      output = output.replace(placeholder, String(value));
    }
  }
  return output;
}

/**
 * Remove any remaining {{...}} placeholders (for missing optional data).
 * Returns the cleaned HTML and a list of removed placeholder names.
 * @param {string} html
 * @returns {{ html: string, removed: string[] }}
 */
export function cleanUnfilledPlaceholders(html) {
  const removed = [];
  const cleaned = html.replace(/\{\{([^}]+)\}\}/g, (match, name) => {
    // Keep resource placeholders
    if (['FONT_CSS', 'FA_CSS', 'ECHARTS_SRC', 'CHART_SCRIPTS'].includes(name)) {
      return match;
    }
    removed.push(name);
    return '';
  });
  if (removed.length > 0) {
    console.warn('Unfilled placeholders removed:', [...new Set(removed)]);
  }
  return { html: cleaned, removed };
}

/**
 * Inject resource paths into template (local or CDN).
 * @param {string} html - template HTML
 * @param {'local'|'cdn'} mode - 'local' for app, 'cdn' for export
 * @returns {string}
 */
export function injectResources(html, mode = 'local') {
  if (mode === 'local') {
    html = html.replace('{{FONT_CSS}}',
      '<link rel="stylesheet" href="vendor/fonts/onest.css">');
    html = html.replace('{{FA_CSS}}',
      '<link rel="stylesheet" href="vendor/fontawesome/css/all.min.css">');
    html = html.replace('{{ECHARTS_SRC}}',
      '<script src="vendor/echarts.min.js"><\/script>');
  } else {
    html = html.replace('{{FONT_CSS}}',
      '<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400;600;700;800&display=swap" rel="stylesheet">');
    html = html.replace('{{FA_CSS}}',
      '<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">');
    html = html.replace('{{ECHARTS_SRC}}',
      '<script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"><\/script>');
  }
  return html;
}

// ==================== INLINE RESOURCES FOR SELF-CONTAINED EXPORT ====================

/** Convert an ArrayBuffer to a base64 string */
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Fetch a file and return its base64-encoded content.
 */
async function fetchBase64(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  const buffer = await response.arrayBuffer();
  return bufferToBase64(buffer);
}

/**
 * Fetch a text file.
 */
async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

/**
 * Build self-contained inline CSS for Onest font with embedded woff2 files.
 * Fetches onest.css and all woff2 files, replaces url() references with data URIs.
 */
async function buildInlineFontCSS() {
  const cssText = await fetchText('vendor/fonts/onest.css');

  // Find all woff2 references and replace with base64 data URIs
  const woff2Refs = [...cssText.matchAll(/url\(([^)]+\.woff2)\)/g)];
  const uniqueFiles = [...new Set(woff2Refs.map(m => m[1]))];

  // Fetch all woff2 files in parallel
  const base64Map = {};
  await Promise.all(uniqueFiles.map(async (filename) => {
    base64Map[filename] = await fetchBase64(`vendor/fonts/${filename}`);
  }));

  // Replace url(filename.woff2) with url(data:font/woff2;base64,...)
  let inlineCss = cssText;
  for (const [filename, b64] of Object.entries(base64Map)) {
    inlineCss = inlineCss.split(`url(${filename})`).join(`url(data:font/woff2;base64,${b64})`);
  }

  return `<style>${inlineCss}</style>`;
}

/**
 * Build self-contained inline CSS for Font Awesome with embedded woff2 files.
 * Fetches all.min.css and woff2 files, replaces url() references with data URIs.
 */
async function buildInlineFACss() {
  let cssText = await fetchText('vendor/fontawesome/css/all.min.css');

  // FA CSS references fonts as ../webfonts/fa-*.woff2
  const woff2Refs = [...cssText.matchAll(/url\([^)]*?(fa-[^)]+?\.woff2)[^)]*?\)/g)];
  const uniqueFiles = [...new Set(woff2Refs.map(m => m[1]))];

  // Fetch all woff2 files in parallel
  const base64Map = {};
  await Promise.all(uniqueFiles.map(async (filename) => {
    base64Map[filename] = await fetchBase64(`vendor/fontawesome/webfonts/${filename}`);
  }));

  // Replace url references with data URIs
  for (const [filename, b64] of Object.entries(base64Map)) {
    // Match various url() patterns that reference this file
    const regex = new RegExp(`url\\([^)]*?${filename.replace('.', '\\.')}[^)]*?\\)`, 'g');
    cssText = cssText.replace(regex, `url(data:font/woff2;base64,${b64})`);
  }

  return `<style>${cssText}</style>`;
}

/**
 * Build inline ECharts script tag with the full library embedded.
 */
async function buildInlineECharts() {
  const jsText = await fetchText('vendor/echarts.min.js');
  return `<script>${jsText}<\/script>`;
}

/**
 * Inject all resources inline for a completely self-contained HTML export.
 * Fetches fonts, CSS, and JS, embeds everything as base64/inline.
 * @param {string} html - template HTML with {{FONT_CSS}}, {{FA_CSS}}, {{ECHARTS_SRC}} placeholders
 * @returns {Promise<string>} HTML with all resources embedded inline
 */
export async function injectResourcesInline(html) {
  // Fetch all resources in parallel
  const [fontCss, faCss, echartsScript] = await Promise.all([
    buildInlineFontCSS(),
    buildInlineFACss(),
    buildInlineECharts()
  ]);

  html = html.replace('{{FONT_CSS}}', fontCss);
  html = html.replace('{{FA_CSS}}', faCss);
  html = html.replace('{{ECHARTS_SRC}}', echartsScript);

  return html;
}
