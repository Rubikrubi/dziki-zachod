import Phaser from 'phaser';
import { CONFIG } from '../config';
import { sfx } from '../audio';
import { Effects } from '../systems/Effects';
import { Player } from '../entities/Player';

/**
 * System walki: rewolwer (pociski + amunicja) i dynamit (lont + eksplozja).
 * Nie zna pojęcia "sceny gry" poza wąskim interfejsem zależności,
 * więc można go testować i rozwijać niezależnie.
 */
export interface CombatDeps {
  scene: Phaser.Scene;
  player: Player;
  effects: Effects;
  enemies: Phaser.Physics.Arcade.Group;
  /** zabij wroga (przejęte przez scenę — tam żyje punktacja) */
  killEnemy: (enemy: Phaser.Physics.Arcade.Sprite, shot: boolean) => void;
  /** zadaj obrażenia graczowi (wybuch własnego dynamitu) */
  damagePlayer: (fromX: number) => void;
  /** czy gra jest w stanie pozwalającym na akcje (nie pauza/śmierć/koniec) */
  canAct: () => boolean;
  onAmmoChanged: (ammo: number) => void;
  onAmmoEmpty: () => void;
  onDynamitesChanged: (count: number) => void;
  onDynamitesEmpty: () => void;
  /** stan ekwipunku przeniesiony z poprzedniego poziomu */
  initialAmmo?: number;
  initialDynamites?: number;
}

export class CombatSystem {
  readonly bullets: Phaser.Physics.Arcade.Group;
  private deps: CombatDeps;
  private ammo: number = CONFIG.combat.startAmmo;
  private dynamites = 0;
  private lastShotAt = -9999;
  private lastPlantAt = -9999;
  /** pociski dum-dum — jedyna broń skuteczna na bossa (kupowane w sklepie) */
  private dumdum = 0;
  onDumdumChanged?: (n: number) => void;

  constructor(deps: CombatDeps) {
    this.deps = deps;
    // ekwipunek przechodzi między poziomami (amunicja ograniczona maksem magazynka)
    this.ammo = Math.min(deps.initialAmmo ?? CONFIG.combat.startAmmo, CONFIG.combat.maxAmmo);
    this.dynamites = deps.initialDynamites ?? 0;
    this.bullets = deps.scene.physics.add.group({ allowGravity: false });
  }

  getAmmo(): number {
    return this.ammo;
  }

  getDynamites(): number {
    return this.dynamites;
  }

  addAmmo(n: number): void {
    this.ammo = Math.min(CONFIG.combat.maxAmmo, this.ammo + n);
    this.deps.onAmmoChanged(this.ammo);
  }

  addDynamites(n: number): void {
    this.dynamites += n;
    this.deps.onDynamitesChanged(this.dynamites);
  }

  getDumdum(): number {
    return this.dumdum;
  }

  addDumdum(n: number): void {
    this.dumdum += n;
    this.onDumdumChanged?.(this.dumdum);
  }

  /** strzał z rewolweru (cooldown + amunicja + odrzut + SFX) */
  tryShoot(): void {
    const { scene, player, effects } = this.deps;
    if (!this.deps.canAct()) return;
    const now = scene.time.now;
    if (now - this.lastShotAt < CONFIG.combat.fireCooldownMs) return;
    if (this.ammo <= 0 && this.dumdum <= 0) {
      sfx.empty.play();
      this.deps.onAmmoEmpty();
      return;
    }
    this.lastShotAt = now;
    // dum-dum mają priorytet — większe, złote pociski na bossa
    const isDumdum = this.dumdum > 0;
    if (isDumdum) {
      this.dumdum--;
      this.onDumdumChanged?.(this.dumdum);
    } else {
      this.ammo--;
      this.deps.onAmmoChanged(this.ammo);
    }

    const dir = player.sprite.flipX ? -1 : 1;
    const bx = player.x + dir * 30;
    const by = player.y + 2;

    const bullet = this.bullets.create(bx, by, 'bullet') as Phaser.Physics.Arcade.Image;
    bullet.setScale(isDumdum ? 0.22 : 0.14);
    if (isDumdum) {
      bullet.setTint(0xffd700);
      bullet.setData('dumdum', true);
    }
    bullet.setFlipX(dir < 0);
    (bullet.body as Phaser.Physics.Arcade.Body).setSize(bullet.width * 0.4, bullet.height * 0.3).setOffset(bullet.width * 0.3, bullet.height * 0.35);
    bullet.setVelocityX(dir * CONFIG.combat.bulletSpeed);
    bullet.setDepth(12);

    scene.time.delayedCall(CONFIG.combat.bulletLifeMs, () => {
      if (bullet.active) bullet.destroy();
    });

    sfx.shot.play();
    effects.muzzle.explode(8, bx + dir * 14, by);
    player.applyRecoil(dir);
    effects.shake(60, 0.003);
  }

  /** trafienie wroga pociskiem — 1 dmg, odepchnięcie jeśli przeżył */
  onBulletHitEnemy(bullet: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!bullet.active || !enemy.active) return;
    // kierunek odczytujemy PRZED destroy() — po nim body jest null!
    const dir = (bullet.body as Phaser.Physics.Arcade.Body).velocity.x >= 0 ? 1 : -1;
    const isDumdum = bullet.getData('dumdum') === true;
    bullet.destroy();
    this.deps.effects.muzzle.explode(6, enemy.x, enemy.y - enemy.displayHeight / 2);

    // BOSS: ranią go wyłącznie pociski dum-dum — zwykłe się odbijają
    if (enemy.getData('type') === 'boss' && !isDumdum) {
      sfx.empty.play();
      enemy.setTintFill(0x8888ff);
      this.deps.scene.time.delayedCall(80, () => {
        if (enemy.active) enemy.clearTint();
      });
      this.deps.effects.dust.explode(8, enemy.x, enemy.y - enemy.displayHeight / 2);
      return;
    }

    const hp = (enemy.getData('hp') as number) - 1;
    enemy.setData('hp', hp);

    if (hp > 0) {
      sfx.stomp.play();
      enemy.setTintFill(0xffffff);
      this.deps.scene.time.delayedCall(90, () => {
        if (enemy.active) enemy.clearTint();
      });
      const eBody = enemy.body as Phaser.Physics.Arcade.Body | null;
      if (eBody && eBody.enable && eBody.moves) enemy.setVelocityX(dir * 120);
      return;
    }
    this.deps.killEnemy(enemy, true);
  }

  /** pocisk w ścianę — kurz i destrukcja */
  onBulletHitWall(bullet: Phaser.Physics.Arcade.Image): void {
    if (!bullet.active) return;
    this.deps.effects.dust.explode(6, bullet.x, bullet.y);
    bullet.destroy();
  }

  /** podłożenie dynamitu pod nogami gracza */
  tryPlantDynamite(): void {
    const { scene, player, effects } = this.deps;
    if (!this.deps.canAct()) return;
    const now = scene.time.now;
    if (now - this.lastPlantAt < CONFIG.combat.dynamiteCooldownMs) return;
    if (this.dynamites <= 0) {
      sfx.empty.play();
      this.deps.onDynamitesEmpty();
      return;
    }
    this.lastPlantAt = now;
    this.dynamites--;
    this.deps.onDynamitesChanged(this.dynamites);
    sfx.reload.play();

    const dx = player.x;
    const dy = player.y + player.sprite.displayHeight * 0.35;
    const stick = scene.add.image(dx, dy, 'dynamite').setScale(0.22).setOrigin(0.5, 1).setDepth(8);

    // tykanie: pulsowanie + miganie na czerwono
    scene.tweens.add({ targets: stick, scale: 0.26, duration: 180, yoyo: true, repeat: -1 });
    scene.tweens.addCounter({
      from: 0,
      to: 100,
      duration: CONFIG.combat.dynamiteFuseMs,
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        if (Math.floor(v / 12) % 2 === 0) stick.setTint(0xff6666);
        else stick.clearTint();
      },
    });
    // iskry z lontu
    const fuse = scene.add.particles(dx, dy - stick.displayHeight, 'spark', {
      lifespan: 250,
      speed: { min: 20, max: 80 },
      scale: { start: 0.3, end: 0 },
      frequency: 60,
      tint: [0xffdd55, 0xff9933],
    }).setDepth(9);

    scene.time.delayedCall(CONFIG.combat.dynamiteFuseMs, () => {
      fuse.destroy();
      if (stick.active) stick.destroy();
      this.explode(dx, dy - 10);
    });
  }

  /** eksplozja: fala uderzeniowa + AoE na wrogów + friendly fire */
  private explode(x: number, y: number): void {
    const { scene, player, effects, enemies } = this.deps;
    const R = CONFIG.combat.dynamiteRadius;

    sfx.stomp.play();
    sfx.hurt.play();
    effects.shake(300, 0.02);
    scene.cameras.main.flash(120, 255, 200, 120);

    const ring = scene.add.circle(x, y, 20, 0xffaa33, 0.6).setDepth(25);
    scene.tweens.add({ targets: ring, radius: R, alpha: 0, duration: 350, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    effects.muzzle.explode(30, x, y);
    effects.dust.explode(20, x, y);

    enemies.children.each((child) => {
      const e = child as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return true;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y - e.displayHeight / 2);
      if (d <= R) {
        // boss odporny na dynamit — działają tylko dum-dum
        if (e.getData('type') === 'boss') return true;
        const body = e.body as Phaser.Physics.Arcade.Body | null;
        if (body && body.enable) this.deps.killEnemy(e, true);
      }
      return true;
    });

    const pd = Phaser.Math.Distance.Between(x, y, player.x, player.y);
    if (pd <= R * CONFIG.combat.dynamiteSelfRadiusFactor) {
      this.deps.damagePlayer(x);
    }
  }
}
