import { describe, it, expect } from 'vitest';
import { computeTimeBonus, upsertLeaderboard, formatTime, type TimeCfg } from '../src/systems/scoring';

const cfg: TimeCfg = {
  defaultPar: 50,
  goldFactor: 0.5,
  silverFactor: 1.0,
  bronzeFactor: 1.5,
  goldBonus: 200,
  silverBonus: 100,
  bronzeBonus: 50,
};

describe('computeTimeBonus', () => {
  it('złoto poniżej par*0.5', () => {
    expect(computeTimeBonus(19, 40, cfg)).toMatchObject({ medal: 'gold', bonus: 200 });
  });
  it('srebro między par*0.5 a par', () => {
    expect(computeTimeBonus(30, 40, cfg)).toMatchObject({ medal: 'silver', bonus: 100 });
  });
  it('brąz między par a par*1.5', () => {
    expect(computeTimeBonus(50, 40, cfg)).toMatchObject({ medal: 'bronze', bonus: 50 });
  });
  it('brak przy par*1.5 i wolniej', () => {
    expect(computeTimeBonus(60, 40, cfg)).toMatchObject({ medal: 'none', bonus: 0 });
  });
  it('dokładnie par => brąz (granica srebra wyłączna)', () => {
    expect(computeTimeBonus(40, 40, cfg).medal).toBe('bronze');
  });
  it('granica złota jest wyłączna (par*0.5 to już srebro)', () => {
    expect(computeTimeBonus(20, 40, cfg).medal).toBe('silver');
  });
  it('zwraca sekundy w wyniku', () => {
    expect(computeTimeBonus(12.5, 40, cfg).seconds).toBe(12.5);
  });
});

describe('upsertLeaderboard', () => {
  it('dodaje nowy nick', () => {
    const r = upsertLeaderboard([], 'Jan', 100, 10);
    expect(r.list).toEqual([{ name: 'Jan', score: 100 }]);
    expect(r.rank).toBe(1);
    expect(r.isNewBest).toBe(true);
  });
  it('aktualizuje przy wyższym wyniku', () => {
    const r = upsertLeaderboard([{ name: 'Jan', score: 100 }], 'Jan', 150, 10);
    expect(r.list).toEqual([{ name: 'Jan', score: 150 }]);
    expect(r.isNewBest).toBe(true);
  });
  it('zachowuje stary przy niższym wyniku', () => {
    const r = upsertLeaderboard([{ name: 'Jan', score: 100 }], 'Jan', 50, 10);
    expect(r.list).toEqual([{ name: 'Jan', score: 100 }]);
    expect(r.isNewBest).toBe(false);
  });
  it('dopasowanie case-insensitive (jeden wpis na nick)', () => {
    const r = upsertLeaderboard([{ name: 'Jan', score: 100 }], 'JAN', 200, 10);
    expect(r.list.length).toBe(1);
    expect(r.list[0].score).toBe(200);
  });
  it('sortuje malejąco i przycina do maxEntries', () => {
    const start = [{ name: 'A', score: 10 }, { name: 'B', score: 20 }];
    const r = upsertLeaderboard(start, 'C', 30, 2);
    expect(r.list).toEqual([{ name: 'C', score: 30 }, { name: 'B', score: 20 }]);
    expect(r.rank).toBe(1);
  });
  it('rank -1 gdy gracz wypadł poza przyciętą listę', () => {
    const start = [{ name: 'A', score: 100 }, { name: 'B', score: 90 }];
    const r = upsertLeaderboard(start, 'C', 5, 2);
    expect(r.rank).toBe(-1);
  });
  it('nie aktualizuje przy równym wyniku', () => {
    const r = upsertLeaderboard([{ name: 'Jan', score: 100 }], 'Jan', 100, 10);
    expect(r.list).toEqual([{ name: 'Jan', score: 100 }]);
    expect(r.isNewBest).toBe(false);
  });
  it('zachowuje oryginalną pisownię nicku przy aktualizacji', () => {
    const r = upsertLeaderboard([{ name: 'Jan', score: 100 }], 'JAN', 200, 10);
    expect(r.list[0].name).toBe('Jan');
    expect(r.list[0].score).toBe(200);
  });
});

describe('formatTime', () => {
  it('formatuje m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(9)).toBe('0:09');
    expect(formatTime(65)).toBe('1:05');
  });
});
