/**
 * App.js — Main application module: upload, report generation, export.
 */
import { buildVals } from './data-processor.js';
import { fillTemplate, cleanUnfilledPlaceholders, injectResources, injectResourcesInline } from './template-engine.js';
import { initCharts, generateChartScript } from './chart-builder.js';

// State
let parsedData = null;
let chartInstances = null;
let filledHtml = '';
let chartData = null;
let companyName = '';

// DOM Elements
const uploadView = document.getElementById('uploadView');
const reportView = document.getElementById('reportView');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const dropText = document.getElementById('dropText');
const previewCard = document.getElementById('previewCard');
const previewCompany = document.getElementById('previewCompany');
const previewRivals = document.getElementById('previewRivals');
const generateBtn = document.getElementById('generateBtn');
const errorMsg = document.getElementById('errorMsg');
const reportContainer = document.getElementById('reportContainer');
const reportCompanyName = document.getElementById('reportCompanyName');
const backBtn = document.getElementById('backBtn');
const exportBtn = document.getElementById('exportBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');

// ==================== FILE UPLOAD ====================

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// Click to select
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  if (!file.name.endsWith('.json')) {
    showError('Пожалуйста, выберите .json файл');
    return;
  }

  hideError();

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      // Sanitize NaN values (just in case older format)
      let text = e.target.result;
      text = text.replace(/\bNaN\b/g, 'null');
      parsedData = JSON.parse(text);
      validateData(parsedData);
      showPreview(parsedData);
    } catch (err) {
      showError(`Ошибка чтения файла: ${err.message}`);
      parsedData = null;
      generateBtn.disabled = true;
    }
  };
  reader.readAsText(file);
}

function validateData(data) {
  const required = ['reputation', 'reputation_category', 'ratings', 'rating_all',
                     'vacancy', 'topic', 'hh_stat', 'price'];
  const missing = required.filter(k => !data[k]);
  if (missing.length > 0) {
    throw new Error(`Отсутствуют обязательные данные: ${missing.join(', ')}`);
  }
  if (!data.target_company_id) {
    throw new Error('Отсутствует обязательное поле target_company_id');
  }
  if (!data.reputation.data || !data.reputation.data.employer_id) {
    throw new Error('Отсутствуют данные reputation.data.employer_id');
  }
  if (data.reputation.data.employer_id.indexOf(data.target_company_id) === -1) {
    throw new Error(`target_company_id=${data.target_company_id} не найден в reputation.data.employer_id`);
  }
}

function showPreview(data) {
  const rep = data.reputation.data;
  const targetId = data.target_company_id;
  const targetIdx = rep.employer_id.indexOf(targetId);
  const targetName = data.target_company_name || rep.name[targetIdx];

  // Target company
  previewCompany.textContent = targetName;

  // Rivals — all except target
  previewRivals.innerHTML = '';
  rep.employer_id.forEach((id, i) => {
    if (i === targetIdx) return;
    const isPaying = rep.work[i] === 1;
    const rival = document.createElement('div');
    rival.className = 'preview-rival';
    rival.innerHTML = `
      <span class="preview-rival-name">${rep.name[i]}</span>
      <span class="preview-badge ${isPaying ? 'paying' : 'not-paying'}">
        ${isPaying ? 'Клиент DJ' : 'Не клиент'}
      </span>
    `;
    previewRivals.appendChild(rival);
  });

  // Show card, update drop zone
  previewCard.classList.add('visible');
  dropZone.classList.add('has-file');
  dropText.textContent = `Файл загружен: ${targetName}`;
  generateBtn.disabled = false;
}

// ==================== REPORT GENERATION ====================

generateBtn.addEventListener('click', async () => {
  if (!parsedData) return;

  generateBtn.disabled = true;
  generateBtn.textContent = 'Генерация...';

  try {
    // Fetch template
    const response = await fetch('template/report-template.html');
    if (!response.ok) throw new Error('Не удалось загрузить шаблон');
    let template = await response.text();

    // Build values
    const result = buildVals(parsedData);
    const vals = result.vals;
    chartData = result.chartData;
    companyName = vals.company_name;

    // Fill template
    template = fillTemplate(template, vals);
    const cleaned = cleanUnfilledPlaceholders(template);
    template = cleaned.html;

    // Inject local resources for display
    template = injectResources(template, 'local');

    // Remove chart scripts placeholder (we'll init charts via JS)
    template = template.replace('{{CHART_SCRIPTS}}', '');

    // Store for export
    filledHtml = template;

    // Extract body content for inline display
    const bodyMatch = template.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const styleMatch = template.match(/<style>([\s\S]*?)<\/style>/i);

    if (bodyMatch) {
      // Inject styles + body content
      reportContainer.innerHTML = '';
      if (styleMatch) {
        const styleEl = document.createElement('style');
        styleEl.textContent = styleMatch[1];
        reportContainer.appendChild(styleEl);
      }
      const contentDiv = document.createElement('div');
      contentDiv.innerHTML = bodyMatch[1];
      reportContainer.appendChild(contentDiv);
    }

    // Switch views
    uploadView.style.display = 'none';
    reportView.classList.add('visible');
    reportCompanyName.textContent = companyName;

    // Initialize charts — retry logic is inside initCharts
    if (chartData) {
      chartInstances = initCharts(chartData);
    }

  } catch (err) {
    showError(`Ошибка генерации: ${err.message}`);
    console.error(err);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = 'Сделать отчёт';
  }
});

// ==================== NAVIGATION ====================

backBtn.addEventListener('click', () => {
  // Cleanup charts
  if (chartInstances) {
    chartInstances.charts.forEach(c => c.dispose());
    window.removeEventListener('resize', chartInstances.resizeHandler);
    chartInstances = null;
  }

  reportView.classList.remove('visible');
  reportContainer.innerHTML = '';
  uploadView.style.display = '';
  window.scrollTo(0, 0);
});

// ==================== EXPORT ====================

exportBtn.addEventListener('click', async () => {
  if (!filledHtml || !chartData) return;

  exportBtn.disabled = true;
  exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Сборка...';

  try {
    // Re-fetch template and fill
    const response = await fetch('template/report-template.html');
    if (!response.ok) throw new Error('Не удалось загрузить шаблон');
    let template = await response.text();

    const result = buildVals(parsedData);
    const vals = result.vals;

    template = fillTemplate(template, vals);
    const cleaned = cleanUnfilledPlaceholders(template);
    template = cleaned.html;

    // Embed all resources inline (fonts, CSS, JS — fully self-contained)
    template = await injectResourcesInline(template);

    // Inject chart scripts
    const chartScript = generateChartScript(chartData);
    template = template.replace('{{CHART_SCRIPTS}}', chartScript);

    // Download
    const blob = new Blob([template], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName} - Sales One Pager.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export error:', err);
    alert('Ошибка при экспорте: ' + err.message);
  } finally {
    exportBtn.disabled = false;
    exportBtn.innerHTML = '<i class="fas fa-download" style="margin-right:6px;"></i>Скачать HTML';
  }
});

// ==================== PDF EXPORT ====================

exportPdfBtn.addEventListener('click', async () => {
  if (!filledHtml || !chartData) return;

  exportPdfBtn.disabled = true;
  exportPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Сборка PDF...';

  try {
    // Re-fetch template and fill
    const response = await fetch('template/report-template.html');
    if (!response.ok) throw new Error('Не удалось загрузить шаблон');
    let template = await response.text();

    const result = buildVals(parsedData);
    const vals = result.vals;

    template = fillTemplate(template, vals);
    const cleaned = cleanUnfilledPlaceholders(template);
    template = cleaned.html;

    // Embed all resources inline
    template = await injectResourcesInline(template);

    // Inject chart scripts with light theme colors
    const chartScript = generateChartScript(chartData, true);
    template = template.replace('{{CHART_SCRIPTS}}', chartScript);

    // Add light-theme class to body
    template = template.replace('<body>', '<body class="light-theme">');

    // Open in new window and trigger print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(template);
    printWindow.document.close();
    printWindow.document.title = `${companyName} - Sales One Pager`;

    // Wait for charts to render, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 1500);
    };
  } catch (err) {
    console.error('PDF export error:', err);
    alert('Ошибка при экспорте PDF: ' + err.message);
  } finally {
    exportPdfBtn.disabled = false;
    exportPdfBtn.innerHTML = '<i class="fas fa-file-pdf" style="margin-right:6px;"></i>Скачать PDF';
  }
});

// ==================== HELPERS ====================

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('visible');
}

function hideError() {
  errorMsg.classList.remove('visible');
}
