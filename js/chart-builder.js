/**
 * Chart Builder — ECharts configurations for radar, hiring dynamics, and traffic charts.
 */

const colors = {
  blue: '#3B82F6',
  blueBright: '#60A5FA',
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#EF4444',
  text: '#ededf0',
  text2: '#9a9aac',
  text3: '#5a5a6c',
  surface: '#0f0f12',
  grid: 'rgba(255,255,255,0.05)'
};

const baseAxisStyle = {
  axisLine: { lineStyle: { color: colors.grid } },
  axisTick: { show: false },
  axisLabel: { color: colors.text3, fontSize: 11 },
  splitLine: { lineStyle: { color: colors.grid } }
};

/** Safe number — returns 0 for null/NaN */
function safe(n) {
  return (n == null || isNaN(n)) ? 0 : +n;
}

/**
 * Format month string "2025-03-01" or "2025-03" → "2025-03"
 */
function fmtMonth(m) {
  return m.slice(0, 7);
}

/**
 * Build radar chart option for Section 3 (Industry Comparison).
 */
export function buildRadarOption(chartData) {
  const { ratings, ratingAll } = chartData;

  const radarComp = [
    +safe(ratings.total_rating[0]).toFixed(2),
    +safe(ratings.rating_year[0]).toFixed(2),
    +safe(ratings.review_year_pos[0]).toFixed(3),
    +(safe(ratings.reviews_count[0]) / 1000).toFixed(3),
    +safe(ratings.rating_position_one[0]).toFixed(2),
    +safe(ratings.rating_position_two[0]).toFixed(2),
  ];
  const radarInd = [
    +safe(ratings.total_rating[1]).toFixed(2),
    +safe(ratings.rating_year[1]).toFixed(2),
    +safe(ratings.review_year_pos[1]).toFixed(3),
    +(safe(ratings.reviews_count[1]) / 1000).toFixed(3),
    +safe(ratings.rating_position_one[1]).toFixed(2),
    +safe(ratings.rating_position_two[1]).toFixed(2),
  ];

  // Adjust radar max for reviews
  let maxReviewsK = Math.max(radarComp[3], radarInd[3]) * 1.5;
  maxReviewsK = Math.max(maxReviewsK, 5);
  if (maxReviewsK <= 5) maxReviewsK = 5;
  else if (maxReviewsK <= 10) maxReviewsK = 10;
  else if (maxReviewsK <= 20) maxReviewsK = 20;
  else maxReviewsK = Math.ceil(maxReviewsK / 10) * 10;

  return {
    tooltip: {},
    legend: {
      bottom: 8,
      textStyle: { color: colors.text2, fontSize: 11 },
      data: ['Компания', 'Индустрия']
    },
    radar: {
      center: ['50%', '45%'],
      indicator: [
        { name: 'Рейтинг (все)', max: 5 },
        { name: 'Рейтинг (12 мес)', max: 5 },
        { name: 'Доля позитива', max: 1 },
        { name: 'Отзывов (тыс.)', max: maxReviewsK },
        { name: 'Текущие сотр.', max: 5 },
        { name: 'Бывшие сотр.', max: 5 }
      ],
      shape: 'circle',
      splitArea: { areaStyle: { color: ['rgba(59,130,246,0.02)', 'rgba(59,130,246,0.04)'] } },
      axisLine: { lineStyle: { color: colors.grid } },
      splitLine: { lineStyle: { color: colors.grid } },
      axisName: { color: colors.text3, fontSize: 11 }
    },
    series: [{
      type: 'radar',
      data: [
        {
          value: radarComp,
          name: 'Компания',
          lineStyle: { color: colors.blue, width: 2 },
          areaStyle: { color: 'rgba(59,130,246,0.15)' },
          itemStyle: { color: colors.blue }
        },
        {
          value: radarInd,
          name: 'Индустрия',
          lineStyle: { color: colors.amber, width: 2 },
          areaStyle: { color: 'rgba(245,158,11,0.1)' },
          itemStyle: { color: colors.amber }
        }
      ]
    }]
  };
}

/**
 * Build criteria radar chart option — per-criterion ratings breakdown.
 */
export function buildCriteriaRadarOption(chartData) {
  const { ratingAll } = chartData;

  const criteria = [
    { key: 'salary_rating', name: 'Зарплата' },
    { key: 'career_rating', name: 'Карьера' },
    { key: 'managment_rating', name: 'Руководство' },
    { key: 'team_rating', name: 'Команда' },
    { key: 'workplace_rating', name: 'Рабочее место' },
    { key: 'rest_recovery_rating', name: 'Отдых' },
  ];

  const compData = criteria.map(c => +safe(ratingAll[c.key]?.[0]).toFixed(2));
  const indData = criteria.map(c => +safe(ratingAll[c.key]?.[1]).toFixed(2));

  return {
    tooltip: {},
    legend: {
      bottom: 8,
      textStyle: { color: colors.text2, fontSize: 11 },
      data: ['Компания', 'Индустрия']
    },
    radar: {
      center: ['50%', '45%'],
      indicator: criteria.map(c => ({ name: c.name, max: 5 })),
      shape: 'circle',
      splitArea: { areaStyle: { color: ['rgba(59,130,246,0.02)', 'rgba(59,130,246,0.04)'] } },
      axisLine: { lineStyle: { color: colors.grid } },
      splitLine: { lineStyle: { color: colors.grid } },
      axisName: { color: colors.text3, fontSize: 11 }
    },
    series: [{
      type: 'radar',
      data: [
        {
          value: compData,
          name: 'Компания',
          lineStyle: { color: colors.blue, width: 2 },
          areaStyle: { color: 'rgba(59,130,246,0.15)' },
          itemStyle: { color: colors.blue }
        },
        {
          value: indData,
          name: 'Индустрия',
          lineStyle: { color: colors.amber, width: 2 },
          areaStyle: { color: 'rgba(245,158,11,0.1)' },
          itemStyle: { color: colors.amber }
        }
      ]
    }]
  };
}

/**
 * Build hiring dynamics chart option for Section 4.
 */
export function buildHiringOption(chartData) {
  const { vacancy, hh } = chartData;
  const months = vacancy.month_period.map(fmtMonth);
  const companyData = vacancy.vacancy_count.map(v => Math.round(v));
  const indAvg = Math.round(hh.open_vacancies[1]);
  const industryData = months.map(() => indAvg);

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1c1c22',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: colors.text }
    },
    legend: {
      top: 0,
      textStyle: { color: colors.text2, fontSize: 11 },
      data: ['Компания', 'Индустрия (средн.)']
    },
    grid: { top: 40, bottom: 30, left: 50, right: 20 },
    xAxis: { type: 'category', data: months, ...baseAxisStyle },
    yAxis: { type: 'value', ...baseAxisStyle },
    series: [
      {
        name: 'Компания',
        type: 'bar',
        data: companyData,
        itemStyle: { color: colors.blue, borderRadius: [4, 4, 0, 0] },
        barWidth: '35%'
      },
      {
        name: 'Индустрия (средн.)',
        type: 'line',
        data: industryData,
        lineStyle: { color: colors.amber, width: 2, type: 'dashed' },
        itemStyle: { color: colors.amber },
        symbol: 'none',
        smooth: false
      }
    ]
  };
}

/**
 * Build traffic area chart option for Section 5.
 */
export function buildTrafficOption(chartData) {
  const { tyData } = chartData;

  // Sort traffic data by month
  const pairs = tyData.month.map((m, i) => ({
    month: m,
    unique: Math.round(tyData.uniq_clients[i]),
    total: Math.round(tyData.view_cnt[i])
  }));
  pairs.sort((a, b) => a.month.localeCompare(b.month));

  const months = pairs.map(p => fmtMonth(p.month));
  const unique = pairs.map(p => p.unique);
  const total = pairs.map(p => p.total);

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1c1c22',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: colors.text }
    },
    legend: {
      top: 0,
      textStyle: { color: colors.text2, fontSize: 11 },
      data: ['Уникальные', 'Все посещения']
    },
    grid: { top: 40, bottom: 30, left: 50, right: 20 },
    xAxis: { type: 'category', data: months, ...baseAxisStyle },
    yAxis: { type: 'value', ...baseAxisStyle },
    series: [
      {
        name: 'Все посещения',
        type: 'line',
        data: total,
        lineStyle: { color: colors.blue, width: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59,130,246,0.2)' },
              { offset: 1, color: 'rgba(59,130,246,0)' }
            ]
          }
        },
        itemStyle: { color: colors.blue },
        symbol: 'circle',
        symbolSize: 5,
        smooth: true
      },
      {
        name: 'Уникальные',
        type: 'line',
        data: unique,
        lineStyle: { color: colors.green, width: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(34,197,94,0.15)' },
              { offset: 1, color: 'rgba(34,197,94,0)' }
            ]
          }
        },
        itemStyle: { color: colors.green },
        symbol: 'circle',
        symbolSize: 5,
        smooth: true
      }
    ]
  };
}

/**
 * Initialize a single chart with retry logic.
 * Waits until the container has visible dimensions before initializing.
 */
function initChartWithRetry(el, optionBuilder, chartData, charts, maxRetries = 10) {
  let attempts = 0;
  function tryInit() {
    attempts++;
    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
      try {
        const chart = echarts.init(el);
        chart.setOption(optionBuilder(chartData));
        charts.push(chart);
      } catch (e) {
        console.warn('Chart init error:', e);
      }
    } else if (attempts < maxRetries) {
      requestAnimationFrame(tryInit);
    } else {
      console.warn('Chart container not visible after retries:', el.id);
    }
  }
  tryInit();
}

/**
 * Initialize all charts in the DOM after report HTML is injected.
 * Uses retry logic to ensure containers have proper dimensions.
 * Returns chart instances for cleanup.
 */
export function initCharts(chartData) {
  const charts = [];

  const radarEl = document.getElementById('chart-industry-radar');
  if (radarEl) {
    initChartWithRetry(radarEl, buildRadarOption, chartData, charts);
  }

  const criteriaRadarEl = document.getElementById('chart-criteria-radar');
  if (criteriaRadarEl) {
    initChartWithRetry(criteriaRadarEl, buildCriteriaRadarOption, chartData, charts);
  }

  const hiringEl = document.getElementById('chart-hiring-dynamics');
  if (hiringEl) {
    initChartWithRetry(hiringEl, buildHiringOption, chartData, charts);
  }

  const trafficEl = document.getElementById('chart-traffic');
  if (trafficEl && chartData.tyData) {
    initChartWithRetry(trafficEl, buildTrafficOption, chartData, charts);
  }

  // Resize handler
  const resizeHandler = () => charts.forEach(c => c.resize());
  window.addEventListener('resize', resizeHandler);

  return { charts, resizeHandler };
}

/**
 * Generate the chart initialization script for export (self-contained HTML).
 */
export function generateChartScript(chartData, lightTheme = false) {
  const radarOpt = JSON.stringify(buildRadarOption(chartData));
  const criteriaRadarOpt = JSON.stringify(buildCriteriaRadarOption(chartData));
  const hiringOpt = JSON.stringify(buildHiringOption(chartData));

  let trafficInit = '';
  if (chartData.tyData) {
    const trafficOpt = JSON.stringify(buildTrafficOption(chartData));
    trafficInit = `
  var trafficEl = document.getElementById('chart-traffic');
  if (trafficEl) { var c3 = echarts.init(trafficEl); c3.setOption(${trafficOpt}); window.addEventListener('resize', function() { c3.resize(); }); }`;
  }

  // Light theme: patch tooltip and axis colors in the generated script
  const lightPatch = lightTheme ? `
  function patchLight(opt) {
    if (opt.tooltip) { opt.tooltip.backgroundColor = '#ffffff'; opt.tooltip.borderColor = 'rgba(0,0,0,0.1)'; opt.tooltip.textStyle = { color: '#1a1a2e' }; }
    if (opt.legend) { opt.legend.textStyle = { color: '#5a5a6c', fontSize: 11 }; }
    if (opt.xAxis) { opt.xAxis.axisLabel = { color: '#5a5a6c', fontSize: 11 }; opt.xAxis.splitLine = { lineStyle: { color: 'rgba(0,0,0,0.06)' } }; opt.xAxis.axisLine = { lineStyle: { color: 'rgba(0,0,0,0.06)' } }; }
    if (opt.yAxis) { opt.yAxis.axisLabel = { color: '#5a5a6c', fontSize: 11 }; opt.yAxis.splitLine = { lineStyle: { color: 'rgba(0,0,0,0.06)' } }; opt.yAxis.axisLine = { lineStyle: { color: 'rgba(0,0,0,0.06)' } }; }
    if (opt.radar) { opt.radar.axisName = { color: '#5a5a6c' }; opt.radar.splitLine = { lineStyle: { color: 'rgba(0,0,0,0.08)' } }; opt.radar.splitArea = { areaStyle: { color: ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.04)'] } }; }
    return opt;
  }` : '';

  const patchCall = lightTheme ? 'opt = patchLight(opt); ' : '';

  return `
<script>
document.addEventListener('DOMContentLoaded', function() {${lightPatch}
  function initWhenReady(el, opt) {
    if (!el) return;
    ${patchCall}var attempts = 0;
    function tryInit() {
      attempts++;
      if (el.offsetWidth > 0 && el.offsetHeight > 0) {
        var c = echarts.init(el);
        c.setOption(opt);
        window.addEventListener('resize', function() { c.resize(); });
      } else if (attempts < 20) {
        requestAnimationFrame(tryInit);
      }
    }
    tryInit();
  }
  initWhenReady(document.getElementById('chart-industry-radar'), ${radarOpt});
  initWhenReady(document.getElementById('chart-criteria-radar'), ${criteriaRadarOpt});
  initWhenReady(document.getElementById('chart-hiring-dynamics'), ${hiringOpt});${trafficInit}
});
<\/script>`;
}
