import { normalCosts, seasonLadders, snapshotDate } from './xp-data.js';
export { snapshotDate };

export const seasonOptions = seasonLadders.map(({ id, name, rank, cap, limit }) => ({ id, name, rank, cap, limit }));
export const MAX_LEVEL = normalCosts.length - 1;

const numberFormat = new Intl.NumberFormat('en-US');
const suffixes = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];

export function formatXp(value) {
  return numberFormat.format(value);
}

export function shortXp(value) {
  if (value < 100000) return formatXp(value);
  const [unit, symbol] = suffixes.find(([unit]) => value >= unit);
  const scaled = value / unit;
  const digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(scaled)}${symbol}`;
}

export function parseXp(raw) {
  if (raw == null || String(raw).trim() === '') return 0;
  const cleaned = String(raw).trim().replace(/[\s,_]/g, '');
  const match = /^(\d+(?:\.\d+)?)([kmbt])?$/i.exec(cleaned);
  if (!match) return null;
  const multiplier = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[match[2]?.toLowerCase()] ?? 1;
  const value = Number(match[1]) * multiplier;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function ladderFor(mode, seasonId) {
  if (mode === 'normal') return { costs: normalCosts, cap: MAX_LEVEL, start: 1, rank: 'Player', name: 'All ranks', id: 0 };
  const season = seasonLadders.find((item) => item.id === Number(seasonId));
  if (!season) throw new RangeError('Choose a supported season.');
  return { ...season, start: 0 };
}

export function cumulative(costs) {
  const totals = [costs[0]];
  for (let i = 1; i < costs.length; i++) totals[i] = totals[i - 1] + costs[i];
  return totals;
}

export function normalRank(level) {
  if (level <= 10) return 'Unranked';
  const groups = [
    [40, 10, 'Apprentice'], [70, 40, 'Elite'], [100, 70, 'Expert'],
    [130, 100, 'Champion'], [160, 130, 'Master'], [190, 160, 'Paragon'],
    [220, 190, 'Saint'], [250, 220, 'Ethereal']
  ];
  const [, beginning, rank] = groups.find(([end]) => level <= end) ?? groups.at(-1);
  return `${rank} ${['I', 'II', 'III'][Math.floor((level - beginning - 1) / 10)]}`;
}

export function calculate({ mode = 'normal', season = 1, current, target, earned = 0, daily = 0 }) {
  const ladder = ladderFor(mode, season);
  const last = ladder.costs.length - 1;
  const min = ladder.start;
  if (![current, target, earned, daily].every(Number.isSafeInteger)) throw new RangeError('Enter whole numbers.');
  if (current < min || current > last || target < current || target > last) {
    throw new RangeError(`Choose levels between ${min} and ${last}, with your target at or above your current level.`);
  }
  if (earned < 0 || daily < 0) throw new RangeError('XP cannot be negative.');
  const nextCost = current < last ? ladder.costs[current + 1] : 0;
  if (earned >= nextCost && nextCost !== 0) {
    throw new RangeError(`XP into this level must be less than ${formatXp(nextCost)}. Raise your current level if you already filled it.`);
  }
  if (nextCost === 0 && earned > 0) throw new RangeError('You are already at the final level of this ladder.');

  const totals = cumulative(ladder.costs);
  const remaining = Math.max(0, totals[target] - totals[current] - earned);
  const progress = target === current ? 100 : Math.min(100, ((totals[current] + earned) / totals[target]) * 100);
  return {
    ...ladder,
    current, target, earned, daily, remaining, nextCost,
    nextRemaining: Math.max(0, nextCost - earned),
    levels: target - current,
    totalToTarget: totals[target],
    totalAtCurrent: totals[current] + earned,
    progress,
    days: daily > 0 ? Math.ceil(remaining / daily) : null,
    shownCurrent: mode === 'season' ? ladder.cap + current : current,
    shownTarget: mode === 'season' ? ladder.cap + target : target,
    score: mode === 'season' ? target * 100 : null
  };
}
