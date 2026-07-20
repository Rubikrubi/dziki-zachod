import Phaser from 'phaser';
import { CONFIG } from '../config';
import { formatTime } from './scoring';

/**
 * HUD — cały interfejs w trakcie rozgrywki: serca, monety, amunicja,
 * dynamit, wynik, nazwa poziomu, przycisk pauzy.
 * Scena mówi HUD-owi "co się zmieniło", HUD sam zarządza wyglądem
 * (jednokierunkowy przepływ danych — scena nie dotyka obiektów UI).
 */
export class Hud {
  private scene: Phaser.Scene;
  private heartIcons: Phaser.GameObjects.Image[] = [];
  private scoreText: Phaser.GameObjects.Text;
  private timeText: Phaser.GameObjects.Text;
  private coinText: Phaser.GameObjects.Text;
  private ammoText: Phaser.GameObjects.Text;
  private ammoIcon: Phaser.GameObjects.Image;
  private dynText: Phaser.GameObjects.Text;
  private dynIcon: Phaser.GameObjects.Image;
  private dumdumText: Phaser.GameObjects.Text | null = null;
  private dumdumIcon: Phaser.GameObjects.Image | null = null;

  constructor(
    scene: Phaser.Scene,
    opts: { maxHearts: number; hearts: number; score: number; ammo: number; dynamites: number; levelIndex: number; levelCount: number; levelName: string; onPause: () => void }
  ) {
    this.scene = scene;
    const pad = 16;

    for (let i = 0; i < opts.maxHearts; i++) {
      this.heartIcons.push(
        scene.add
          .image(pad + 26 + i * 52, pad + 24, 'kenney', i < opts.hearts ? 'hudHeart_full.png' : 'hudHeart_empty.png')
          .setScale(0.45)
          .setScrollFactor(0)
          .setDepth(100)
      );
    }

    scene.add.image(pad + 30, pad + 78, 'coin_dollar').setScale(0.14).setScrollFactor(0).setDepth(100);
    this.coinText = this.mkText(pad + 58, pad + 78, 'x 0', '#ffffff');

    this.ammoIcon = scene.add.image(pad + 30, pad + 128, 'cartridge').setScale(0.14).setScrollFactor(0).setDepth(100);
    this.ammoText = this.mkText(pad + 58, pad + 128, `x ${opts.ammo}`, '#ffd27a');

    this.dynIcon = scene.add.image(pad + 30, pad + 178, 'dynamite').setScale(0.14).setScrollFactor(0).setDepth(100);
    this.dynText = this.mkText(pad + 58, pad + 178, `x ${opts.dynamites}`, '#ff9a7a');

    this.scoreText = scene.add
      .text(scene.scale.width - pad - 52, pad, `Wynik: ${opts.score}`, {
        fontFamily: CONFIG.ui.fontWest,
        fontSize: '28px',
        color: '#ffe6b3',
        stroke: '#3d1f08',
        strokeThickness: 6,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.timeText = scene.add
      .text(scene.scale.width / 2, pad + 30, '0:00', {
        fontFamily: CONFIG.ui.fontUI,
        fontSize: '28px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100);

    scene.add
      .text(scene.scale.width / 2, pad, `${opts.levelIndex + 1}/${opts.levelCount} • ${opts.levelName}`, {
        fontFamily: CONFIG.ui.fontWest,
        fontSize: '22px',
        color: '#ffe6b3',
        stroke: '#3d1f08',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100);

    const pauseBtn = scene.add
      .text(scene.scale.width - 16, 60, '⏸', { fontFamily: CONFIG.ui.fontUI, fontSize: '34px', color: '#ffffff', stroke: '#00000066', strokeThickness: 5 })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(150)
      .setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerdown', opts.onPause);
  }

  private mkText(x: number, y: number, txt: string, color: string): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, txt, { fontFamily: CONFIG.ui.fontUI, fontSize: '28px', color, stroke: '#00000088', strokeThickness: 5 })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(100);
  }

  setScore(score: number): void {
    this.scoreText.setText(`Wynik: ${score}`);
    this.scene.tweens.add({ targets: this.scoreText, scale: 1.15, duration: 90, yoyo: true });
  }

  setTime(seconds: number): void {
    this.timeText.setText(formatTime(seconds));
  }

  setCoins(count: number): void {
    this.coinText.setText(`x ${count}`);
  }

  setAmmo(ammo: number, pulse = false): void {
    this.ammoText.setText(`x ${ammo}`);
    this.ammoText.setColor(ammo === 0 ? '#ff7a7a' : '#ffd27a');
    if (pulse) this.scene.tweens.add({ targets: [this.ammoText, this.ammoIcon], scale: 1.3, duration: 120, yoyo: true });
  }

  /** potrząśnięcie licznikiem amunicji (pusty magazynek) */
  shakeAmmo(): void {
    this.scene.tweens.add({ targets: [this.ammoText, this.ammoIcon], x: '+=6', duration: 50, yoyo: true, repeat: 3 });
  }

  /** licznik złotych pocisków dum-dum — pojawia się po pierwszym zakupie */
  setDumdum(count: number): void {
    const pad = 16;
    if (!this.dumdumText) {
      this.dumdumIcon = this.scene.add.image(pad + 30, pad + 228, 'bullet').setScale(0.2).setTint(0xffd700).setScrollFactor(0).setDepth(100);
      this.dumdumText = this.mkText(pad + 58, pad + 228, `x ${count}`, '#ffd700');
    }
    this.dumdumText.setText(`x ${count}`);
    this.scene.tweens.add({ targets: [this.dumdumText, this.dumdumIcon], scale: 1.3, duration: 120, yoyo: true });
  }

  setDynamites(count: number, pulse = false): void {
    this.dynText.setText(`x ${count}`);
    this.dynText.setColor(count === 0 ? '#ff7a7a' : '#ff9a7a');
    if (pulse) this.scene.tweens.add({ targets: [this.dynText, this.dynIcon], scale: 1.3, duration: 120, yoyo: true });
  }

  shakeDynamites(): void {
    this.scene.tweens.add({ targets: [this.dynText, this.dynIcon], x: '+=6', duration: 50, yoyo: true, repeat: 3 });
  }

  setHearts(hearts: number, pulseIndex = -1): void {
    this.heartIcons.forEach((h, i) => h.setFrame(i < hearts ? 'hudHeart_full.png' : 'hudHeart_empty.png'));
    if (pulseIndex >= 0 && pulseIndex < this.heartIcons.length) {
      this.scene.tweens.add({ targets: this.heartIcons[pulseIndex], scale: 0.65, duration: 150, yoyo: true, ease: 'Back.easeOut' });
    }
  }
}
