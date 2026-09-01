/**
 * PDF layout helpers — DOM transforms applied only to the print/PDF variant.
 */

/**
 * Convert .card-grid containers to HTML <table> layout for reliable PDF printing.
 * CSS Grid/Flex/inline-block all fail in browser print engines.
 * HTML tables are the only universally reliable multi-column layout in print.
 */
export function convertGridsToTables(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

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
