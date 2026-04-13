/**
 * Data Processor — port of build_all.py to JavaScript.
 * Computes all template values from the bot JSON data.
 */

// ==================== FORMATTING HELPERS ====================

export function fmtNum(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—';
  if (decimals > 0) {
    return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function fmtPct(n, decimals = 1) {
  if (n == null || isNaN(n)) return '—';
  return n.toFixed(decimals) + '%';
}

export function fmtRating(n) {
  if (n == null || isNaN(n)) return '—';
  return n.toFixed(2);
}

export function deltaClass(val, invert = false) {
  if (val == null || isNaN(val)) return 'delta-neutral';
  if ((val > 0 && !invert) || (val < 0 && invert)) return 'delta-pos';
  if ((val < 0 && !invert) || (val > 0 && invert)) return 'delta-neg';
  return 'delta-neutral';
}

function formatRussianDate(date) {
  const months = ['января','февраля','марта','апреля','мая','июня',
                   'июля','августа','сентября','октября','ноября','декабря'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function sortVacancyData(vacancy) {
  const pairs = vacancy.month_period.map((m, i) => ({ month: m, count: vacancy.vacancy_count[i] }));
  pairs.sort((a, b) => a.month.localeCompare(b.month));
  return {
    month_period: pairs.map(p => p.month),
    vacancy_count: pairs.map(p => p.count)
  };
}

/** Safe toFixed — returns '—' if value is null/undefined/NaN */
function safeFix(n, decimals) {
  if (n == null || isNaN(n)) return '—';
  return n.toFixed(decimals);
}

/** Safe delta string with +/- prefix */
function safeDelta(n, decimals) {
  if (n == null || isNaN(n)) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(decimals);
}

/** Safe delta with suffix (e.g. ' п.п.') */
function safeDeltaSuffix(n, decimals, suffix) {
  if (n == null || isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}${suffix}`;
}

// ==================== MAIN FUNCTION ====================

export function buildVals(json) {
  const rep = json.reputation.data;
  const repCat = json.reputation_category.data;
  const ratings = json.ratings.data;
  const ratingAll = json.rating_all.data;
  const vacancy = json.vacancy.data;
  const hh = json.hh_stat.data;
  const topic = json.topic.data;
  const price = json.price.data;
  const ty = json.target_yandex;
  const cy = json.category_yandex;
  const ysrc = json.yandex_src ? json.yandex_src.data : null;

  // Determine target company by target_company_id
  const targetId = json.target_company_id;
  const targetIdx = rep.employer_id.indexOf(targetId);
  if (targetIdx === -1) {
    throw new Error(`Компания target_company_id=${targetId} не найдена в reputation.data.employer_id`);
  }
  const rivalIndices = rep.employer_id
    .map((_, i) => i)
    .filter(i => i !== targetIdx);
  const companyName = json.target_company_name || rep.name[targetIdx];

  // Handle both field name variants
  const feedbackKey = rep.total_feedback_pecr !== undefined ? 'total_feedback_pecr' : 'total_feedback_perc';
  const repCatFeedbackKey = repCat.total_feedback_pecr !== undefined ? 'total_feedback_pecr' : 'total_feedback_perc';

  const vals = {};
  let d;

  // ===== General =====
  vals.company_name = companyName;
  vals.company_url = `https://dreamjob.ru/employers/${rep.employer_id[targetIdx]}`;
  vals.report_date = formatRussianDate(new Date());

  // ===== Section 2: Reputation =====
  vals.comp_vacancies = fmtNum(rep.open_vacancies[targetIdx]);
  vals.comp_rating = fmtRating(rep.total_rating[targetIdx]);
  vals.comp_reviews = fmtNum(rep.reviews_count[targetIdx]);
  vals.comp_dj = rep.work[targetIdx] === 1 ? 'Да' : 'Нет';
  vals.comp_dj_class = rep.work[targetIdx] === 1 ? 'badge-yes' : 'badge-no';
  vals.comp_answered_pct = fmtPct(rep[feedbackKey][targetIdx]);
  vals.comp_notrec_pct = fmtPct(rep.unrecommend_percent[targetIdx]);

  rivalIndices.forEach((ri, idx) => {
    const i = idx + 1;
    vals[`rival${i}_name`] = rep.name[ri];
    vals[`rival${i}_url`] = `https://dreamjob.ru/employers/${rep.employer_id[ri]}`;
    vals[`rival${i}_vacancies`] = fmtNum(rep.open_vacancies[ri]);
    vals[`rival${i}_rating`] = fmtRating(rep.total_rating[ri]);
    vals[`rival${i}_reviews`] = fmtNum(rep.reviews_count[ri]);
    vals[`rival${i}_dj`] = rep.work[ri] === 1 ? 'Да' : 'Нет';
    vals[`rival${i}_dj_class`] = rep.work[ri] === 1 ? 'badge-yes' : 'badge-no';
    vals[`rival${i}_answered_pct`] = fmtPct(rep[feedbackKey][ri]);
    vals[`rival${i}_notrec_pct`] = fmtPct(rep.unrecommend_percent[ri]);
  });

  vals.industry_rating = fmtRating(repCat.total_rating[0]);
  vals.industry_reviews = fmtNum(repCat.reviews_count[0]);
  vals.industry_answered_pct = fmtPct(repCat[repCatFeedbackKey][0]);
  vals.industry_notrec_pct = fmtPct(repCat.unrecommend_percent[0]);

  // ===== Section 3: Industry comparison =====
  // Rating alltime
  vals.ind_rating_alltime_comp = fmtRating(ratings.total_rating[0]);
  vals.ind_rating_alltime_ind = fmtRating(ratings.total_rating[1]);
  vals.ind_rating_alltime_payed = fmtRating(ratings.total_rating[2]);
  d = ratings.total_rating[0] - ratings.total_rating[1];
  vals.delta_rating_alltime = safeDelta(d, 2);
  vals.delta_rating_alltime_class = deltaClass(d);

  // Rating 12m
  vals.ind_rating_12m_comp = fmtRating(ratings.rating_year[0]);
  vals.ind_rating_12m_ind = fmtRating(ratings.rating_year[1]);
  vals.ind_rating_12m_payed = fmtRating(ratings.rating_year[2]);
  d = ratings.rating_year[0] - ratings.rating_year[1];
  vals.delta_rating_12m = safeDelta(d, 2);
  vals.delta_rating_12m_class = deltaClass(d);

  // Neg share (invert=true)
  vals.ind_neg_share_comp = fmtPct(ratings.review_year_neg[0] == null ? null : ratings.review_year_neg[0] * 100);
  vals.ind_neg_share_ind = fmtPct(ratings.review_year_neg[1] * 100);
  vals.ind_neg_share_payed = fmtPct(ratings.review_year_neg[2] * 100);
  d = (ratings.review_year_neg[0] == null) ? NaN : (ratings.review_year_neg[0] - ratings.review_year_neg[1]) * 100;
  vals.delta_neg_share = safeDeltaSuffix(d, 1, ' п.п.');
  vals.delta_neg_share_class = deltaClass(d, true);

  // Pos share
  vals.ind_pos_share_comp = fmtPct(ratings.review_year_pos[0] == null ? null : ratings.review_year_pos[0] * 100);
  vals.ind_pos_share_ind = fmtPct(ratings.review_year_pos[1] * 100);
  vals.ind_pos_share_payed = fmtPct(ratings.review_year_pos[2] * 100);
  d = (ratings.review_year_pos[0] == null) ? NaN : (ratings.review_year_pos[0] - ratings.review_year_pos[1]) * 100;
  vals.delta_pos_share = safeDeltaSuffix(d, 1, ' п.п.');
  vals.delta_pos_share_class = deltaClass(d);

  // Reviews total
  vals.ind_reviews_total_comp = fmtNum(ratings.reviews_count[0]);
  vals.ind_reviews_total_ind = fmtNum(ratings.reviews_count[1]);
  vals.ind_reviews_total_payed = fmtNum(ratings.reviews_count[2]);
  d = ratings.reviews_count[0] - ratings.reviews_count[1];
  vals.delta_reviews_total = d >= 0 ? `+${fmtNum(d)}` : fmtNum(d);
  vals.delta_reviews_total_class = deltaClass(d);

  // Reviews 12m
  vals.ind_reviews_12m_comp = fmtNum(ratings.review_year[0]);
  vals.ind_reviews_12m_ind = fmtNum(ratings.review_year[1]);
  vals.ind_reviews_12m_payed = fmtNum(ratings.review_year[2]);
  d = ratings.review_year[0] - ratings.review_year[1];
  vals.delta_reviews_12m = d >= 0 ? `+${fmtNum(d)}` : fmtNum(d);
  vals.delta_reviews_12m_class = deltaClass(d);

  // Current employees rating
  vals.ind_current_rating_comp = fmtRating(ratings.rating_position_one[0]);
  vals.ind_current_rating_ind = fmtRating(ratings.rating_position_one[1]);
  vals.ind_current_rating_payed = fmtRating(ratings.rating_position_one[2]);
  d = ratings.rating_position_one[0] - ratings.rating_position_one[1];
  vals.delta_current_rating = safeDelta(d, 2);
  vals.delta_current_rating_class = deltaClass(d);

  // Former employees rating
  vals.ind_former_rating_comp = fmtRating(ratings.rating_position_two[0]);
  vals.ind_former_rating_ind = fmtRating(ratings.rating_position_two[1]);
  vals.ind_former_rating_payed = fmtRating(ratings.rating_position_two[2]);
  d = ratings.rating_position_two[0] - ratings.rating_position_two[1];
  vals.delta_former_rating = safeDelta(d, 2);
  vals.delta_former_rating_class = deltaClass(d);

  // ===== Section 4: Hiring =====
  vals.hire_open_vac_comp = fmtNum(hh.open_vacancies[0]);
  vals.hire_open_vac_ind = fmtNum(hh.open_vacancies[1]);
  vals.hire_open_vac_payed = fmtNum(hh.open_vacancies[2]);
  d = hh.open_vacancies[0] - hh.open_vacancies[1];
  vals.hire_delta_vac = d >= 0 ? `+${fmtNum(d)}` : fmtNum(d);
  vals.hire_delta_vac_class = 'delta-neutral';
  vals.hire_response_comp = safeFix(hh.response_stat[0], 2);
  vals.hire_response_ind = safeFix(hh.response_stat[1], 2);
  vals.hire_response_payed = safeFix(hh.response_stat[2], 2);
  d = hh.response_stat[0] - hh.response_stat[1];
  vals.hire_delta_response = safeDelta(d, 2);
  vals.hire_delta_response_class = deltaClass(d);

  // ===== Section 5: Traffic =====
  if (ty && ty.data) {
    const tyData = ty.data;
    const totalViews = tyData.view_cnt.reduce((a, b) => a + b, 0);
    vals.traffic_views_year = fmtNum(totalViews);
    vals.traffic_new_pct = fmtPct(ty.new_users_percent);
    vals.traffic_depth = safeFix(ty.depth, 2);
    vals.traffic_depth_avg = safeFix(cy.depth, 2);
    vals.traffic_avg_time = ty.avg_time != null ? `${ty.avg_time.toFixed(1)} мин` : '—';
    vals.traffic_avg_time_avg = cy.avg_time != null ? `${cy.avg_time.toFixed(1)} мин` : '—';
  }

  // ===== Section 6: Sources =====
  if (ysrc) {
    const srcPercents = ysrc.percent;
    const srcNames = ysrc.source_category;
    let sourceHh = '0%', sourceSearch = '0%', sourceInternal = '0%';
    srcNames.forEach((name, i) => {
      const pct = srcPercents[i] != null ? `${srcPercents[i].toFixed(1)}%` : '0%';
      const lower = name.toLowerCase();
      if (lower.includes('hh') || lower.includes('ссылк')) {
        sourceHh = pct;
      } else if (lower.includes('поиск')) {
        sourceSearch = pct;
      } else if (lower.includes('внутренн')) {
        sourceInternal = pct;
      }
    });
    vals.source_hh_pct = sourceHh;
    vals.source_search_pct = sourceSearch;
    vals.source_internal_pct = sourceInternal;
  }

  // ===== Section 7: Summary =====
  vals.summary_reputation = json.summary_reputation || '';
  vals.summary_hiring = json.summary_hiring || '';
  vals.summary_traffic = json.summary_traffic || '';
  vals.summary_negative = json.summary_negative || '';

  // ===== Section 8: Topics =====
  if (topic.vacancy_name) {
    const positions = topic.vacancy_name;
    const topicsList = topic['0'] || topic.topics || [];
    const posRatings = topic.total_rating || [];

    // Average rating across open vacancies
    const validRatings = posRatings.filter(r => r != null && !isNaN(r));
    if (validRatings.length > 0) {
      const avg = validRatings.reduce((s, v) => s + v, 0) / validRatings.length;
      vals.topic_avg_rating = avg.toFixed(1).replace('.', ',');
    } else {
      vals.topic_avg_rating = '—';
    }

    positions.forEach((pos, idx) => {
      const i = idx + 1;
      vals[`pos${i}_name`] = pos;
      vals[`pos${i}_rating`] = posRatings[idx] != null ? posRatings[idx].toFixed(2) : '—';
      const topicsDict = topicsList[idx] || {};
      const sorted = Object.entries(topicsDict).sort((a, b) => b[1] - a[1]);
      for (let j = 1; j <= 3; j++) {
        if (j <= sorted.length) {
          vals[`pos${i}_topic${j}_name`] = sorted[j-1][0].charAt(0).toUpperCase() + sorted[j-1][0].slice(1);
          vals[`pos${i}_topic${j}_pct`] = String(Math.round(sorted[j-1][1]));
        } else {
          vals[`pos${i}_topic${j}_name`] = '—';
          vals[`pos${i}_topic${j}_pct`] = '0';
        }
      }
      vals[`pos${i}_more_count`] = String(Math.max(0, sorted.length - 3));
      // Hide card if no topics at all
      vals[`pos${i}_display`] = sorted.length === 0 ? 'display:none' : '';
      // Hide "Ещё 0 тем" when count is 0
      vals[`pos${i}_more_display`] = sorted.length <= 3 ? 'display:none' : '';
    });
  }

  // ===== Section 9: Tariffs =====
  ['standard', 'optimum', 'premium'].forEach((name, i) => {
    vals[`tariff_${name}_price`] = fmtNum(price.price[i]);
    const savings = price.hr[i] + price.hold[i];
    vals[`tariff_${name}_savings`] = fmtNum(savings);
    const roi = savings / price.price[i] * 100;
    vals[`tariff_${name}_roi`] = `~${Math.round(roi)}%`;
  });

  // ===== AI Conclusions (all except savings) =====
  const conclusionKeys = [
    'ai_conclusion_reputation', 'ai_conclusion_industry', 'ai_conclusion_hiring',
    'ai_conclusion_traffic', 'ai_conclusion_sources', 'ai_conclusion_highlights',
    'ai_conclusion_topics'
  ];
  conclusionKeys.forEach(key => {
    vals[key] = json[key] || '';
  });

  // ===== Chart Data =====
  const chartData = {
    ratings,
    ratingAll,
    vacancy: sortVacancyData(vacancy),
    hh,
    tyData: ty && ty.data ? ty.data : null,
    cyData: cy && cy.data ? cy.data : null,
    repCat,
  };

  return { vals, chartData };
}
