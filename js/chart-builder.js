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
    +ratings.total_rating[0].toFixed(2),
    +ratings.rating_year[0].toFixed(2),
    +ratings.review_year_pos[0].toFixed(3),
    +(ratings.reviews_count[0] / 1000).toFixed(3),
    +ratings.rating_position_one[0].toFixed(2),
    +ratings.rating_position_two[0].toFixed(2),
  ];
  const radarInd = [
    +ratings.total_rating[1].toFixed(2),
    +ratings.rating_year[1].toFixed(2),
    +ratings.review_year_pos[1].toFixed(3),
    +(ratings.reviews_count[1] / 1000).toFixed(3),
    +ratings.rating_position_one[1].toFixed(2),
    +ratings.rating_position_two[1].toFixed(2),
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
      bottom: 0,
      textStyle: { color: colors.text2, fontSize: 11 },
      data: ['Компания', 'Индустрия']
    },
    radar: {
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
 * Build hiring dynamics chart option for Section 4.
 */
export function buildHiringOption(chartData) {
  const { vacancy, repCat } = chartData;
  const months = vacancy.month_period.map(fmtMonth);
  const companyData = vacancy.vacancy_count.map(v => Math.round(v));
  const indAvg = Math.round(repCat.open_vacancies[0]);
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
        lineStyle: { color: colors.amber, width: 2 },
        itemStyle: { color: colors.amber },
        symbol: 'circle',
        symbolSize: 6,
        smooth: true
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
 * Initialize all charts in the DOM after report HTML is injected.
 * Returns chart instances for cleanup.
 */
export function initCharts(chartData) {
  const charts = [];

  const radarEl = document.getElementById('chart-industry-radar');
  if (radarEl) {
    const chart = echarts.init(radarEl);
    chart.setOption(buildRadarOption(chartData));
    charts.push(chart);
  }

  const hiringEl = document.getElementById('chart-hiring-dynamics');
  if (hiringEl) {
    const chart = echarts.init(hiringEl);
    chart.setOption(buildHiringOption(chartData));
    charts.push(chart);
  }

  const trafficEl = document.getElementById('chart-traffic');
  if (trafficEl) {
    const chart = echarts.init(trafficEl);
    chart.setOption(buildTrafficOption(chartData));
    charts.push(chart);
  }

  // Resize handler
  const resizeHandler = () => charts.forEach(c => c.resize());
  window.addEventListener('resize', resizeHandler);

  return { charts, resizeHandler };
}

/**
 * Generate the chart initialization script for export (self-contained HTML).
 */
export function generateChartScript(chartData) {
  const radarOpt = JSON.stringify(buildRadarOption(chartData));
  const hiringOpt = JSON.stringify(buildHiringOption(chartData));
  const trafficOpt = JSON.stringify(buildTrafficOption(chartData));

  return `
<script>
document.addEventListener('DOMContentLoaded', function() {
  var radarEl = document.getElementById('chart-industry-radar');
  if (radarEl) { var c = echarts.init(radarEl); c.setOption(${radarOpt}); window.addEventListener('resize', function() { c.resize(); }); }
  var hiringEl = document.getElementById('chart-hiring-dynamics');
  if (hiringEl) { var c2 = echarts.init(hiringEl); c2.setOption(${hiringOpt}); window.addEventListener('resize', function() { c2.resize(); }); }
  var trafficEl = document.getElementById('chart-traffic');
  if (trafficEl) { var c3 = echarts.init(trafficEl); c3.setOption(${trafficOpt}); window.addEventListener('resize', function() { c3.resize(); }); }
});
<\/script>`;
}
