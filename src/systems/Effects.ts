import Phaser from 'phaser';
import { CONFIG } from '../config';

/**
 * System efektów wizualnych ("juice"): wspólne emitery cząsteczek
 * i popupy tekstowe. Emitery są tworzone RAZ na scenę i reużywane
 * przez explode() — zero alokacji w trakcie rozgrywki (przyjazne dla GC).
 */
export class Effects {
  private scene: Phaser.Scene;
  /** złote iskry — monety, skarby, zgniecenia */
  readonly coins: Phaser.GameObjects.Particles.ParticleEmitter;
  /** kurz — lądowanie, skok, rykoszet */
  readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  /** błysk prochu — strzał, wybuch, amunicja */
  readonly muzzle: Phaser.GameObjects.Particles.ParticleEmitter;
  /** złota aura nieśmiertelności (start()/stop(), podąża za graczem) */
  readonly aura: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.coins = scene.add.particles(0, 0, 'spark', {
      lifespan: 450,
      speed: { min: 80, max: 220 },
      scale: { start: 0.6, end: 0 },
      gravityY: 400,
      emitting: false,
      tint: [0xffd700, 0xfff3b0],
    }).setDepth(20);

    this.dust = scene.add.particles(0, 0, 'spark', {
      lifespan: 350,
      speed: { min: 30, max: 90 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.7, end: 0 },
      emitting: false,
      tint: 0xd9c49a,
    }).setDepth(9);

    this.muzzle = scene.add.particles(0, 0, 'spark', {
      lifespan: 180,
      speed: { min: 60, max: 200 },
      scale: { start: 0.5, end: 0 },
      emitting: false,
      tint: [0xffdd55, 0xff9933, 0xffffff],
    }).setDepth(21);

    this.aura = scene.add.particles(0, 0, 'spark', {
      lifespan: 600,
      speed: { min: 20, max: 70 },
      scale: { start: 0.45, end: 0 },
      alpha: { start: 0.9, end: 0 },
      frequency: 45,
      emitting: false,
      tint: [0xffd700, 0xfff3b0, 0x7fffd4],
    }).setDepth(11);
  }

  /** unoszący się tekst nagrody, np. "+25" (samoniszczący się) */
  popup(x: number, y: number, msg: string): void {
    const t = this.scene.add
      .text(x, y - 20, msg, {
        fontFamily: CONFIG.ui.fontWest,
        fontSize: '24px',
        color: '#ffe15c',
        stroke: '#7a5c00',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.scene.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  /** krótkie wstrząśnięcie kamerą */
  shake(duration = 80, intensity = 0.004): void {
    this.scene.cameras.main.shake(duration, intensity);
  }
}
