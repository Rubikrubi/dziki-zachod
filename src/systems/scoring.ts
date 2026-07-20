/**
 * Czysta logika punktacji — bez zależności od Phasera i localStorage.
 * Wydzielona, by była testowalna jednostkowo.
 */

export type Medal = 'gold' | 'silver' | 'bronze' | 'none';

export interface TimeCfg {
  defaultPar: number;
  goldFactor: number;
  silverFactor: number;
  bronzeFactor: number;
  goldBonus: number;
  silverBonus: number;
  bronzeBonus: number;
}

export interface TimeBonus {
  medal: Medal;
  bonus: number;
  seconds: number;
}

export interface LbEntry {
  name: string;
  score: number;
}

/** Medal + bonus punktowy za czas ukończenia poziomu (progi liczone od par). */
export function computeTimeBonus(seconds: number, par: number, cfg: TimeCfg): TimeBonus {
  if (seconds < par * cfg.goldFactor) return { medal: 'gold', bonus: cfg.goldBonus, seconds };
  if (seconds < par * cfg.silverFactor) return { medal: 'silver', bonus: cfg.silverBonus, seconds };
  if (seconds < par * cfg.bronzeFactor) return { medal: 'bronze', bonus: cfg.bronzeBonus, seconds };
  return { medal: 'none', bonus: 0, seconds };
}

/**
 * Wstawia/aktualizuje wynik gracza (best-per-nick, case-insensitive).
 * Aktualizuje tylko gdy nowy wynik jest wyższy. Sortuje malejąco, przycina do maxEntries.
 * rank = 1-indexed pozycja gracza po przycięciu, lub -1 gdy wypadł poza listę.
 */
export function upsertLeaderboard(
  list: LbEntry[],
  name: string,
  score: number,
  maxEntries: number
): { list: LbEntry[]; rank: number; isNewBest: boolean } {
  const key = name.trim().toLowerCase();
  const next = list.map((e) => ({ ...e }));
  const idx = next.findIndex((e) => e.name.trim().toLowerCase() === key);
  let isNewBest = false;
  if (idx === -1) {
    next.push({ name: name.trim(), score });
    isNewBest = true;
  } else if (score > next[idx].score) {
    next[idx] = { name: next[idx].name, score };
    isNewBest = true;
  }
  next.sort((a, b) => b.score - a.score);
  const trimmed = next.slice(0, maxEntries);
  const pos = trimmed.findIndex((e) => e.name.trim().toLowerCase() === key);
  return { list: trimmed, rank: pos === -1 ? -1 : pos + 1, isNewBest };
}

/** Sekundy -> "M:SS". */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
