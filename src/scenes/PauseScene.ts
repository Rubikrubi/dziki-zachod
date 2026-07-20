import Phaser from 'phaser';
import { sfx } from '../audio';

const FONT = '"Rye", "Baloo 2", serif';
const FONT_UI = '"Baloo 2", sans-serif';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);

    const panel = this.add.container(width / 2, height / 2);
    const bg = this.add.rectangle(0, 0, 420, 320, 0x3d2817, 0.95).setStrokeStyle(5, 0xffb347);
    const title = this.add.text(0, -110, 'PAUZA', { fontFamily: FONT, fontSize: '48px', color: '#ffe6b3', stroke: '#3d1f08', strokeThickness: 6 }).setOrigin(0.5);
    panel.add([bg, title]);

    const mkBtn = (y: number, label: string, color: number, cb: () => void) => {
      const btn = this.add.rectangle(0, y, 300, 68, color).setStrokeStyle(4, 0xffffff, 0.4).setInteractive({ useHandCursor: true });
      const txt = this.add.text(0, y, label, { fontFamily: FONT_UI, fontSize: '30px', color: '#ffffff' }).setOrigin(0.5);
      btn.on('pointerover', () => btn.setScale(1.05));
      btn.on('pointerout', () => btn.setScale(1));
      btn.on('pointerdown', () => {
        sfx.click.play();
        cb();
      });
      panel.add([btn, txt]);
    };

    mkBtn(-20, 'WZNÓW', 0xb5651d, () => this.resume());
    mkBtn(70, 'MENU GŁÓWNE', 0x5a6b8c, () => {
      this.scene.stop('Game');
      this.scene.start('Title');
    });

    panel.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });

    this.input.keyboard!.on('keydown-ESC', () => this.resume());
    this.input.keyboard!.on('keydown-P', () => this.resume());
  }

  private resume() {
    this.scene.stop();
    this.scene.resume('Game');
  }
}
