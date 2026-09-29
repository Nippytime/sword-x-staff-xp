import { calculate, cumulative, formatXp, ladderFor, MAX_LEVEL, normalRank, parseXp, shortXp, snapshotDate } from './calculator.js';

const $ = (selector) => document.querySelector(selector);
const defaults = () => ({
  mode: 'normal', season: 1,
  normal: { current: '70', target: '100', earned: '0', daily: '' },
  seasonValues: { current: '0', target: '25', earned: '0', daily: '' }
});
const storageKey = 'sxs-xp-ledger-v1';
const fields = { current: $('#current'), target: $('#target'), earned: $('#earned'), daily: $('#daily') };
const ids = Object.fromEntries([
  'needed-short', 'needed-exact', 'ladder-name', 'display-current', 'display-target',
  'levels-remaining', 'level-caption', 'next-needed', 'time-estimate', 'date-estimate',
  'goal-progress-pct', 'goal-progress-fill', 'goal-progress-detail', 'current-progress',
  'current-progress-fill', 'next-level-hint', 'result-body', 'result-error',
  'result-error-message', 'input-error', 'reference-subtitle', 'reference-body',
  'reference-empty', 'table-row-count', 'result-meta', 'season-description'
].map((id) => [id, document.getElementById(id)]));

function readSaved() {
  let restored = {};
  try { restored = JSON.parse(localStorage.getItem(storageKey)) ?? {}; } catch { /* Private browsing may block storage. */ }
  const base = defaults();
  const mode = restored.mode === 'season' ? 'season' : 'normal';
  const season = Number.isInteger(Number(restored.season)) && Number(restored.season) >= 1 && Number(restored.season) <= 5 ? Number(restored.season) : 1;
  const state = {
    ...base, mode, season,
    normal: { ...base.normal, ...(restored.normal ?? {}) },
    seasonValues: { ...base.seasonValues, ...(restored.seasonValues ?? {}) }
  };
  const query = new URLSearchParams(location.search);
  if (query.has('mode')) state.mode = query.get('mode') === 'season' ? 'season' : 'normal';
  if (query.has('season') && /^[1-5]$/.test(query.get('season'))) state.season = Number(query.get('season'));
  const active = state.mode === 'season' ? state.seasonValues : state.normal;
  for (const key of Object.keys(fields)) if (query.has(key)) active[key] = query.get(key);
  return state;
}

let state = readSaved();
let latestResult = null;
let tableKey = '';
let toastTimeout;

function activeDraft() { return state.mode === 'season' ? state.seasonValues : state.normal; }
function readFields() { for (const [key, element] of Object.entries(fields)) activeDraft()[key] = element.value; }
function writeFields() { for (const [key, element] of Object.entries(fields)) element.value = activeDraft()[key] ?? ''; }
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Calculation works without persistent storage. */ }
}
function levelNumber(text) { return /^\d+$/.test(String(text).trim()) ? Number(text) : NaN; }
function intOrInvalid(value) { return value === null ? NaN : value; }

function showToast(message) {
  const toast = $('#toast');
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimeout = setTimeout(() => toast.classList.remove('is-visible'), 2700);
}

function updateSelection() {
  const seasonMode = state.mode === 'season';
  for (const button of document.querySelectorAll('[data-mode]')) {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  $('#season-area').hidden = !seasonMode;
  $('#normal-mode-helper').hidden = seasonMode;
  $('#season-note').hidden = !seasonMode;
  $('#season').value = String(state.season);
  const ladder = ladderFor(state.mode, state.season);
  fields.current.min = String(ladder.start);
  fields.target.min = String(ladder.start);
  fields.current.max = String(ladder.costs.length - 1);
  fields.target.max = String(ladder.costs.length - 1);
  $('label[for=current]').firstChild.nodeValue = seasonMode ? 'Current Season Level ' : 'Current level ';
  $('label[for=target]').firstChild.nodeValue = seasonMode ? 'Target Season Level ' : 'Target level ';
  if (seasonMode) ids['season-description'].textContent = `Cap ${ladder.cap} · Season Lv 0–${ladder.limit}`;
}

function calculateDraft() {
  const { current, target, earned, daily } = activeDraft();
  return calculate({
    mode: state.mode, season: state.season,
    current: levelNumber(current), target: levelNumber(target),
    earned: intOrInvalid(parseXp(earned)), daily: intOrInvalid(parseXp(daily))
  });
}

function showError(error) {
  latestResult = null;
  ids['result-body'].hidden = true;
  ids['result-error'].hidden = false;
  ids['result-error-message'].textContent = error.message;
  ids['input-error'].textContent = error.message;
  ids['input-error'].hidden = false;
  $('#copy-exact').disabled = true;
  $('#share-button').disabled = true;
  ids['next-level-hint'].textContent = 'Enter a valid level and XP amount.';
  ids['current-progress'].setAttribute('aria-valuenow', '0');
  ids['current-progress-fill'].style.width = '0%';
}

function renderResult(result) {
  latestResult = result;
  ids['result-body'].hidden = false;
  ids['result-error'].hidden = true;
  ids['input-error'].hidden = true;
  $('#copy-exact').disabled = false;
  $('#share-button').disabled = false;

  const seasonMode = state.mode === 'season';
  ids['ladder-name'].textContent = seasonMode ? `SEASON ${result.id} · ${result.rank.toUpperCase()}` : 'NORMAL XP';
  ids['needed-short'].textContent = shortXp(result.remaining);
  ids['needed-exact'].textContent = `${formatXp(result.remaining)} XP`;
  ids['display-current'].textContent = `LV ${result.shownCurrent}${seasonMode ? ` (+${result.current})` : ''}`;
  ids['display-target'].textContent = `LV ${result.shownTarget}${seasonMode ? ` (+${result.target})` : ''}`;
  ids['levels-remaining'].textContent = formatXp(result.levels);
  ids['level-caption'].textContent = seasonMode ? `${formatXp(result.score)} score` : '';
  ids['next-needed'].textContent = result.nextCost ? shortXp(result.nextRemaining) : 'MAX';
  ids['goal-progress-pct'].textContent = `${Math.min(100, result.progress).toFixed(1).replace(/\.0$/, '')}%`;
  ids['goal-progress-fill'].style.width = `${result.progress}%`;
  ids['goal-progress-detail'].textContent = seasonMode ? 'Season XP only' : '';
  ids['next-level-hint'].textContent = result.nextCost
    ? `${formatXp(result.earned)} / ${formatXp(result.nextCost)} XP`
    : 'Max level reached.';
  const currentPercent = result.nextCost ? Math.min(100, result.earned / result.nextCost * 100) : 100;
  ids['current-progress'].setAttribute('aria-valuenow', String(Math.round(currentPercent)));
  ids['current-progress-fill'].style.width = `${currentPercent}%`;
  if (result.days == null) {
    ids['time-estimate'].textContent = '—';
    ids['date-estimate'].textContent = 'Add daily XP';
  } else if (result.days > 36500) {
    ids['time-estimate'].textContent = `${shortXp(result.days)} d`;
    ids['date-estimate'].textContent = 'over 100 years';
  } else {
    ids['time-estimate'].textContent = result.days === 0 ? '0 days' : `${shortXp(result.days)} d`;
    const projected = new Date();
    projected.setHours(12, 0, 0, 0);
    projected.setDate(projected.getDate() + result.days);
    ids['date-estimate'].textContent = result.days === 0 ? 'Goal met' : `by ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(projected)}`;
  }
  ids['result-meta'].textContent = seasonMode ? `SEASON ${result.id}` : 'NORMAL XP';
}

function renderTable() {
  const ladder = ladderFor(state.mode, state.season);
  const query = $('#reference-search').value.trim().toLowerCase();
  const min = state.mode === 'normal' ? 1 : 1;
  const current = levelNumber(activeDraft().current);
  const target = levelNumber(activeDraft().target);
  const totals = cumulative(ladder.costs);
  const matches = [];
  for (let level = min; level < ladder.costs.length; level++) {
    const shown = state.mode === 'season' ? ladder.cap + level : level;
    const label = state.mode === 'season' ? `${ladder.rank} · Season ${level}` : normalRank(level);
    if (query && !`${level} ${shown} ${label}`.toLowerCase().includes(query)) continue;
    const tags = `${level === current ? '<span class="row-pill current">NOW</span>' : ''}${level === target ? '<span class="row-pill target">GOAL</span>' : ''}`;
    matches.push(`<tr class="${level === current ? 'is-current' : ''} ${level === target ? 'is-target' : ''}"><td>${shown}${tags}</td><td>${label}</td><td class="numeric">${formatXp(ladder.costs[level])}</td><td class="numeric">${formatXp(totals[level])}</td></tr>`);
  }
  ids['reference-body'].innerHTML = matches.join('');
  ids['reference-empty'].hidden = matches.length > 0;
  ids['table-row-count'].textContent = `${matches.length} / ${ladder.costs.length - 1} levels`;
  ids['reference-subtitle'].textContent = state.mode === 'season' ? `Season ${ladder.id} · ${ladder.rank} · cap ${ladder.cap}` : `Normal levels 1–${MAX_LEVEL}`;
}

function render() {
  updateSelection();
  try { renderResult(calculateDraft()); } catch (error) { showError(error); }
  const key = `${state.mode}:${state.season}:${activeDraft().current}:${activeDraft().target}:${$('#reference-search').value}`;
  if (key !== tableKey) { tableKey = key; renderTable(); }
  save();
}

function switchMode(mode) {
  if (mode === state.mode) return;
  readFields();
  state.mode = mode;
  writeFields();
  $('#reference-search').value = '';
  tableKey = '';
  render();
}

function switchSeason(id) {
  readFields();
  state.season = id;
  const { limit } = ladderFor('season', id);
  const draft = state.seasonValues;
  const current = levelNumber(draft.current);
  const target = levelNumber(draft.target);
  if (Number.isSafeInteger(current)) draft.current = String(Math.min(current, limit));
  if (Number.isSafeInteger(target)) draft.target = String(Math.min(limit, Math.max(target, Number(draft.current))));
  draft.earned = '0';
  writeFields();
  tableKey = '';
  render();
}

for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => switchMode(button.dataset.mode));
$('#season').addEventListener('change', (event) => switchSeason(Number(event.target.value)));
for (const element of Object.values(fields)) element.addEventListener('input', () => { readFields(); render(); });
$('#xp-form').addEventListener('submit', (event) => event.preventDefault());
$('#reference-search').addEventListener('input', () => { tableKey = ''; renderTable(); });
for (const button of document.querySelectorAll('[data-jump]')) button.addEventListener('click', () => {
  const current = levelNumber(fields.current.value);
  if (!Number.isSafeInteger(current)) return;
  const last = ladderFor(state.mode, state.season).costs.length - 1;
  fields.target.value = String(button.dataset.jump === 'max' ? last : Math.min(last, current + Number(button.dataset.jump)));
  readFields();
  render();
});
$('#reset-button').addEventListener('click', () => {
  state = defaults();
  writeFields();
  $('#reference-search').value = '';
  tableKey = '';
  history.replaceState(null, '', location.pathname + location.hash);
  render();
  showToast('Plan reset.');
});
$('#copy-exact').addEventListener('click', async () => {
  if (!latestResult) return;
  try { await navigator.clipboard.writeText(String(latestResult.remaining)); showToast('Exact XP copied.'); }
  catch { showToast('Clipboard access is unavailable.'); }
});
$('#share-button').addEventListener('click', async () => {
  if (!latestResult) return;
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('mode', state.mode);
  if (state.mode === 'season') url.searchParams.set('season', String(state.season));
  for (const [key, value] of Object.entries(activeDraft())) if (value !== '') url.searchParams.set(key, value);
  try { await navigator.clipboard.writeText(url.toString()); showToast('Shareable plan link copied.'); }
  catch { showToast('Clipboard access is unavailable.'); }
});

const dateLabel = new Date(`${snapshotDate}T12:00:00`);
$('#snapshot-tag').textContent = `XP DATA • ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(dateLabel).toUpperCase()}`;
writeFields();
render();
