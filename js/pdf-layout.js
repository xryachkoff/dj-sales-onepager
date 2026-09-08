/**
 * PDF layout helpers — DOM transforms applied only to the print/PDF variant.
 */

/**
 * Expand collapsed "Ключевые инсайты" blocks.
 * On screen they start collapsed to cut visual noise, but a PDF is a static
 * snapshot — a closed <details> prints as a bare header and the AI analysis
 * would be lost entirely.
 */
function expandAiConclusions(doc) {
  doc.querySelectorAll('.ai-conclusion details').forEach(d => {
    d.setAttribute('open', '');
    // заголовку возвращаем нижний отступ: на экране он обнулён, пока блок свёрнут
    const header = d.querySelector('.ai-conclusion-header');
    if (header) header.style.marginBottom = '14px';
    // стрелка-переключатель в печати бессмысленна
    const icon = d.querySelector('.ai-toggle-icon');
    if (icon) icon.style.display = 'none';
  });
}

/**
 * Convert .data-table (CSS Grid rows) into real <table> markup.
 * Print engines collapse `display:grid` unpredictably — the competitor table
 * came out as one narrow column with the other cells missing. Real tables are
 * the only layout print handles reliably, so column widths are carried over
 * from grid-template-columns into a <colgroup>.
 */
function convertDataTablesToTables(doc) {
  doc.querySelectorAll('.data-table').forEach(container => {
    const rows = [...container.querySelectorAll('.data-row')];
    if (!rows.length) return;

    // ширины колонок: сначала пробуем inline grid-template-columns, иначе
    // повторяем дефолт из CSS — первая колонка вдвое шире остальных
    const cellCount = Math.max(...rows.map(r => r.querySelectorAll('.data-cell').length));
    let weights = null;
    for (const r of rows) {
      const tpl = r.style.gridTemplateColumns;
      if (tpl && tpl.includes('fr')) {
        const parsed = tpl.split(/\s+/).map(t => parseFloat(t)).filter(n => !isNaN(n));
        if (parsed.length === cellCount) { weights = parsed; break; }
      }
    }
    if (!weights) weights = Array.from({ length: cellCount }, (_, i) => (i === 0 ? 2 : 1));
    const total = weights.reduce((a, b) => a + b, 0);

    const table = doc.createElement('table');
    table.className = container.className;
    table.style.cssText = 'width:100%;border-collapse:collapse;table-layout:fixed;';

    const colgroup = doc.createElement('colgroup');
    weights.forEach(w => {
      const col = doc.createElement('col');
      col.style.width = (w / total * 100).toFixed(2) + '%';
      colgroup.appendChild(col);
    });
    table.appendChild(colgroup);

    rows.forEach(row => {
      const tr = doc.createElement('tr');
      tr.className = row.className;
      // inline display побеждает .data-row{display:grid} из таблицы стилей
      tr.style.cssText = 'display:table-row;';
      [...row.querySelectorAll('.data-cell')].forEach((cell, i) => {
        const td = doc.createElement('td');
        td.className = cell.className;
        // padding переносим на ячейку: на <tr> он не действует
        td.style.cssText = 'display:table-cell;vertical-align:middle;padding:6px 8px;'
                         + (i === 0 ? 'text-align:left;' : 'text-align:center;');
        while (cell.firstChild) td.appendChild(cell.firstChild);
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    container.replaceWith(table);
  });
}

/**
 * Convert .card-grid containers to HTML <table> layout for reliable PDF printing.
 * CSS Grid/Flex/inline-block all fail in browser print engines.
 * HTML tables are the only universally reliable multi-column layout in print.
 */
export function convertGridsToTables(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  expandAiConclusions(doc);
  convertDataTablesToTables(doc);

  // Process .card-grid (card-grid-3, card-grid-4, card-grid-2)
  doc.querySelectorAll('.card-grid').forEach(grid => {
    const cols = grid.classList.contains('card-grid-4') ? 4
               : grid.classList.contains('card-grid-3') ? 3
               : grid.classList.contains('card-grid-2') ? 2 : 3;
    const children = Array.from(grid.children).filter(el => el.style.display !== 'none');
    const table = doc.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:separate;border-spacing:6px;table-layout:fixed;';
    for (let i = 0; i < children.length; i += cols) {
      const tr = doc.createElement('tr');
      for (let j = 0; j < cols; j++) {
        const td = doc.createElement('td');
        td.style.cssText = 'vertical-align:top;padding:0;';
        if (i + j < children.length) {
          td.appendChild(children[i + j]);
        }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    grid.replaceWith(table);
  });

  // Process .position-cards-grid
  doc.querySelectorAll('.position-cards-grid').forEach(grid => {
    const children = Array.from(grid.children).filter(el => el.style.display !== 'none');
    const table = doc.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:separate;border-spacing:6px;table-layout:fixed;';
    for (let i = 0; i < children.length; i += 3) {
      const tr = doc.createElement('tr');
      for (let j = 0; j < 3; j++) {
        const td = doc.createElement('td');
        td.style.cssText = 'vertical-align:top;padding:0;';
        if (i + j < children.length) td.appendChild(children[i + j]);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    grid.replaceWith(table);
  });

  // Process .summary-grid
  doc.querySelectorAll('.summary-grid').forEach(grid => {
    const children = Array.from(grid.children);
    const table = doc.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:separate;border-spacing:6px;table-layout:fixed;';
    for (let i = 0; i < children.length; i += 2) {
      const tr = doc.createElement('tr');
      for (let j = 0; j < 2; j++) {
        const td = doc.createElement('td');
        td.style.cssText = 'vertical-align:top;padding:0;';
        if (i + j < children.length) td.appendChild(children[i + j]);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    grid.replaceWith(table);
  });

  return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
}

/**
 * Prepare the "poster" PDF variant: one page sized to the content, dark theme
 * exactly as on screen, every collapsed block expanded.
 *
 * Everything lives inside the document itself so the same HTML prints
 * identically from the prod window (window.print → «Сохранить как PDF») and
 * from headless Chrome in the bulk script. The page size has to be set via
 * CSS @page: the template's `@page { size: A4 landscape }` would otherwise
 * flip any size passed to the print API into landscape and paginate again.
 *
 * Handshake: the document sets `window.__posterReady = true` once the blocks
 * are open, the charts are drawn and @page is set — callers wait for it.
 */
const POSTER_WIDTH = 1440;       // px — фиксируем ширину, чтобы экранная раскладка
                                 // совпадала с печатной при любом размере окна
const POSTER_MAX_HEIGHT = 18500; // px ≈ 193 дюйма; лимит PDF — 200 дюймов на лист
const POSTER_SLACK = 8;          // px запаса, чтобы округление не выкинуло второй лист

export function preparePosterHtml(html) {
  const style = `
<style id="poster-layout">
  html { background: #050508; }
  html, body { width: ${POSTER_WIDTH}px !important; min-width: ${POSTER_WIDTH}px !important; margin: 0 !important; }
  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  /* секции въезжают через fadeUp — снимок посреди анимации выходит полупрозрачным */
  *, *::before, *::after { animation: none !important; transition: none !important; }
  @media print {
    .slide, .card, .cta-section, .ai-conclusion, .chart-container, .data-table,
    .kpi-card, .tariff-card, .source-card, .result-card, .position-card, .summary-item {
      page-break-after: auto !important; page-break-before: auto !important;
      break-after: auto !important; break-before: auto !important;
      page-break-inside: auto !important; break-inside: auto !important;
    }
  }
</style>`;

  const script = `
<script>
(function () {
  var W = ${POSTER_WIDTH}, MAX_H = ${POSTER_MAX_HEIGHT}, SLACK = ${POSTER_SLACK};
  function chartsReady() {
    var els = document.querySelectorAll('[id^="chart-"]');
    for (var i = 0; i < els.length; i++) {
      if (!els[i].querySelector('svg, canvas')) return false;
    }
    return true;
  }
  function finish() {
    var root = document.documentElement;
    var h = Math.max(root.scrollHeight, document.body.scrollHeight);
    var scale = 1;
    if (h > MAX_H) {                       // слишком длинное полотно — ужимаем целиком
      scale = MAX_H / h;
      root.style.zoom = String(scale);
      h = Math.ceil(h * scale);
    }
    var st = document.createElement('style');
    st.textContent = '@page { size: ' + Math.round(W * scale) + 'px ' + (h + SLACK) + 'px; margin: 0 !important; }';
    // в самый конец документа: стили шаблона лежат в <body>, и правило в <head>
    // проигрывает их @page { size: A4 landscape } по порядку каскада
    (document.body || root).appendChild(st);
    window.__posterHeight = h + SLACK;
    window.__posterScale = scale;
    window.__posterReady = true;
  }
  function start() {
    // раскрываем инсайты и свёрнутый график — toggle запускает его отрисовку
    var ds = document.querySelectorAll('details');
    for (var i = 0; i < ds.length; i++) ds[i].open = true;
    var t0 = Date.now();
    (function poll() {                     // setTimeout, не rAF: в фоне/headless rAF заморожен
      if (chartsReady() || Date.now() - t0 > 10000) { setTimeout(finish, 50); return; }
      setTimeout(poll, 50);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
<\/script>`;

  // Вставляем перед последним </body>: внутри инлайненного ECharts тег может
  // встретиться как строка, поэтому не первый попавшийся.
  const i = html.lastIndexOf('</body>');
  return i === -1 ? html + style + script
                  : html.slice(0, i) + style + script + html.slice(i);
}
