import { Howl } from 'howler';

// UWAGA: muzyka tła mieszka WYŁĄCZNIE w systems/Music.ts (menedżer
// utworów z menu opcji). Ten moduł trzyma tylko efekty dźwiękowe.
// Wcześniej były tu dwa równoległe systemy muzyki — stąd bug
// "muzyki nie da się wyłączyć": menu sterowało jednym, a grał drugi.

export const sfx = {
  coin: new Howl({ src: ['sfx/coin.ogg'], volume: 0.5 }),
  jump: new Howl({ src: ['sfx/jump.ogg'], volume: 0.7, rate: 1.4 }),
  stomp: new Howl({ src: ['sfx/stomp.ogg'], volume: 0.8 }),
  win: new Howl({ src: ['sfx/win.ogg'], volume: 0.7 }),
  click: new Howl({ src: ['sfx/click.wav'], volume: 0.6 }),
  hurt: new Howl({ src: ['sfx/stomp.ogg'], volume: 0.9, rate: 0.5 }),
  shot: new Howl({ src: ['sfx/shot.ogg'], volume: 0.9, rate: 2.2 }),
  reload: new Howl({ src: ['sfx/click.wav'], volume: 0.7, rate: 0.7 }),
  empty: new Howl({ src: ['sfx/click.wav'], volume: 0.4, rate: 1.8 }),
  /** ryk grizzly — mocno spowolniony impact */
  roar: new Howl({ src: ['sfx/stomp.ogg'], volume: 1.0, rate: 0.35 }),
};
