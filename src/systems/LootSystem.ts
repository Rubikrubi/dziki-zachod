import Phaser from 'phaser';
import { CONFIG, TILE } from '../config';
import { sfx } from '../audio';
import { Effects } from './Effects';

/**
 * System łupów: monety/klejnoty/serca/amunicja/dynamit/artefakt,
 * skrzynki "?" i skrzynie ze skarbem. Efekty uboczne (punkty, serca,
 * amunicja...) zgłasza scenie przez wąski interfejs zależności.
 */
export interface LootDeps {
  scene: Phaser.Scene;
  effects: Effects;
  addScore: (v: number) => void;
  addCoins: (n: number) => void;
  addAmmo: (n: number) => void;
  addDynamites: (n: number) => void;
  /** próba dodania serca; zwraca indeks nowego serca lub -1 gdy pełne HP */
  tryAddHeart: () => number;
  activateImmortality: () => void;
  /** liczba zebranych monet — do wyceny diamentu (2× monety) */
  getCoins: () => number;
}

export class LootSystem {
  private deps: LootDeps;

  constructor(deps: LootDeps) {
    this.deps = deps;
  }

  /** podniesienie znajdźki z grupy coins (rozróżnianej po data 'kind') */
  collect(item: Phaser.Physics.Arcade.Image): void {
    if (!item.active) return;
    const d = this.deps;
    const kind = item.getData('kind') as string;

    switch (kind) {
      case 'heart': {
        item.disableBody(true, true);
        const idx = d.tryAddHeart();
        if (idx < 0) {
          d.addScore(CONFIG.loot.heartWhenFullScore);
          d.effects.popup(item.x, item.y, `+${CONFIG.loot.heartWhenFullScore}`);
        }
        sfx.win.play();
        d.effects.coins.explode(12, item.x, item.y);
        return;
      }
      case 'ammo': {
        item.disableBody(true, true);
        d.addAmmo(CONFIG.combat.ammoPickup);
        sfx.reload.play();
        d.effects.muzzle.explode(8, item.x, item.y);
        d.effects.popup(item.x, item.y, `+${CONFIG.combat.ammoPickup} 🔸`);
        return;
      }
      case 'dynamite': {
        item.disableBody(true, true);
        d.addDynamites(1);
        sfx.reload.play();
        d.effects.muzzle.explode(10, item.x, item.y);
        d.effects.popup(item.x, item.y, '+1 🧨');
        return;
      }
      case 'artifact': {
        const glow = item.getData('glow') as Phaser.GameObjects.Arc | undefined;
        if (glow) glow.destroy();
        item.disableBody(true, true);
        d.activateImmortality();
        return;
      }
      case 'gem': {
        item.disableBody(true, true);
        sfx.coin.play();
        d.effects.coins.explode(14, item.x, item.y);
        // diament wart 2× wartość zebranych dotąd monet (min. gemMin)
        const gemValue = Math.max(CONFIG.loot.gemMin, d.getCoins() * CONFIG.loot.coin * CONFIG.loot.gemCoinsMultiplier);
        d.addScore(gemValue);
        d.effects.popup(item.x, item.y, `💎 +${gemValue}!`);
        return;
      }
      default: {
        // zwykła moneta
        item.disableBody(true, true);
        sfx.coin.play();
        d.effects.coins.explode(10, item.x, item.y);
        d.addCoins(1);
        d.addScore(CONFIG.loot.coin);
        d.effects.popup(item.x, item.y, `+${CONFIG.loot.coin}`);
      }
    }
  }

  /** skrzynka "?" — uderzenie głową od dołu wybija monetę */
  hitCoinBox(box: Phaser.Physics.Arcade.Image, playerBody: Phaser.Physics.Arcade.Body, playerY: number): void {
    if (!playerBody.blocked.up || playerY < box.y) return;
    let left = box.getData('coins') as number;
    if (left <= 0) return;
    left--;
    box.setData('coins', left);
    sfx.coin.play();
    this.deps.addScore(CONFIG.loot.coin);
    this.deps.addCoins(1);

    const scene = this.deps.scene;
    const c = scene.add.image(box.x, box.y - TILE / 2, 'coin_dollar').setScale(0.18).setDepth(15);
    scene.tweens.add({ targets: c, y: c.y - 60, alpha: 0, duration: 450, ease: 'Quad.easeOut', onComplete: () => c.destroy() });
    this.deps.effects.coins.explode(6, box.x, box.y - TILE / 2);
    scene.tweens.add({ targets: box, y: box.y - 8, duration: 80, yoyo: true });
    if (left === 0) box.setFrame('boxCoin_disabled.png');
  }

  /** skrzynia ze skarbem — losowy łup wg tabeli z configu */
  openChest(chest: Phaser.Physics.Arcade.Image): void {
    if (chest.getData('opened')) return;
    chest.setData('opened', true);
    const scene = this.deps.scene;
    const d = this.deps;
    const C = CONFIG.loot.chest;

    scene.tweens.killTweensOf(chest);
    chest.setTexture('chest_open');
    chest.setScale(0.3);
    chest.clearTint();
    sfx.win.play();
    d.effects.coins.explode(20, chest.x, chest.y - 30);
    scene.tweens.add({ targets: chest, y: chest.y - 10, duration: 120, yoyo: true, ease: 'Quad.easeOut' });

    // tabela łupów: 35% monety / 25% amunicja / 20% dynamit / 20% serce
    const roll = Math.random();
    if (roll < 0.35) {
      const amount = Phaser.Math.Between(C.coinMin, C.coinMax);
      d.addScore(amount);
      d.addCoins(Math.floor(amount / CONFIG.loot.coin));
      d.effects.popup(chest.x, chest.y - 70, `💰 +${amount}!`);
      // fontanna monet
      for (let i = 0; i < 5; i++) {
        const coin = scene.add.image(chest.x, chest.y - 30, 'coin_dollar').setScale(0.15).setDepth(15);
        scene.tweens.add({
          targets: coin,
          x: chest.x + Phaser.Math.Between(-70, 70),
          y: chest.y - Phaser.Math.Between(60, 120),
          alpha: 0,
          duration: Phaser.Math.Between(400, 700),
          ease: 'Quad.easeOut',
          onComplete: () => coin.destroy(),
        });
      }
    } else if (roll < 0.6) {
      d.addAmmo(C.ammo);
      sfx.reload.play();
      d.effects.popup(chest.x, chest.y - 70, `+${C.ammo} 🔸 amunicji!`);
    } else if (roll < 0.8) {
      d.addDynamites(C.dynamite);
      sfx.reload.play();
      d.effects.popup(chest.x, chest.y - 70, `+${C.dynamite} 🧨 dynamit!`);
    } else {
      const idx = d.tryAddHeart();
      if (idx >= 0) {
        d.effects.popup(chest.x, chest.y - 70, '+1 ❤️ życie!');
      } else {
        d.addScore(C.heartWhenFullScore);
        d.effects.popup(chest.x, chest.y - 70, `💎 +${C.heartWhenFullScore}!`);
      }
    }
  }
}
