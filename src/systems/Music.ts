import { Howl } from 'howler';
import { CONFIG } from '../config';

/**
 * System muzyki — 3 proceduralnie syntezowane utwory w klimacie dzikiego
 * zachodu. Utwory są renderowane OfflineAudioContextem do bufora WAV
 * i odtwarzane przez Howler w pętli. Zero plików do pobrania, zero praw
 * autorskich, natychmiastowa zmiana balansu melodii w kodzie.
 *
 * Wybór (0..2 lub -1 = wyłączona) trwale zapisywany w localStorage.
 */

const STORAGE_KEY = CONFIG.storage.music;
const SAMPLE_RATE = 22050;
const VOLUME = 0.32;

/** częstotliwość z numeru MIDI (69 = A4 = 440 Hz) */
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface ToneOpts {
  t: number;
  dur: number;
  freq: number;
  type?: OscillatorType;
  vol?: number;
  attack?: number;
  /** wibrato (gwizdanie, smyczki) */
  vibHz?: number;
  vibCents?: number;
  /** drugi oscylator lekko odstrojony (pełniejsze brzmienie pianina) */
  detune?: number;
}

/** pojedyncza nuta: oscylator + obwiednia głośności */
function tone(ctx: OfflineAudioContext, o: ToneOpts): void {
  const vol = o.vol ?? 0.2;
  const attack = o.attack ?? 0.01;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, o.t);
  gain.gain.linearRampToValueAtTime(vol, o.t + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, o.t + o.dur);
  gain.connect(ctx.destination);

  const mkOsc = (detuneCents: number) => {
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.value = o.freq;
    osc.detune.value = detuneCents;
    if (o.vibHz) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = o.vibHz;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = o.vibCents ?? 12;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start(o.t);
      lfo.stop(o.t + o.dur);
    }
    osc.connect(gain);
    osc.start(o.t);
    osc.stop(o.t + o.dur + 0.02);
  };
  mkOsc(0);
  if (o.detune) mkOsc(o.detune);
}

/** perkusyjny "klip-klop" / shaker — krótki impuls szumu przez filtr */
function thump(ctx: OfflineAudioContext, t: number, dur: number, vol: number, freq: number): void {
  const len = Math.ceil(dur * ctx.sampleRate);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 1.5;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
}

// ==================== UTWORY ====================

/** 1. "Samotna Preria" — powolny gwizd z wibratem + gitarowe szarpnięcia (Am pent., 72 bpm) */
function buildPreria(ctx: OfflineAudioContext): void {
  const beat = 60 / 72;
  // melodia gwizdana (A-mol pentatonika): [midi, start w beatach, długość w beatach]
  const melody: Array<[number, number, number]> = [
    [76, 0, 1.5], [79, 1.5, 0.5], [81, 2, 2], [79, 4, 1], [76, 5, 1], [74, 6, 2],
    [76, 8, 1.5], [74, 9.5, 0.5], [72, 10, 2], [69, 12, 4],
    [76, 16, 1.5], [79, 17.5, 0.5], [81, 18, 2], [84, 20, 1], [81, 21, 1], [79, 22, 2],
    [76, 24, 2], [74, 26, 1], [72, 27, 1], [69, 28, 4],
  ];
  for (const [note, start, len] of melody) {
    tone(ctx, { t: start * beat, dur: len * beat * 0.95, freq: midi(note), type: 'sine', vol: 0.16, attack: 0.06, vibHz: 5.5, vibCents: 18 });
  }
  // gitara: arpeggio co takt (Am / G / F / E)
  const chords = [
    [45, 52, 57, 60], [43, 50, 55, 59], [41, 48, 53, 57], [40, 47, 52, 56],
  ];
  for (let bar = 0; bar < 8; bar++) {
    const chord = chords[bar % 4];
    chord.forEach((n, i) => {
      tone(ctx, { t: (bar * 4 + i * 0.28) * beat, dur: beat * 2.2, freq: midi(n), type: 'triangle', vol: 0.075, attack: 0.005 });
    });
  }
}

/** 2. "Dziki Galop" — pędzący rytm kopyt + banjo (Dm pent., 150 bpm) */
function buildGalop(ctx: OfflineAudioContext): void {
  const beat = 60 / 150;
  const bars = 16;
  // galop: "ta-da-DUM" — klip-klopy
  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * 4 * beat;
    for (const off of [0, 0.75, 1.5, 2, 2.75, 3.5]) {
      thump(ctx, t0 + off * beat, 0.06, 0.22, off % 2 === 0 ? 900 : 1400);
    }
    // bas (D2 / A1 na przemian)
    tone(ctx, { t: t0, dur: beat * 0.9, freq: midi(38), type: 'triangle', vol: 0.22, attack: 0.005 });
    tone(ctx, { t: t0 + 2 * beat, dur: beat * 0.9, freq: midi(bar % 2 === 0 ? 33 : 36), type: 'triangle', vol: 0.2, attack: 0.005 });
  }
  // banjo — szybkie szarpane frazy (D-mol pentatonika)
  const riff: Array<[number, number]> = [
    [62, 0], [65, 0.5], [67, 1], [69, 1.5], [67, 2], [65, 2.5], [62, 3], [65, 3.5],
    [69, 4], [72, 4.5], [74, 5], [72, 5.5], [69, 6], [67, 6.5], [65, 7], [62, 7.5],
  ];
  for (let rep = 0; rep < 4; rep++) {
    for (const [note, off] of riff) {
      const t = (rep * 8 + off) * 2 * beat;
      tone(ctx, { t, dur: beat * 0.7, freq: midi(note + (rep % 2 === 0 ? 0 : 12)), type: 'square', vol: 0.055, attack: 0.003 });
    }
  }
}

/** 3. "Pianino w Saloonie" — honky-tonk: bas-akord + skoczna melodia (C-dur, 126 bpm) */
function buildSaloon(ctx: OfflineAudioContext): void {
  const beat = 60 / 126;
  // progresja: C C F C / G7 F C G7 (8 taktów)
  const bassNotes = [36, 36, 41, 36, 43, 41, 36, 43];
  const chords: number[][] = [
    [60, 64, 67], [60, 64, 67], [60, 65, 69], [60, 64, 67],
    [59, 65, 67], [60, 65, 69], [60, 64, 67], [59, 65, 67],
  ];
  for (let bar = 0; bar < 8; bar++) {
    const t0 = bar * 4 * beat;
    // bas na 1 i 3 (oktawa niżej + kwinta)
    tone(ctx, { t: t0, dur: beat * 0.85, freq: midi(bassNotes[bar]), type: 'triangle', vol: 0.2, attack: 0.004, detune: 6 });
    tone(ctx, { t: t0 + 2 * beat, dur: beat * 0.85, freq: midi(bassNotes[bar] + 7), type: 'triangle', vol: 0.18, attack: 0.004, detune: 6 });
    // "stab" akordu na 2 i 4 (honky-tonk: lekko odstrojone)
    for (const off of [1, 3]) {
      for (const n of chords[bar]) {
        tone(ctx, { t: t0 + off * beat, dur: beat * 0.55, freq: midi(n), type: 'triangle', vol: 0.06, attack: 0.003, detune: 9 });
      }
    }
  }
  // melodia — skoczne ósemki
  const melody: Array<[number, number, number]> = [
    [72, 0, 0.5], [76, 0.5, 0.5], [79, 1, 1], [76, 2, 0.5], [72, 2.5, 0.5], [74, 3, 1],
    [72, 4, 0.5], [76, 4.5, 0.5], [79, 5, 1], [84, 6, 2],
    [81, 8, 0.5], [79, 8.5, 0.5], [77, 9, 1], [76, 10, 0.5], [74, 10.5, 0.5], [72, 11, 1],
    [74, 12, 0.5], [76, 12.5, 0.5], [77, 13, 1], [79, 14, 2],
    [79, 16, 0.5], [77, 16.5, 0.5], [76, 17, 1], [72, 18, 0.5], [76, 18.5, 0.5], [79, 19, 1],
    [84, 20, 1], [81, 21, 1], [79, 22, 2],
    [76, 24, 0.5], [74, 24.5, 0.5], [72, 25, 1], [67, 26, 0.5], [72, 26.5, 0.5], [76, 27, 1],
    [72, 28, 3],
  ];
  for (const [note, start, len] of melody) {
    tone(ctx, { t: start * beat, dur: len * beat * 0.9, freq: midi(note), type: 'triangle', vol: 0.11, attack: 0.004, detune: 8 });
  }
}

// ==================== RENDER / WAV ====================

/** koduje AudioBuffer (mono) do WAV (PCM16) */
function wavEncode(buf: AudioBuffer): ArrayBuffer {
  const data = buf.getChannelData(0);
  const out = new ArrayBuffer(44 + data.length * 2);
  const v = new DataView(out);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  v.setUint32(4, 36 + data.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeStr(36, 'data');
  v.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

async function renderTrack(build: (ctx: OfflineAudioContext) => void, seconds: number): Promise<string> {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE);
  build(ctx);
  const rendered = await ctx.startRendering();
  return URL.createObjectURL(new Blob([wavEncode(rendered)], { type: 'audio/wav' }));
}

// ==================== MENEDŻER ====================

export interface TrackInfo {
  name: string;
  icon: string;
}

/** utwory dostępne w menu opcji (kolejność = id) */
export const TRACKS: TrackInfo[] = [
  { name: 'Samotna Preria', icon: '🌵' },
  { name: 'Dziki Galop', icon: '🐎' },
  { name: 'Saloon', icon: '🎹' },
];

const BUILDERS: Array<{ build: (ctx: OfflineAudioContext) => void; seconds: number }> = [
  { build: buildPreria, seconds: (60 / 72) * 32 },
  { build: buildGalop, seconds: (60 / 150) * 64 },
  { build: buildSaloon, seconds: (60 / 126) * 32 },
];

/**
 * Singleton muzyki. Renderuje utwory leniwie (pierwsze użycie),
 * odtwarza w pętli przez Howler, pamięta wybór w localStorage.
 * startSelected() wolno wołać dopiero po geście użytkownika.
 */
class MusicManager {
  private howls: (Howl | null)[] = [null, null, null];
  private rendering: (Promise<Howl> | null)[] = [null, null, null];
  private current: Howl | null = null;
  private currentId = -2; // -2 = nic nie gra, -1 = wybrano "wyłączona"

  /** aktualny wybór gracza: -1 wyłączona, 0..2 utwór */
  get selection(): number {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const n = raw === null ? 0 : parseInt(raw, 10);
      return Number.isFinite(n) && n >= -1 && n < TRACKS.length ? n : 0;
    } catch {
      return 0;
    }
  }

  private async getHowl(id: number): Promise<Howl> {
    if (this.howls[id]) return this.howls[id]!;
    if (!this.rendering[id]) {
      this.rendering[id] = renderTrack(BUILDERS[id].build, BUILDERS[id].seconds).then((url) => {
        const h = new Howl({ src: [url], format: ['wav'], loop: true, volume: VOLUME });
        this.howls[id] = h;
        return h;
      });
    }
    return this.rendering[id]!;
  }

  /** zmiana wyboru z menu (gest użytkownika) — zapis + natychmiastowe odtworzenie */
  async setSelection(id: number): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* localStorage niedostępny — wybór zadziała do przeładowania */
    }
    if (id === this.currentId) return;
    this.current?.stop();
    this.current = null;
    this.currentId = id;
    if (id < 0) return;
    const h = await this.getHowl(id);
    // wybór mógł się zmienić w trakcie renderowania
    if (this.currentId !== id) return;
    this.current = h;
    h.play();
  }

  /** uruchamia zapamiętany utwór, jeśli jeszcze nie gra (po geście użytkownika) */
  startSelected(): void {
    const sel = this.selection;
    if (sel >= 0 && this.currentId !== sel) void this.setSelection(sel);
  }
}

export const music = new MusicManager();
