import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, cumulative, ladderFor, normalRank, parseXp, shortXp, formatHours, MAX_LEVEL } from '../assets/calculator.js';
import { normalCosts, seasonLadders } from '../assets/xp-data.js';

const normalCheckpoints = { 70: 1163263, 100: 16108066, 130: 140115452, 160: 1072268042, 190: 16725913668, 220: 123188303310, 250: 898316800466 };
const seasonTotals = { 1: 116507521, 2: 1925200752, 3: 15891806242, 4: 229321808778, 5: 1692972522328 };

test('all 250 normal level costs match published cumulative checkpoints', () => {
  assert.equal(MAX_LEVEL, 250);
  const totals = cumulative(normalCosts);
  for (const [level, value] of Object.entries(normalCheckpoints)) assert.equal(totals[Number(level)], value);
});

test('every season ladder has exactly the published entries and total', () => {
  for (const season of seasonLadders) {
    assert.equal(season.costs.length, season.limit + 1, `Season ${season.id} length`);
    assert.equal(cumulative(season.costs).at(-1), seasonTotals[season.id], `Season ${season.id} total`);
    assert.ok(season.costs.every(Number.isSafeInteger), `Season ${season.id} exact integers`);
    assert.equal(season.costs[0], 0);
  }
});

test('normal XP: level 70 to 100 and partial next-level XP', () => {
  assert.equal(calculate({ current: 70, target: 100 }).remaining, 14944803);
  assert.equal(calculate({ current: 70, target: 71, earned: 97114 }).remaining, 100000);
  assert.equal(calculate({ current: 70, target: 100, earned: 97114, hourly: 1000000 }).hours, (14944803 - 97114) / 1000000);
});

test('season XP is a separate pool with shown cap + season level', () => {
  const result = calculate({ mode: 'season', season: 1, current: 0, target: 70 });
  assert.equal(result.remaining, seasonTotals[1]);
  assert.equal(result.shownCurrent, 100);
  assert.equal(result.shownTarget, 170);
  assert.equal(result.score, 7000);
  assert.equal(calculate({ mode: 'season', season: 2, current: 30, target: 31 }).remaining, 12314799);
});

test('endpoints, same-level targets and maxed out ladders', () => {
  assert.equal(calculate({ current: 1, target: 1 }).remaining, 0);
  assert.equal(calculate({ current: 250, target: 250 }).remaining, 0);
  assert.equal(calculate({ mode: 'season', season: 5, current: 150, target: 150 }).remaining, 0);
  assert.equal(ladderFor('season', 5).limit, 150);
});

test('invalid levels and progress cannot cause inaccurate totals', () => {
  assert.throws(() => calculate({ current: 100, target: 70 }), RangeError);
  assert.throws(() => calculate({ current: 250, target: 251 }), RangeError);
  assert.throws(() => calculate({ current: 70, target: 71, earned: 197114 }), RangeError);
  assert.throws(() => calculate({ mode: 'season', season: 1, current: 71, target: 71 }), RangeError);
  assert.throws(() => ladderFor('season', 6), RangeError);
  assert.throws(() => calculate({ current: 1, target: 100, hourly: -1 }), RangeError);
});

test('user-friendly quantities and rank boundaries', () => {
  assert.equal(parseXp('1.5m'), 1500000);
  assert.equal(parseXp('1,230,456'), 1230456);
  assert.equal(parseXp('1.25B'), 1250000000);
  assert.equal(parseXp(''), 0);
  assert.equal(parseXp('1.1'), null);
  assert.equal(parseXp('-7K'), null);
  assert.equal(shortXp(1692972522328), '1.69T');
  assert.equal(normalRank(70), 'Elite III');
  assert.equal(normalRank(71), 'Expert I');
});

test('XP/hour estimates show minutes, hours and days', () => {
  assert.equal(calculate({ current: 70, target: 71, hourly: 50000 }).hours, 197114 / 50000);
  assert.equal(calculate({ current: 70, target: 70 }).hours, 0);
  assert.equal(calculate({ current: 70, target: 71 }).hours, null);
  assert.equal(formatHours(0), '0m');
  assert.equal(formatHours(0.5), '30m');
  assert.equal(formatHours(1.5), '1h 30m');
  assert.equal(formatHours(50.5), '2d 3h');
  assert.equal(formatHours(null), '—');
});
