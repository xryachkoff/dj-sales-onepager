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
