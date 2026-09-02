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
      center: ['50%', '48%'],
      radius: '60%',
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
      center: ['50%', '48%'],
      radius: '60%',
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

// `buildHiringOption` removed (April 2026) — section "Активность найма" was deleted.
// Vacancy dynamics are now shown in the combined Traffic+Vacancy chart in the Traffic section.

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
 * Merge traffic + vacancy data by month key.
 * Returns aligned arrays: months[], views[], vacancies[].
 */
function mergeMonthlyData(tyData, vacancy) {
  const trafficMap = {};
  (tyData.month || []).forEach((m, i) => {
    const v = tyData.view_cnt ? tyData.view_cnt[i] : null;
    if (v != null) trafficMap[fmtMonth(m)] = Math.round(v);
  });

  const vacancyMap = {};
  (vacancy.month_period || []).forEach((m, i) => {
    const v = vacancy.vacancy_count ? vacancy.vacancy_count[i] : null;
    if (v != null) vacancyMap[fmtMonth(m)] = Math.round(v);
  });

  const allMonths = [...new Set([
    ...Object.keys(trafficMap),
    ...Object.keys(vacancyMap)
  ])].sort();

  // Месяцы, которых нет в источнике, отдаём как null, а не 0: диапазоны трафика
  // и вакансий часто не совпадают, и нолик читался бы как «был ноль просмотров»
  // — линия падала в пол и тянулась по оси, будто данные оборвались.
  // null ECharts просто не рисует, поэтому виден реальный период наблюдения.
  const pick = (map, m) => (Object.prototype.hasOwnProperty.call(map, m) ? map[m] : null);

  return {
    months: allMonths,
    views: allMonths.map(m => pick(trafficMap, m)),
    vacancies: allMonths.map(m => pick(vacancyMap, m))
  };
}

/**
 * Build combined traffic + vacancy dual-axis chart.
 * Left Y: traffic (area), Right Y: vacancies (bars).
 */
export function buildTrafficVacancyOption(chartData) {
  const { tyData, vacancy } = chartData;
  const merged = mergeMonthlyData(tyData, vacancy);

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
      data: ['Просмотры', 'Вакансии']
    },
    grid: { top: 45, bottom: 30, left: 55, right: 55 },
    xAxis: { type: 'category', data: merged.months, ...baseAxisStyle },
    yAxis: [
      {
        type: 'value',
        name: 'Просмотры',
        nameTextStyle: { color: colors.text3, fontSize: 11 },
        ...baseAxisStyle
      },
      {
        type: 'value',
        name: 'Вакансии',
        nameTextStyle: { color: colors.text3, fontSize: 11 },
        axisLine: { lineStyle: { color: colors.grid } },
        axisTick: { show: false },
        axisLabel: { color: colors.amber, fontSize: 11 },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'Просмотры',
        type: 'line',
        yAxisIndex: 0,
        data: merged.views,
        lineStyle: { color: colors.blue, width: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59,130,246,0.18)' },
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
        name: 'Вакансии',
        type: 'bar',
        yAxisIndex: 1,
        data: merged.vacancies,
        itemStyle: { color: colors.amber, borderRadius: [3, 3, 0, 0] },
        barWidth: '30%',
        opacity: 0.85
      }
    ]
  };
}

/**
 * Build visits-per-vacancy ratio chart.
 */
export function buildVisitsPerVacancyOption(chartData) {
  const { tyData, vacancy } = chartData;
  const merged = mergeMonthlyData(tyData, vacancy);

  // Соотношение считаем только там, где есть обе величины. Нет трафика или
  // нет вакансий за месяц — точки быть не должно, иначе получится ложный ноль.
  const ratio = merged.months.map((m, i) => {
    const vac = merged.vacancies[i];
    const views = merged.views[i];
    if (vac == null || views == null || vac === 0) return null;
    return +(views / vac).toFixed(1);
  });

  const real = ratio.filter(v => v != null);
  const avgRatio = real.length > 0
    ? +(real.reduce((a, b) => a + b, 0) / real.length).toFixed(1)
    : 0;

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1c1c22',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: colors.text },
      formatter: '{b}<br/>{a}: <strong>{c}</strong> просмотров / вакансию'
    },
    grid: { top: 20, bottom: 30, left: 55, right: 20 },
    xAxis: { type: 'category', data: merged.months, ...baseAxisStyle },
    yAxis: {
      type: 'value',
      ...baseAxisStyle
    },
    series: [
      {
        name: 'Просмотров на вакансию',
        type: 'line',
        data: ratio,
        lineStyle: { color: colors.green, width: 2.5 },
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
        symbolSize: 6,
        smooth: true,
        // линию среднего показываем, только если есть из чего считать
        markLine: real.length === 0 ? undefined : {
          silent: true,
          symbol: 'none',
          lineStyle: { color: colors.text3, type: 'dashed', width: 1 },
          label: {
            formatter: 'среднее: ' + avgRatio,
            color: colors.text3,
            fontSize: 11
          },
          data: [{ yAxis: avgRatio }]
        }
      }
    ]
  };
}

/**
 * Initialize a single chart with retry logic.
 * Waits until the container has visible dimensions before initializing.
 * Retries via setTimeout, not requestAnimationFrame — rAF is frozen in
 * background tabs and headless renderers, which would strand the chart.
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
      setTimeout(tryInit, 50);
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

  const tvEl = document.getElementById('chart-traffic-vacancy');
  if (tvEl && chartData.tyData && chartData.vacancy) {
    initChartWithRetry(tvEl, buildTrafficVacancyOption, chartData, charts);
  }

  const vrEl = document.getElementById('chart-visits-ratio');
  if (vrEl && chartData.tyData && chartData.vacancy) {
    // The visits-per-vacancy chart is inside a collapsed <details>.
    // It has zero dimensions until opened, so we defer init to first toggle.
    const detailsParent = vrEl.closest('details');
    if (detailsParent && !detailsParent.open) {
      let initialized = false;
      const onToggle = () => {
        if (!detailsParent.open) return;
        if (initialized) {
          // already initialized — just trigger resize in case container size changed
          const c = charts.find(ch => ch.getDom && ch.getDom() === vrEl);
          if (c) setTimeout(() => c.resize(), 0);
          return;
        }
        initialized = true;
        // Now element should have non-zero size — use the standard retry helper
        initChartWithRetry(vrEl, buildVisitsPerVacancyOption, chartData, charts);
      };
      detailsParent.addEventListener('toggle', onToggle);
    } else {
      // No details wrapper, or details already open — init immediately
      initChartWithRetry(vrEl, buildVisitsPerVacancyOption, chartData, charts);
    }
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
  let trafficVacancyInit = '';
  let visitsRatioInit = '';
  if (chartData.tyData && chartData.vacancy) {
    const tvOpt = JSON.stringify(buildTrafficVacancyOption(chartData));
    const vrOpt = JSON.stringify(buildVisitsPerVacancyOption(chartData));
    trafficVacancyInit = `
  initWhenReady(document.getElementById('chart-traffic-vacancy'), ${tvOpt});`;
    // visits-ratio chart lives inside a collapsed <details> — defer init to first open
    visitsRatioInit = `
  initOnDetailsOpen(document.getElementById('chart-visits-ratio'), ${vrOpt});`;
  }

  // Light theme: patch tooltip and axis colors in the generated script
  const lightPatch = lightTheme ? `
  function patchAxis(a) { a.axisLabel = Object.assign(a.axisLabel||{},{color:'#5a5a6c',fontSize:11}); a.splitLine = {lineStyle:{color:'rgba(0,0,0,0.06)'}}; a.axisLine = {lineStyle:{color:'rgba(0,0,0,0.06)'}}; }
  function patchLight(opt) {
    if (opt.tooltip) { opt.tooltip.backgroundColor = '#ffffff'; opt.tooltip.borderColor = 'rgba(0,0,0,0.1)'; opt.tooltip.textStyle = { color: '#1a1a2e' }; }
    if (opt.legend) { opt.legend.textStyle = { color: '#5a5a6c', fontSize: 11 }; }
    if (opt.xAxis) { patchAxis(opt.xAxis); }
    if (Array.isArray(opt.yAxis)) { opt.yAxis.forEach(patchAxis); } else if (opt.yAxis) { patchAxis(opt.yAxis); }
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
        setTimeout(tryInit, 50);
      }
    }
    tryInit();
  }
  function initOnDetailsOpen(el, opt) {
    if (!el) return;
    var d = el.closest('details');
    if (!d || d.open) { initWhenReady(el, opt); return; }
    var done = false;
    d.addEventListener('toggle', function() {
      if (!d.open || done) return;
      done = true;
      setTimeout(function() { initWhenReady(el, opt); }, 0);
    });
  }
  ${trafficVacancyInit}${visitsRatioInit}
});
<\/script>`;
}
