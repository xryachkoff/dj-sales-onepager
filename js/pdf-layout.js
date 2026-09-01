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
