/**
 * Centralna konfiguracja gry — cały balans i stałe w jednym miejscu.
 * Zmiana wartości tutaj NIE wymaga dotykania logiki gry.
 * `as const` daje literalne typy i chroni przed przypadkową mutacją.
 */
export const CONFIG = {
  /** Fizyka świata */
  physics: {
    gravityY: 900,
    /** dodatkowa grawitacja przy opadaniu — skok jest "cięższy" w dół (game feel) */
    extraFallGravity: 700,
  },

  /** Parametry ruchu i ciała gracza */
  player: {
    moveSpeed: 270,
    accel: 2000,
    drag: 1800,
    /** wyższy skok — pozwala sięgnąć wszystkie monety na mapach */
    jumpVel: -720,
    springVel: -980,
    maxVelX: 400,
    maxVelY: 1100,
    /** ms tolerancji skoku po zejściu z krawędzi */
    coyoteMs: 100,
    /** ms buforowania wciśnięcia skoku przed lądowaniem */
    bufferMs: 130,
    /** wybicie po zgnieceniu wroga */
    stompBounce: -430,
    /** nietykalność po otrzymaniu obrażeń */
    hurtInvulnMs: 1500,
    scale: 0.3,
    /** dopasowane do cowboy_stand_v4: zawartość 168x256 px od (44,0) */
    body: { w: 145, h: 240, offX: 55, offY: 12 },
    /** wspinaczka po drabinie */
    climbSpeed: 180,
    climbSideSpeed: 110,
    ladderJumpFactor: 0.75,
    /** animacja "bujania" podczas biegu */
    walkWobbleSpeed: 14,
    walkWobbleDeg: 5,
    /** ms na klatkę animacji wspinaczki (przekładanie rąk) */
    climbFrameMs: 160,
  },

  /** Broń palna i dynamit */
  combat: {
    bulletSpeed: 760,
    bulletLifeMs: 1200,
    fireCooldownMs: 280,
    startAmmo: 6,
    maxAmmo: 12,
    ammoPickup: 4,
    recoilPush: 60,
    dynamiteFuseMs: 1500,
    dynamiteRadius: 190,
    dynamiteCooldownMs: 600,
    /** część promienia, w której wybuch rani samego gracza */
    dynamiteSelfRadiusFactor: 0.6,
    /** pociski dum-dum — jedyna broń na bossa; minimalna liczba monet w sklepie.
     *  Pakiet > HP bossa (3) daje margines na spudłowane strzały — bez tego
     *  jedno pudło = softlock (sklep jednorazowy, brak innego źródła dum-dum). */
    dumdumMinCoins: 30,
    dumdumPackSize: 5,
  },

  /** Statystyki przeciwników (bazowe + skalowanie z numerem poziomu) */
  enemies: {
    bandit: { hp: 1, score: 25, patrolRange: 110, speedBase: 45, speedPerLevel: 18 },
    vulture: { hp: 1, score: 40, rangeBase: 90, rangePerLevel: 30, durationBase: 1300, durationPerLevel: 120 },
    scorpion: { hp: 2, score: 60, patrolRange: 140, speedBase: 85, speedPerLevel: 20 },
    /** super boss — niedźwiedź grizzly (tylko dum-dum go rani!) */
    boss: { hp: 3, score: 500, patrolRange: 140, speed: 45 },
    indian: {
      hp: 2,
      score: 50,
      patrolRange: 130,
      speedBase: 50,
      speedPerLevel: 12,
      chargeBase: 180,
      chargePerLevel: 25,
      /** zasięg wykrywania gracza (px w poziomie, kafle w pionie) */
      sightX: 320,
      sightYTiles: 1.6,
    },
  },

  /** Wartości znajdziek i skrzyń */
  loot: {
    coin: 10,
    /** diament: wartość = 2 × wartość zebranych monet (min. gemMin) */
    gemMin: 50,
    gemCoinsMultiplier: 2,
    heartWhenFullScore: 50,
    artifactScore: 100,
    chest: { coinMin: 30, coinMax: 60, ammo: 5, dynamite: 2, heartWhenFullScore: 75 },
  },

  /** Bonus za ukończenie poziomu: base + perHeart * serca */
  levelBonus: { base: 100, perHeart: 50 },

  /** Bonus za czas ukończenia poziomu (progi liczone od par danego poziomu) */
  time: {
    defaultPar: 50,
    goldFactor: 0.5,
    silverFactor: 1.0,
    bronzeFactor: 1.5,
    goldBonus: 200,
    silverBonus: 100,
    bronzeBonus: 50,
  },

  /** Ranking graczy (localStorage) */
  leaderboard: {
    maxEntries: 10,
    maxNameLen: 14,
  },

  /** Typografia UI */
  ui: {
    fontUI: '"Baloo 2", sans-serif',
    fontWest: '"Rye", "Baloo 2", serif',
  },

  /** Klucze localStorage */
  storage: {
    highscore: 'ks-highscore',
    skin: 'ks-skin',
    music: 'ks-music',
    playerName: 'ks-player',
    leaderboard: 'ks-leaderboard',
  },
} as const;

/** Identyfikator grywalnej postaci */
export type SkinId = 'A' | 'B';

/** Skórki grywalnych postaci — klucze tekstur + nazwa do UI.
 *  climb1/climb2 — klatki wspinaczki (widok od tyłu, wspólne dla obu skórek). */
export const SKINS: Record<SkinId, { stand: string; jump: string; shoot: string; climb1: string; climb2: string; name: string }> = {
  A: { stand: 'cowboy_stand', jump: 'cowboy_jump', shoot: 'cowboy_shoot', climb1: 'cowboy_climb1', climb2: 'cowboy_climb2', name: 'Kowboj' },
  B: { stand: 'cowgirl_stand', jump: 'cowgirl_jump', shoot: 'cowgirl_shoot', climb1: 'cowgirl_climb1', climb2: 'cowgirl_climb2', name: 'Kowbojka' },
};

// Re-eksport dla wygody — moduły konfiguracyjne importują wszystko z jednego miejsca
export { TILE } from './levels';
