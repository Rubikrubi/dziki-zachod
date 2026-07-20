import Phaser from 'phaser';
import { sfx } from '../audio';
import { LEVELS } from '../levels';
import { Storage } from '../systems/Storage';
import { SKINS } from '../config';

const FONT = '"Rye", "Baloo 2", serif';
const FONT_UI = '"Baloo 2", sans-serif';

interface GameOverData {
  won: boolean;
  score: number;
  level?: number;
  retryScore?: number;
  retryHearts?: number;
  playerName?: string;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: GameOverData) {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, data.won ? 'bg_canyon' : 'bg_night').setDisplaySize(width, height).setTint(data.won ? 0xffffff : 0x9988aa);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, data.won ? 0.25 : 0.5);

    const hi = Storage.getHighscore();
    const newRecord = data.won && Storage.submitScore(data.score);

    const playerName = data.playerName ?? (Storage.getPlayerName() || 'Gracz');
    Storage.submitToLeaderboard(playerName, data.score);

    const skin = SKINS[Storage.getSkin()];
    const cowboy = this.add.image(width / 2, height * 0.28, data.won ? skin.jump : skin.stand).setScale(0.6);
    if (data.won) {
      this.tweens.add({ targets: cowboy, y: height * 0.28 - 30, duration: 500, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
      sfx.win.play();
      this.add.particles(0, 0, 'spark', {
        x: { min: 0, max: width },
        y: -10,
        lifespan: 3500,
        speedY: { min: 100, max: 250 },
        speedX: { min: -40, max: 40 },
        scale: { start: 0.7, end: 0 },
        quantity: 2,
        tint: [0xffd700, 0xb5651d, 0xff5252, 0xffe6b3, 0xffffff],
      });
    } else {
      cowboy.setAngle(-12).setTint(0xccaaaa);
      // sęp krąży nad przegranym kowbojem
      const vulture = this.add.image(width / 2 + 160, height * 0.14, 'vulture').setScale(0.35);
      this.tweens.add({ targets: vulture, x: width / 2 - 160, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onYoyo: () => vulture.setFlipX(true), onRepeat: () => vulture.setFlipX(false) });
    }

    this.add
      .text(width / 2, height * 0.47, data.won ? 'WYGRANA!' : 'KONIEC GRY', {
        fontFamily: FONT,
        fontSize: '72px',
        color: data.won ? '#ffe15c' : '#ff6b6b',
        stroke: '#3d1f08',
        strokeThickness: 12,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.585, `Wynik: ${data.score}` + (newRecord ? '   🏆 NOWY REKORD!' : `   •   Rekord: ${Math.max(hi, data.score)}`), {
        fontFamily: FONT_UI,
        fontSize: '32px',
        color: '#ffffff',
        stroke: '#00000088',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const mkBtn = (y: number, w: number, label: string, color: number, stroke: number, cb: () => void) => {
      const btn = this.add.rectangle(width / 2, y, w, 76, color).setStrokeStyle(6, stroke).setInteractive({ useHandCursor: true });
      this.add.text(width / 2, y, label, { fontFamily: FONT, fontSize: '26px', color: '#ffe6b3', stroke: '#3d1f08', strokeThickness: 5 }).setOrigin(0.5);
      btn.on('pointerover', () => btn.setScale(1.04));
      btn.on('pointerout', () => btn.setScale(1));
      btn.once('pointerdown', () => {
        sfx.click.play();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', cb);
      });
      return btn;
    };

    if (!data.won && data.level !== undefined) {
      const lvlName = LEVELS[data.level].name;
      mkBtn(height * 0.71, 440, `POWTÓRZ: ${lvlName}`, 0xb5651d, 0x5c2e0d, () =>
        this.scene.start('Game', { level: data.level, score: data.retryScore ?? 0, hearts: data.retryHearts ?? 3 })
      );
      mkBtn(height * 0.84, 340, 'OD POCZĄTKU', 0x5a6b8c, 0x2f3b55, () => this.scene.start('Game', { level: 0, score: 0, hearts: 3 }));
      this.input.keyboard!.once('keydown-SPACE', () => {
        sfx.click.play();
        this.scene.start('Game', { level: data.level, score: data.retryScore ?? 0, hearts: data.retryHearts ?? 3 });
      });
    } else {
      mkBtn(height * 0.75, 340, 'ZAGRAJ PONOWNIE', 0xb5651d, 0x5c2e0d, () => this.scene.start('Game', { level: 0, score: 0, hearts: 3 }));
      this.input.keyboard!.once('keydown-SPACE', () => {
        sfx.click.play();
        this.scene.start('Game', { level: 0, score: 0, hearts: 3 });
      });
    }

    const rankLink = this.add
      .text(width / 2, height - 36, '🏆 Tablica wyników', {
        fontFamily: FONT_UI,
        fontSize: '24px',
        color: '#ffe6b3',
        stroke: '#3d1f08',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    rankLink.on('pointerover', () => rankLink.setScale(1.08));
    rankLink.on('pointerout', () => rankLink.setScale(1));
    rankLink.on('pointerdown', () => {
      sfx.click.play();
      this.scene.start('Leaderboard', { highlightName: playerName });
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }
}
