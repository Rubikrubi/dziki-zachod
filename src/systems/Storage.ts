import { CONFIG, SkinId } from '../config';
import { upsertLeaderboard, type LbEntry } from './scoring';

/**
 * Persystencja (localStorage) — jedyne miejsce w kodzie, które zna
 * klucze magazynu. Bezpieczna na wypadek zablokowanego localStorage
 * (np. tryb prywatny Safari) — wtedy działa jak no-op.
 */
export const Storage = {
  getHighscore(): number {
    try {
      return Number(localStorage.getItem(CONFIG.storage.highscore) || 0);
    } catch {
      return 0;
    }
  },

  /** zapisuje wynik, jeśli jest nowym rekordem; zwraca true przy rekordzie */
  submitScore(score: number): boolean {
    const hi = this.getHighscore();
    if (score <= hi) return false;
    try {
      localStorage.setItem(CONFIG.storage.highscore, String(score));
    } catch {
      /* brak dostępu do localStorage — ignorujemy */
    }
    return true;
  },

  /** wybrana postać (domyślnie 'A' — Kowboj) */
  getSkin(): SkinId {
    try {
      const v = localStorage.getItem(CONFIG.storage.skin);
      return v === 'B' ? 'B' : 'A';
    } catch {
      return 'A';
    }
  },

  setSkin(skin: SkinId): void {
    try {
      localStorage.setItem(CONFIG.storage.skin, skin);
    } catch {
      /* no-op */
    }
  },

  getPlayerName(): string {
    try {
      return localStorage.getItem(CONFIG.storage.playerName) || '';
    } catch {
      return '';
    }
  },

  setPlayerName(name: string): void {
    try {
      localStorage.setItem(CONFIG.storage.playerName, name);
    } catch {
      /* no-op */
    }
  },

  getLeaderboard(): LbEntry[] {
    try {
      const raw = localStorage.getItem(CONFIG.storage.leaderboard);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (e): e is LbEntry => e && typeof e.name === 'string' && typeof e.score === 'number'
      );
    } catch {
      return [];
    }
  },

  /** Zapisuje wynik gracza (best-per-nick). Zwraca pozycję i czy to nowy rekord gracza. */
  submitToLeaderboard(name: string, score: number): { rank: number; isNewBest: boolean } {
    const current = this.getLeaderboard();
    const { list, rank, isNewBest } = upsertLeaderboard(current, name, score, CONFIG.leaderboard.maxEntries);
    try {
      localStorage.setItem(CONFIG.storage.leaderboard, JSON.stringify(list));
    } catch {
      /* no-op */
    }
    return { rank, isNewBest };
  },
};
