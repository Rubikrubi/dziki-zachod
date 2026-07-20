import Phaser from 'phaser';
import { sfx } from '../audio';
import { Storage } from '../systems/Storage';

const FONT = '"Rye", "Baloo 2", serif';
const FONT_UI = '"Baloo 2", sans-serif';

interface LeaderboardData {
  highlightName?: string;
}

/** Plansza rankingu — TOP graczy (best-per-nick). */
export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('Leaderboard');
  }

  create(data: LeaderboardData) {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'bg_town').setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);

    this.add
      .text(width / 2, height * 0.13, '🏆 NAJLEPSI REWOLWEROWCY', {
        fontFamily: FONT,
        fontSize: '46px',
        color: '#ffe6b3',
        stroke: '#5c2e0d',
        strokeThickness: 10,
      })
      .setOrigin(0.5);

    const list = Storage.getLeaderboard();
    const hl = (data.highlightName ?? '').trim().toLowerCase();

    if (list.length === 0) {
      this.add
        .text(width / 2, height * 0.45, 'Brak wyników — zagraj pierwszy!', {
          fontFamily: FONT_UI,
          fontSize: '28px',
          color: '#ffffff',
        })
        .setOrigin(0.5);
    } else {
      const startY = height * 0.26;
      const rowH = 42;
      list.forEach((e, i) => {
        const y = startY + i * rowH;
        const isHl = e.name.trim().toLowerCase() === hl;
        const color = isHl ? '#fff3b0' : '#ffffff';
        if (isHl) {
          this.add.rectangle(width / 2, y, 560, 38, 0xffd700, 0.18).setStrokeStyle(2, 0xffd700);
        }
        this.add
          .text(width / 2 - 260, y, `${i + 1}.`, { fontFamily: FONT_UI, fontSize: '26px', color })
          .setOrigin(0, 0.5);
        this.add
          .text(width / 2 - 200, y, e.name, { fontFamily: FONT_UI, fontSize: '26px', color })
          .setOrigin(0, 0.5);
        this.add
          .text(width / 2 + 260, y, String(e.score), { fontFamily: FONT_UI, fontSize: '26px', color })
          .setOrigin(1, 0.5);
      });
    }

    const mkBtn = (x: number, label: string, fill: number, onClick: () => void) => {
      const c = this.add.container(x, height * 0.85);
      const bg = this.add.rectangle(0, 0, 300, 70, fill).setStrokeStyle(5, 0x2f1c0a);
      bg.setInteractive({ useHandCursor: true });
      const txt = this.add
        .text(0, 0, label, { fontFamily: FONT, fontSize: '30px', color: '#ffe6b3', stroke: '#3d1f08', strokeThickness: 4 })
        .setOrigin(0.5);
      c.add([bg, txt]);
      bg.on('pointerover', () => c.setScale(1.05));
      bg.on('pointerout', () => c.setScale(1));
      bg.on('pointerdown', () => {
        sfx.click.play();
        onClick();
      });
    };

    mkBtn(width / 2 - 180, 'ZAGRAJ PONOWNIE', 0xb5651d, () => this.scene.start('Name'));
    mkBtn(width / 2 + 180, 'MENU', 0x5a6b8c, () => this.scene.start('Title'));

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }
}
