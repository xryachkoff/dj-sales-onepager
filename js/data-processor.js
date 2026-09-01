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

  const rivalsRepRowsHtml = [];
  rivalIndices.forEach((ri, idx) => {
    const i = idx + 1;
    const rivalName = rep.name[ri];
    const rivalUrl = `https://dreamjob.ru/employers/${rep.employer_id[ri]}`;
    const rivalVacancies = fmtNum(rep.open_vacancies[ri]);
    const rivalRating = fmtRating(rep.total_rating[ri]);
    const rivalReviews = fmtNum(rep.reviews_count[ri]);
    const rivalDj = rep.work[ri] === 1 ? 'Да' : 'Нет';
    const rivalDjClass = rep.work[ri] === 1 ? 'badge-yes' : 'badge-no';
    const rivalAnsweredPct = fmtPct(rep[feedbackKey][ri]);
    const rivalNotrecPct = fmtPct(rep.unrecommend_percent[ri]);
    // Keep legacy per-index placeholders (in case used elsewhere)
    vals[`rival${i}_name`] = rivalName;
    vals[`rival${i}_url`] = rivalUrl;
    vals[`rival${i}_vacancies`] = rivalVacancies;
    vals[`rival${i}_rating`] = rivalRating;
    vals[`rival${i}_reviews`] = rivalReviews;
    vals[`rival${i}_dj`] = rivalDj;
    vals[`rival${i}_dj_class`] = rivalDjClass;
    vals[`rival${i}_answered_pct`] = rivalAnsweredPct;
    vals[`rival${i}_notrec_pct`] = rivalNotrecPct;
    // Build HTML row
    rivalsRepRowsHtml.push(
      `<div class="data-row">
        <div class="data-cell"><a href="${rivalUrl}" target="_blank" class="dj-link">${rivalName}</a></div>
        <div class="data-cell">${rivalVacancies}</div>
        <div class="data-cell">${rivalRating}</div>
        <div class="data-cell">${rivalReviews}</div>
        <div class="data-cell"><span class="${rivalDjClass}">${rivalDj}</span></div>
        <div class="data-cell">${rivalAnsweredPct}</div>
        <div class="data-cell">${rivalNotrecPct}</div>
      </div>`
    );
  });
  vals.rivals_rows_reputation = rivalsRepRowsHtml.join('\n      ');

  vals.industry_rating = fmtRating(repCat.total_rating[0]);
  vals.industry_reviews = fmtNum(repCat.reviews_count[0]);
  vals.industry_answered_pct = fmtPct(repCat[repCatFeedbackKey][0]);
  vals.industry_notrec_pct = fmtPct(repCat.unrecommend_percent[0]);

  // ===== Section 4: Responses stats =====
  const compReviews = rep.reviews_count[targetIdx] || 0;
  const compFeedbackPct = rep[feedbackKey][targetIdx] || 0;
  const compAnswered = Math.round(compReviews * compFeedbackPct / 100);
  vals.resp_comp_pct = fmtPct(compFeedbackPct);
  vals.resp_comp_abs = fmtNum(compAnswered);
  vals.resp_comp_total = fmtNum(compReviews);

  // Rivals response stats
  const rivalPcts = [];
  const rivalsRespRowsHtml = [];
  rivalIndices.forEach((ri, idx) => {
    const i = idx + 1;
    const rReviews = rep.reviews_count[ri] || 0;
    const rPct = rep[feedbackKey][ri] || 0;
    const rAnswered = Math.round(rReviews * rPct / 100);
    const rTotalFmt = fmtNum(rReviews);
    const rPctFmt = fmtPct(rPct);
    const rAbsFmt = fmtNum(rAnswered);
    vals[`resp_rival${i}_total`] = rTotalFmt;
    vals[`resp_rival${i}_pct`] = rPctFmt;
    vals[`resp_rival${i}_abs`] = rAbsFmt;
    rivalPcts.push(rPct);
    rivalsRespRowsHtml.push(
      `<div class="data-row" style="grid-template-columns: 2.5fr 1fr 1fr 1fr;">
        <div class="data-cell">${rep.name[ri]}</div>
        <div class="data-cell">${rTotalFmt}</div>
        <div class="data-cell">${rPctFmt}</div>
        <div class="data-cell">${rAbsFmt}</div>
      </div>`
    );
  });
  vals.rivals_rows_responses = rivalsRespRowsHtml.join('\n      ');

  // Average rivals response %
  const avgRivalPct = rivalPcts.length > 0 ? rivalPcts.reduce((a, b) => a + b, 0) / rivalPcts.length : 0;
  vals.resp_rivals_avg_pct = fmtPct(avgRivalPct);

  // Delta: company vs rivals average.
  // Показываем относительную разницу («на сколько процентов меньше, чем у
  // конкурентов»), а не разницу в процентных пунктах — так понятнее продажнику.
  const respDelta = compFeedbackPct - avgRivalPct;
  const respRel = avgRivalPct > 0 ? (respDelta / avgRivalPct) * 100 : null;
  vals.resp_delta = respRel === null
    ? '—'
    : `${respRel >= 0 ? '+' : ''}${Math.round(respRel)}%`;
  vals.resp_delta_class = respDelta > 0 ? 'delta-pos' : respDelta < 0 ? 'delta-neg' : 'delta-neutral';
  vals.resp_delta_icon_class = respDelta >= 0 ? 'green' : 'red';
  vals.resp_delta_icon = respDelta >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

  // ===== Industry comparison (kept for data, section removed from template) =====
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

  // ===== Section "Hiring" removed (April 2026) — vacancies now shown only in Traffic combined chart =====

  // ===== Traffic =====
  // depth / avg_time / new_users_percent приходят в двух вариантах: у JSON из
  // бота они лежат на уровне блока (target_yandex.depth), а в массовой выгрузке
  // из БД — внутри data (target_yandex.data.depth). Читаем оба места.
  const metric = (block, name) => {
    if (!block) return undefined;
    if (block[name] != null) return block[name];
    return block.data ? block.data[name] : undefined;
  };

  if (ty && ty.data) {
    const tyData = ty.data;
    const totalViews = tyData.view_cnt.reduce((a, b) => a + b, 0);
    vals.traffic_views_year = fmtNum(totalViews);
    vals.traffic_dj_views = fmtNum(totalViews);
    vals.traffic_new_pct = fmtPct(metric(ty, 'new_users_percent'));
    vals.traffic_depth = safeFix(metric(ty, 'depth'), 2);
    vals.traffic_depth_avg = safeFix(metric(cy, 'depth'), 2);
    const tyTime = metric(ty, 'avg_time');
    const cyTime = metric(cy, 'avg_time');
    vals.traffic_avg_time = tyTime != null ? `${tyTime.toFixed(1)} мин` : '—';
    vals.traffic_avg_time_avg = cyTime != null ? `${cyTime.toFixed(1)} мин` : '—';
  }

  // ===== Section 6: Sources =====
  // Conversion rate from hh.ru widget view to DJ click (~10%)
  const HH_WIDGET_CONVERSION_RATE = 0.10;
  let hhSourcePct = 0;

  if (ysrc) {
    const srcPercents = ysrc.percent;
    const srcNames = ysrc.source_category;
    let sourceHh = 0, sourceSearch = 0, sourceInternal = 0;
    srcNames.forEach((name, i) => {
      const pct = srcPercents[i] != null ? srcPercents[i] : 0;
      const lower = name.toLowerCase();
      if (lower.includes('hh') || lower.includes('ссылк')) {
        sourceHh = pct;
        hhSourcePct = pct / 100;
      } else if (lower.includes('поиск')) {
        sourceSearch = pct;
      } else if (lower.includes('внутренн')) {
        sourceInternal = pct;
      }
    });
    // Всё, что не разложилось по трём известным категориям, показываем как «Другое».
    // Считаем остатком от 100%, а не суммой нераспознанных строк: так карточка
    // остаётся верной, если бот однажды добавит ещё категорий.
    const other = Math.max(0, 100 - (sourceHh + sourceSearch + sourceInternal));
    vals.source_hh_pct = fmtPct(sourceHh);
    vals.source_search_pct = fmtPct(sourceSearch);
    vals.source_internal_pct = fmtPct(sourceInternal);
    vals.source_other_pct = fmtPct(other);
    // прячем карточку, когда остатка практически нет — иначе получится «0.0% Другое»
    vals.source_other_display = other >= 0.5 ? '' : 'display:none';
  }

  // ===== Compute hh.ru widget views (estimated) =====
  if (ty && ty.data) {
    const totalDjViews = ty.data.view_cnt.reduce((a, b) => a + b, 0);
    const djFromHh = Math.round(totalDjViews * hhSourcePct);
    const hhWidgetViews = Math.round(djFromHh / HH_WIDGET_CONVERSION_RATE);
    vals.traffic_hh_widget_views = fmtNum(hhWidgetViews);
    vals.traffic_total_combined = fmtNum(totalDjViews + hhWidgetViews);
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
          vals[`pos${i}_topic${j}_display`] = '';
        } else {
          // У должности меньше трёх тем — прячем лишний слот, иначе в карточке
          // висит пустая строка «— 0%» с нулевой полоской.
          vals[`pos${i}_topic${j}_name`] = '—';
          vals[`pos${i}_topic${j}_pct`] = '0';
          vals[`pos${i}_topic${j}_display`] = 'display:none';
        }
      }
      vals[`pos${i}_more_count`] = String(Math.max(0, sorted.length - 3));
      // Hide card if no meaningful data: no position name, or no topics with non-zero values
      const hasRealTopics = sorted.some(([, pct]) => pct > 0);
      vals[`pos${i}_display`] = (!pos || !hasRealTopics) ? 'display:none' : '';
      // Hide "Ещё N тем" when count is 0
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

  // ===== AI Conclusions =====
  const conclusionKeys = [
    'ai_conclusion_reputation',
    'ai_conclusion_traffic', 'ai_conclusion_topics'
  ];
  conclusionKeys.forEach(key => {
    vals[key] = json[key] || '';
  });

  // Auto-link company mentions in AI text to their Dream Job pages.
  // Builds a list of (name, url) pairs from target + all rivals,
  // sorts by name length DESC so longer names match before shorter substrings,
  // and wraps each free-standing name in <a href="...">...</a> if not already linked.
  const linkPairs = [{
    name: companyName,
    url: `https://dreamjob.ru/employers/${targetId}`
  }];
  rivalIndices.forEach((ri) => {
    linkPairs.push({
      name: rep.name[ri],
      url: `https://dreamjob.ru/employers/${rep.employer_id[ri]}`
    });
  });
  linkPairs.sort((a, b) => b.name.length - a.name.length);

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function autoLinkCompanies(html) {
    if (!html) return html;
    let out = html;
    linkPairs.forEach(({ name, url }) => {
      if (!name) return;
      // Match the name only when NOT already inside an <a>...</a> tag
      // Approach: split by existing <a> tags, process only non-link parts
      const parts = out.split(/(<a\b[^>]*>[\s\S]*?<\/a>)/i);
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) continue; // skip <a>...</a>
        // Use word boundary substitute via lookahead/lookbehind for non-word chars or string start/end
        const re = new RegExp(`(^|[^\\wА-Яа-яЁё])(${escapeRegex(name)})(?=[^\\wА-Яа-яЁё]|$)`, 'g');
        parts[i] = parts[i].replace(re, (_, pre, m) =>
          `${pre}<a href="${url}" target="_blank" class="dj-link">${m}</a>`
        );
      }
      out = parts.join('');
    });
    return out;
  }

  // Apply to all AI conclusions and summary cards
  conclusionKeys.forEach(key => { vals[key] = autoLinkCompanies(vals[key]); });
  ['summary_reputation', 'summary_hiring', 'summary_traffic', 'summary_negative'].forEach(key => {
    if (vals[key]) vals[key] = autoLinkCompanies(vals[key]);
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
