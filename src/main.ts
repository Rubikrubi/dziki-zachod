import Phaser from 'phaser';
import WebFont from 'webfontloader';
import { music } from './systems/Music';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { PauseScene } from './scenes/PauseScene';
import { OptionsScene } from './scenes/OptionsScene';
import { EndingScene } from './scenes/EndingScene';
import { NameScene } from './scenes/NameScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';

function launch() {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    dom: { createContainer: true },
    width: 1280,
    height: 720,
    backgroundColor: '#87ceeb',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 900 }, debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: { pixelArt: false, antialias: true },
    scene: [BootScene, TitleScene, NameScene, GameScene, GameOverScene, PauseScene, OptionsScene, EndingScene, LeaderboardScene],
  });
}

WebFont.load({
  google: { families: ['Baloo 2:600,800', 'Rye'] },
  active: launch,
  inactive: launch,
  timeout: 2500,
});

// Muzyka tła: przeglądarki wymagają gestu użytkownika przed odtworzeniem
// audio — startujemy przy pierwszym kliknięciu/klawiszu/dotknięciu.
// Odtwarzany jest utwór zapamiętany w opcjach (lub cisza przy -1).
const startOnGesture = () => {
  music.startSelected();
  window.removeEventListener('pointerdown', startOnGesture);
  window.removeEventListener('keydown', startOnGesture);
  window.removeEventListener('touchstart', startOnGesture);
};
window.addEventListener('pointerdown', startOnGesture);
window.addEventListener('keydown', startOnGesture);
window.addEventListener('touchstart', startOnGesture);
