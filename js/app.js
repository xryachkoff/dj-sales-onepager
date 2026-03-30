/**
 * App.js — Main application module: upload, report generation, export.
 */
import { buildVals } from './data-processor.js';
import { fillTemplate, cleanUnfilledPlaceholders, injectResources } from './template-engine.js';
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
  if (!data.reputation.data || !data.reputation.data.name || data.reputation.data.name.length < 4) {
    throw new Error('В данных репутации должно быть 4 компании (целевая + 3 конкурента)');
  }
}

function showPreview(data) {
  const rep = data.reputation.data;

  // Target company
  previewCompany.textContent = rep.name[0];

  // Rivals
  previewRivals.innerHTML = '';
  for (let i = 1; i <= 3; i++) {
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
  }

  // Show card, update drop zone
  previewCard.classList.add('visible');
  dropZone.classList.add('has-file');
  dropText.textContent = `Файл загружен: ${rep.name[0]}`;
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

    // Initialize charts
    setTimeout(() => {
      if (chartData) {
        chartInstances = initCharts(chartData);
      }
    }, 100);

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

exportBtn.addEventListener('click', () => {
  if (!filledHtml || !chartData) return;

  // Build export HTML with CDN resources and embedded chart scripts
  let exportHtml = filledHtml;

  // Re-fetch template and fill again with CDN paths for export
  fetch('template/report-template.html')
    .then(r => r.text())
    .then(template => {
      const result = buildVals(parsedData);
      const vals = result.vals;

      template = fillTemplate(template, vals);
      const cleaned = cleanUnfilledPlaceholders(template);
      template = cleaned.html;

      // CDN resources for export
      template = injectResources(template, 'cdn');

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
    })
    .catch(err => {
      console.error('Export error:', err);
      alert('Ошибка при экспорте: ' + err.message);
    });
});

// ==================== HELPERS ====================

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('visible');
}

function hideError() {
  errorMsg.classList.remove('visible');
}
