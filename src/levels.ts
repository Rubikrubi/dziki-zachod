// Legenda:
// # = wierzch terenu, = = wypełnienie, ^ = lawa, - = półka (jednokierunkowa)
// L = drabina (wspinaczka: ↑/↓), T = skrzynia z losowym skarbem
// c = moneta, g = klejnot, h = serce, a = amunicja, ? = skrzynka z monetą
// d = dynamit (podkładasz klawiszem C), A = Gwiazda Szeryfa — nieśmiertelność (działa do końca poziomu!)
// s = czarny bandyta, f = sęp (lata), e = skorpion (szybki), i = Indianin (szarżuje!)
// G = SUPER BOSS niedźwiedź grizzly (tylko pociski dum-dum!), S = sklep z dum-dum
// j = sprężyna, M = ruchoma platforma (poziomo), V = ruchoma platforma (pionowo)
// C = checkpoint, P = start gracza, F = flaga (meta)
// b = kaktus, m = płot, r = kamień

/** Rozmiar kafelka siatki poziomów (px) — jedno źródło prawdy */
export const TILE = 64;

export interface LevelTheme {
  tile: string; // prefiks kafelków Kenney: sand / dirt / stone
  bg: string; // klucz tekstury tła
  bgTint: number;
}

export interface LevelDef {
  name: string;
  theme: LevelTheme;
  rows: string[];
  /** Par-czas ukończenia (sekundy) do bonusu za czas; brak => CONFIG.time.defaultPar */
  par?: number;
}

// ---------- generator siatki dla nowych poziomów ----------
type SetFn = (c: number, r: number, ch: string) => void;
type HLineFn = (c1: number, c2: number, r: number, ch: string) => void;
type VLineFn = (c: number, r1: number, r2: number, ch: string) => void;

function makeLevel(width: number, gaps: Array<[number, number]>, build: (set: SetFn, hline: HLineFn, vline: VLineFn) => void): string[] {
  const H = 12;
  const grid: string[][] = Array.from({ length: H }, () => Array(width).fill('.'));
  for (let c = 0; c < width; c++) {
    const inGap = gaps.some(([a, b]) => c >= a && c <= b);
    grid[9][c] = inGap ? '.' : '#';
    grid[10][c] = inGap ? '.' : '=';
    grid[11][c] = inGap ? '^' : '=';
  }
  const set: SetFn = (c, r, ch) => {
    if (r >= 0 && r < H && c >= 0 && c < width) grid[r][c] = ch;
  };
  const hline: HLineFn = (c1, c2, r, ch) => {
    for (let c = c1; c <= c2; c++) set(c, r, ch);
  };
  const vline: VLineFn = (c, r1, r2, ch) => {
    for (let r = r1; r <= r2; r++) set(c, r, ch);
  };
  build(set, hline, vline);
  return grid.map((r) => r.join(''));
}

export const LEVELS: LevelDef[] = [
  {
    name: 'Pustynny Kanion',
    par: 40,
    theme: { tile: 'sand', bg: 'bg_canyon', bgTint: 0xffffff },
    rows: [
      '........................................................',
      '........................................................',
      '........................................................',
      '...................ccc.........................g........',
      '.................L----........................---.......',
      '..............cccL.........h.............ccc.L..........',
      '.........?....---L......................---..L.........',
      '....ccc..........L...a.........d.............L..........',
      '..P.b.....T......Ls........j..i......C....a..L.b....F...',
      '#############...######....#######...######...###########',
      '=============...======....=======...======...===========',
      '=============^^^======^^^^=======^^^======^^^===========',
    ],
  },
  {
    name: 'Miasteczko Duchów',
    par: 42,
    theme: { tile: 'dirt', bg: 'bg_town', bgTint: 0xffffff },
    rows: [
      '........................................................',
      '........................................................',
      '........................................................',
      '........................................................',
      '...............................ccc....A.......g.........',
      '..................ccc..........---L...---...............',
      '....?.............---...f.........L....f.....ccc........',
      '.........ccc.....d......ccc..a....L...ccc...............',
      '..P..b....M.....s.......M.....C..eL....M..i.T.j..a..F...',
      '########......########......########......##############',
      '========^^^^^^========^^^^^^========^^^^^^==============',
      '========^^^^^^========^^^^^^========^^^^^^==============',
    ],
  },
  {
    name: 'Złota Kopalnia',
    par: 48,
    theme: { tile: 'stone', bg: 'bg_mine', bgTint: 0xffffff },
    rows: [
      '................................................................',
      '................................................................',
      '.........................................cgc....................',
      '........................................------..................',
      '....................f...............f.........L.................',
      '................ccc...........................L.................',
      '.....?..........---............h......a....d..L.................',
      '...........cc.......................cc......V.L.................',
      '..P...s..d...a....i.....M....C.e.....T...j....Lm...M.....b..F...',
      '##########....########.....########....##########.....##########',
      '==========^^^^========^^^^^========^^^^==========^^^^^==========',
      '==========^^^^========^^^^^========^^^^==========^^^^^==========',
    ],
  },
  {
    name: 'Nocna Przeprawa',
    par: 50,
    theme: { tile: 'sand', bg: 'bg_night', bgTint: 0xffffff },
    rows: [
      '.....................A....................................g.........',
      '...................L---.......f.....................h....ccc........',
      '...................L.....................................---........',
      '....?.............eL......................f.........................',
      '.........ccc..d....L..-....a......-...........c......a..d...........',
      '..P..s....M....i...L.......C.s........ei......M.....j...i.....b..F..',
      '########.....#######.....#######.....#######.....###################',
      '========^^^^^=======^^^^^=======^^^^^=======^^^^^===================',
      '========^^^^^=======^^^^^=======^^^^^=======^^^^^===================',
    ],
  },
  {
    name: 'Wąwóz Grzechotnika',
    par: 48,
    theme: { tile: 'sand', bg: 'bg_gorge', bgTint: 0xffffff },
    rows: makeLevel(64, [[10, 12], [24, 26], [38, 40], [52, 54]], (set, hline, vline) => {
      set(2, 8, 'P');
      set(5, 8, 'T');
      set(8, 8, 'd');
      // drabina nr 1 na platformę z monetami
      vline(20, 4, 8, 'L');
      hline(17, 19, 4, '-');
      hline(21, 23, 4, '-');
      hline(17, 23, 3, 'c');
      set(17, 8, 's');
      // serce na półce
      hline(29, 31, 7, '-');
      set(30, 6, 'h');
      set(31, 8, 'i');
      set(34, 8, 'C');
      // drabina nr 2 do artefaktu
      vline(46, 3, 8, 'L');
      hline(44, 45, 3, '-');
      hline(47, 48, 3, '-');
      set(46, 2, 'A');
      set(43, 8, 'e');
      set(49, 8, 'j');
      // klejnot na półce
      hline(59, 61, 6, '-');
      set(60, 5, 'g');
      set(58, 8, 's');
      set(60, 8, 'b');
      set(61, 8, 'F');
      set(15, 7, 'a');
      hline(28, 30, 5, 'c');
    }),
  },
  {
    name: 'Napad na Bank',
    par: 50,
    theme: { tile: 'dirt', bg: 'bg_bank', bgTint: 0xffffff },
    rows: makeLevel(66, [[9, 11], [22, 24], [37, 39], [50, 52]], (set, hline, vline) => {
      set(2, 8, 'P');
      set(3, 8, 'b');
      set(5, 8, 'd');
      set(8, 5, '?');
      set(10, 8, 'M');
      set(15, 8, 's');
      set(20, 5, 'f');
      // drabina do skarbca
      vline(28, 4, 8, 'L');
      hline(26, 27, 4, '-');
      hline(29, 30, 4, '-');
      hline(26, 30, 3, 'c');
      set(27, 7, 'a');
      set(31, 8, 'C');
      set(33, 8, 'T');
      set(38, 8, 'M');
      set(43, 8, 'e');
      hline(44, 46, 6, '-');
      set(45, 5, 'g');
      set(47, 8, 'j');
      hline(54, 56, 5, '-');
      set(55, 4, 'h');
      set(57, 8, 'i');
      set(61, 8, 'm');
      set(63, 8, 'F');
      hline(17, 19, 7, 'c');
    }),
  },
  {
    name: 'Szyb Diabła',
    par: 52,
    theme: { tile: 'stone', bg: 'bg_shaft', bgTint: 0xffffff },
    rows: makeLevel(68, [[12, 14], [26, 28], [40, 42], [54, 56]], (set, hline, vline) => {
      set(2, 8, 'P');
      set(4, 5, '?');
      set(6, 8, 's');
      set(8, 8, 'd');
      // wysoka drabina do serca
      vline(20, 3, 8, 'L');
      hline(18, 19, 3, '-');
      hline(21, 22, 3, '-');
      set(20, 2, 'h');
      set(17, 8, 'T');
      set(22, 7, 'a');
      set(25, 4, 'f');
      hline(29, 31, 6, '-');
      hline(29, 31, 5, 'c');
      set(31, 8, 'e');
      set(33, 6, 'V');
      set(35, 8, 'C');
      set(36, 8, 'i');
      set(45, 4, 'f');
      // drabina do klejnotu
      vline(48, 5, 8, 'L');
      hline(46, 47, 5, '-');
      hline(49, 50, 5, '-');
      set(48, 4, 'g');
      set(46, 4, 'c');
      set(50, 4, 'c');
      set(50, 8, 'j');
      set(59, 8, 'e');
      set(62, 8, 'b');
      set(65, 8, 'F');
    }),
  },
  {
    name: 'Prerie o Zmierzchu',
    par: 52,
    theme: { tile: 'sand', bg: 'bg_prairie', bgTint: 0xffffff },
    rows: makeLevel(68, [[12, 14], [26, 28], [40, 42], [54, 56]], (set, hline, vline) => {
      set(2, 8, 'P');
      set(3, 8, 'b');
      set(6, 8, 's');
      set(10, 5, 'f');
      hline(15, 17, 7, 'c');
      set(18, 8, 'd');
      set(20, 8, 'i');
      // wysoka drabina do artefaktu
      vline(30, 3, 8, 'L');
      hline(28, 29, 3, '-');
      hline(31, 32, 3, '-');
      set(30, 2, 'A');
      set(28, 2, 'c');
      set(32, 2, 'c');
      set(33, 7, 'a');
      set(35, 8, 'e');
      set(37, 8, 'C');
      set(42, 5, 'f');
      set(44, 8, 'T');
      hline(46, 48, 7, 'c');
      set(50, 8, 'i');
      hline(54, 56, 6, '-');
      set(55, 5, 'h');
      set(58, 8, 'j');
      set(60, 8, 's');
      set(62, 8, 'm');
      set(65, 8, 'F');
    }),
  },
  {
    name: 'Twierdza Bandytów',
    par: 55,
    theme: { tile: 'dirt', bg: 'bg_fortress', bgTint: 0xffffff },
    rows: makeLevel(70, [[10, 12], [24, 26], [38, 40], [52, 54]], (set, hline, vline) => {
      set(2, 8, 'P');
      set(2, 8, 'P');
      set(5, 8, 's');
      set(7, 8, 'd');
      set(13, 5, '?');
      set(15, 4, 'f');
      set(17, 8, 's');
      set(19, 7, 'a');
      set(21, 8, 'e');
      set(25, 8, 'M');
      set(29, 8, 'T');
      set(31, 8, 's');
      // drabina do klejnotu
      vline(34, 4, 8, 'L');
      hline(32, 33, 4, '-');
      hline(35, 36, 4, '-');
      hline(32, 33, 3, 'c');
      set(34, 3, 'g');
      hline(35, 36, 3, 'c');
      set(35, 5, 'f');
      set(36, 8, 'C');
      set(41, 8, 'm');
      hline(43, 45, 7, 'c');
      set(45, 8, 'i');
      set(48, 8, 'e');
      set(49, 8, 'j');
      set(57, 8, 'T');
      set(59, 8, 'i');
      // drabina do serca
      vline(64, 5, 8, 'L');
      hline(62, 63, 5, '-');
      hline(65, 66, 5, '-');
      set(64, 4, 'h');
      set(67, 8, 'F');
    }),
  },
  {
    name: 'Ostatni Pojedynek',
    par: 75,
    theme: { tile: 'stone', bg: 'bg_duel', bgTint: 0xffffff },
    rows: makeLevel(72, [[8, 10], [20, 22], [32, 34], [44, 46], [58, 60]], (set, hline, vline) => {
      set(2, 8, 'P');
      set(3, 8, 'b');
      set(5, 8, 's');
      set(13, 8, 'd');
      set(15, 8, 'i');
      set(17, 7, 'a');
      set(21, 8, 'M');
      hline(23, 25, 7, 'c');
      set(25, 4, 'f');
      set(28, 8, 'i');
      hline(29, 31, 7, '-');
      set(30, 6, 'g');
      // wysoka drabina do artefaktu
      vline(36, 3, 8, 'L');
      hline(34, 35, 3, '-');
      hline(37, 38, 3, '-');
      set(36, 2, 'A');
      set(38, 8, 'e');
      set(39, 8, 'C');
      set(41, 8, 'i');
      set(45, 8, 'M');
      set(49, 5, 'f');
      set(52, 8, 'e');
      hline(54, 56, 6, '-');
      set(55, 5, 'h');
      set(56, 8, 'j');
      set(59, 8, 'V');
      hline(61, 62, 7, 'c');
      set(61, 8, 'S'); // przydrożny sklep — pociski dum-dum na bossa
      set(63, 8, 's');
      set(66, 8, 'G'); // SUPER BOSS — grizzly strzegący mety
      set(69, 8, 'F');
    }),
  },
];
