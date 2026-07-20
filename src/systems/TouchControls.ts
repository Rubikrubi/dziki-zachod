import Phaser from 'phaser';
import { CONFIG } from '../config';
import { InputController } from './InputController';

/**
 * Ekranowe przyciski dotykowe (mobile). Tworzone tylko na urządzeniach
 * z dotykiem. Piszą bezpośrednio do InputController — jedyny "most"
 * między UI dotykowym a stanem wejścia.
 */
export class TouchControls {
  constructor(scene: Phaser.Scene, input: InputController, onJumpPressed: () => void) {
    if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) return;

    scene.input.addPointer(4);
    const w = scene.scale.width;
    const h = scene.scale.height;

    const mkButton = (x: number, y: number, label: string, onDown: () => void, onUp: () => void) => {
      const circle = scene.add
        .circle(x, y, 56, 0xffffff, 0.22)
        .setStrokeStyle(4, 0xffffff, 0.5)
        .setScrollFactor(0)
        .setDepth(150)
        .setInteractive({ useHandCursor: false });
      scene.add
        .text(x, y, label, { fontFamily: CONFIG.ui.fontUI, fontSize: '38px', color: '#ffffff' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(151)
        .setAlpha(0.85);

      circle.on('pointerdown', () => {
        circle.setFillStyle(0xffffff, 0.45);
        onDown();
      });
      const release = () => {
        circle.setFillStyle(0xffffff, 0.22);
        onUp();
      };
      circle.on('pointerup', release);
      circle.on('pointerout', release);
    };

    mkButton(95, h - 95, '◀', () => (input.touchLeft = true), () => (input.touchLeft = false));
    mkButton(235, h - 95, '▶', () => (input.touchRight = true), () => (input.touchRight = false));
    mkButton(w - 105, h - 95, '▲', () => {
      input.touchJump = true;
      onJumpPressed();
    }, () => (input.touchJump = false));
    mkButton(w - 240, h - 95, '🔫', () => input.onShoot?.(), () => {});
    mkButton(w - 105, h - 230, '🧨', () => input.onDynamite?.(), () => {});
  }
}
