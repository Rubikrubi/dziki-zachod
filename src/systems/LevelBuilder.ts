import Phaser from 'phaser';
import { TILE, LevelDef } from '../levels';
import { spawnBandit, spawnVulture, spawnScorpion, spawnIndian, spawnBoss } from '../entities/enemies';

/**
 * Wszystkie grupy fizyczne poziomu — tworzone przez LevelBuilder,
 * konsumowane przez scenę (kolizje) i systemy (AI, walka).
 */
export interface LevelObjects {
  ground: Phaser.Physics.Arcade.StaticGroup;
  platforms: Phaser.Physics.Arcade.StaticGroup;
  movingPlatforms: Phaser.Physics.Arcade.Group;
  coins: Phaser.Physics.Arcade.StaticGroup;
  lava: Phaser.Physics.Arcade.StaticGroup;
  enemies: Phaser.Physics.Arcade.Group;
  springs: Phaser.Physics.Arcade.StaticGroup;
  coinBoxes: Phaser.Physics.Arcade.StaticGroup;
  checkpoints: Phaser.Physics.Arcade.StaticGroup;
  ladders: Phaser.Physics.Arcade.StaticGroup;
  chests: Phaser.Physics.Arcade.StaticGroup;
  shops: Phaser.Physics.Arcade.StaticGroup;
  flag: Phaser.GameObjects.Sprite | null;
  spawnPoint: Phaser.Math.Vector2;
  worldW: number;
  worldH: number;
}

/**
 * LevelBuilder — zamienia ASCII-siatkę poziomu (levels.ts) na obiekty gry.
 * Jedno miejsce odpowiedzialne za "co znaczy każdy znak" — dodanie nowego
 * elementu poziomu to nowy case tutaj + znak w legendzie.
 */
export class LevelBuilder {
  /** buduje kompletny poziom; zwraca wszystkie grupy do podpięcia kolizji */
  static build(scene: Phaser.Scene, level: LevelDef, levelIndex: number): LevelObjects {
    const rows = level.rows;
    const maxLen = Math.max(...rows.map((r) => r.length));

    const objs: LevelObjects = {
      ground: scene.physics.add.staticGroup(),
      platforms: scene.physics.add.staticGroup(),
      movingPlatforms: scene.physics.add.group({ allowGravity: false, immovable: true }),
      coins: scene.physics.add.staticGroup(),
      lava: scene.physics.add.staticGroup(),
      enemies: scene.physics.add.group(),
      springs: scene.physics.add.staticGroup(),
      coinBoxes: scene.physics.add.staticGroup(),
      checkpoints: scene.physics.add.staticGroup(),
      ladders: scene.physics.add.staticGroup(),
      chests: scene.physics.add.staticGroup(),
      shops: scene.physics.add.staticGroup(),
      flag: null,
      spawnPoint: new Phaser.Math.Vector2(100, 100),
      worldW: maxLen * TILE,
      worldH: rows.length * TILE,
    };

    const tile = level.theme.tile;
    const decoDepth = -1;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        const x = c * TILE + TILE / 2;
        const y = r * TILE + TILE / 2;

        switch (ch) {
          case '#':
            objs.ground.create(x, y, 'kenney', `${tile}Mid.png`).setScale(0.5).refreshBody();
            break;
          case '=':
            objs.ground.create(x, y, 'kenney', `${tile}Center.png`).setScale(0.5).refreshBody();
            break;

          case '-': {
            // półka jednokierunkowa — kolizja tylko od góry
            const p = objs.platforms.create(x, y - TILE / 4, 'kenney', `${tile}Half_mid.png`) as Phaser.Physics.Arcade.Image;
            p.setScale(0.5).refreshBody();
            const body = p.body as Phaser.Physics.Arcade.StaticBody;
            body.checkCollision.down = false;
            body.checkCollision.left = false;
            body.checkCollision.right = false;
            break;
          }

          case 'M':
          case 'V': {
            // ruchoma platforma: M = poziomo, V = pionowo (tween na velocity)
            const mp = objs.movingPlatforms.create(x, y, 'kenney', `${tile}Half_mid.png`) as Phaser.Physics.Arcade.Image;
            mp.setScale(0.5);
            const mBody = mp.body as Phaser.Physics.Arcade.Body;
            mBody.setSize(mp.displayWidth, mp.displayHeight * 0.6).setOffset((mp.width - mp.displayWidth / mp.scaleX) / 2, 0);
            mBody.checkCollision.down = false;
            mBody.checkCollision.left = false;
            mBody.checkCollision.right = false;
            mBody.setFriction(1, 0); // gracz jedzie razem z platformą
            if (ch === 'M') {
              scene.tweens.add({ targets: mBody.velocity, x: { from: 90, to: -90 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            } else {
              scene.tweens.add({ targets: mBody.velocity, y: { from: 70, to: -70 }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            }
            break;
          }

          case '^': {
            const l = objs.lava.create(x, y, 'kenney', 'lavaTop_low.png') as Phaser.Physics.Arcade.Image;
            l.setScale(0.5).refreshBody();
            (l.body as Phaser.Physics.Arcade.StaticBody).setSize(TILE - 8, TILE - 26).setOffset(0, 0);
            l.setDepth(1);
            break;
          }

          case 'L': {
            // drabina — sensor (overlap sprawdzany w scenie).
            // Klasyczna drabina Kenney (ladderTop/ladderMid) — rysowana POD
            // postacią (depth 0 < player depth 10). Efekt "poręczy" po bokach
            // postaci NIE pochodził z drabiny, tylko z pikseli-duchów
            // w klatkach sprite'ów (usunięte skryptem czyszczącym alfa).
            const isTop = r === 0 || rows[r - 1][c] !== 'L';
            const lad = objs.ladders.create(x, y, 'kenney', isTop ? 'ladderTop.png' : 'ladderMid.png') as Phaser.Physics.Arcade.Image;
            lad.setScale(0.5).refreshBody();
            (lad.body as Phaser.Physics.Arcade.StaticBody).setSize(TILE * 0.6, TILE).setOffset(0, 0);
            lad.setDepth(0);
            break;
          }

          case 'T': {
            // skrzynia ze skarbem — otwierana dotknięciem (overlap)
            const chest = objs.chests.create(x, (r + 1) * TILE - 2, 'chest_closed') as Phaser.Physics.Arcade.Image;
            chest.setOrigin(0.5, 1).setScale(0.32);
            chest.refreshBody();
            chest.setData('opened', false);
            chest.setDepth(3);
            // okresowy błysk przyciągający wzrok (bez zmiany skali — hitbox stabilny)
            scene.time.addEvent({
              delay: 2000,
              loop: true,
              callback: () => {
                if (!chest.active || chest.getData('opened')) return;
                chest.setTintFill(0xfff2c0);
                scene.time.delayedCall(120, () => {
                  if (chest.active) chest.clearTint();
                });
              },
            });
            break;
          }

          // ---- znajdźki (wspólna grupa coins, rozróżniane przez data) ----
          case 'c': {
            // moneta z symbolem dolara — obraca się wokół osi (tween scaleX)
            const coin = objs.coins.create(x, y, 'coin_dollar') as Phaser.Physics.Arcade.Image;
            coin.setScale(0.18).refreshBody();
            coin.setData('kind', 'coin');
            scene.tweens.add({ targets: coin, scaleX: 0.05, duration: 500, yoyo: true, repeat: -1, delay: (c % 5) * 90, ease: 'Sine.easeInOut' });
            break;
          }
          case 'g': {
            const gem = objs.coins.create(x, y, 'kenney', 'gemYellow.png') as Phaser.Physics.Arcade.Image;
            gem.setScale(0.4).refreshBody();
            gem.setData('kind', 'gem');
            scene.tweens.add({ targets: gem, y: y - 10, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            break;
          }
          case 'h': {
            const heart = objs.coins.create(x, y, 'kenney', 'hudHeart_full.png') as Phaser.Physics.Arcade.Image;
            heart.setScale(0.4).refreshBody();
            heart.setData('kind', 'heart');
            scene.tweens.add({ targets: heart, scale: 0.46, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            break;
          }
          case 'a': {
            // amunicja — pionowy nabój rewolwerowy
            const ammo = objs.coins.create(x, y, 'cartridge') as Phaser.Physics.Arcade.Image;
            ammo.setScale(0.18).refreshBody();
            ammo.setData('kind', 'ammo');
            scene.tweens.add({ targets: ammo, y: y - 8, angle: 12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            break;
          }
          case 'd': {
            const dyn = objs.coins.create(x, y, 'dynamite') as Phaser.Physics.Arcade.Image;
            dyn.setScale(0.2).refreshBody();
            dyn.setData('kind', 'dynamite');
            scene.tweens.add({ targets: dyn, angle: 8, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            break;
          }
          case 'A': {
            const art = objs.coins.create(x, y, 'artifact') as Phaser.Physics.Arcade.Image;
            art.setScale(0.28).refreshBody();
            art.setData('kind', 'artifact');
            art.setDepth(6);
            scene.tweens.add({ targets: art, y: y - 12, scale: 0.32, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            const glow = scene.add.circle(x, y, 42, 0xffd700, 0.25).setDepth(5);
            scene.tweens.add({ targets: glow, scale: 1.4, alpha: 0.08, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            art.setData('glow', glow);
            break;
          }

          case '?': {
            const box = objs.coinBoxes.create(x, y, 'kenney', 'boxCoin.png') as Phaser.Physics.Arcade.Image;
            box.setScale(0.5).refreshBody();
            box.setData('coins', 3);
            break;
          }

          case 'j': {
            const spring = objs.springs.create(x, (r + 1) * TILE - 14, 'kenney', 'spring.png') as Phaser.Physics.Arcade.Image;
            spring.setScale(0.5).setOrigin(0.5, 1).refreshBody();
            (spring.body as Phaser.Physics.Arcade.StaticBody).setSize(TILE * 0.8, 26).setOffset(6, 38);
            break;
          }

          case 'C': {
            const cp = objs.checkpoints.create(x, (r + 1) * TILE, 'kenney', 'flagYellow_down.png') as Phaser.Physics.Arcade.Sprite;
            cp.setScale(0.5).setOrigin(0.5, 1).refreshBody();
            (cp.body as Phaser.Physics.Arcade.StaticBody).setSize(TILE, TILE * 2).setOffset(0, -TILE);
            cp.setData('active', false);
            cp.setDepth(4);
            break;
          }

          // ---- przeciwnicy (fabryki z entities/enemies.ts) ----
          case 's':
            spawnBandit(scene, objs.enemies, x, y, levelIndex, c);
            break;
          case 'f':
            spawnVulture(scene, objs.enemies, x, y, levelIndex);
            break;
          case 'e':
            spawnScorpion(scene, objs.enemies, x, y, levelIndex, c);
            break;
          case 'i':
            spawnIndian(scene, objs.enemies, x, y, levelIndex, c);
            break;
          case 'G':
            spawnBoss(scene, objs.enemies, x, y);
            break;

          case 'S': {
            // przydrożny sklep — sensor zakupu pocisków dum-dum
            const shop = objs.shops.create(x, (r + 1) * TILE, 'shop') as Phaser.Physics.Arcade.Image;
            shop.setOrigin(0.5, 1).setScale(0.55);
            shop.refreshBody();
            (shop.body as Phaser.Physics.Arcade.StaticBody).setSize(TILE * 2, TILE * 2).setOffset(0, 0);
            shop.setDepth(2);
            shop.setData('purchased', false);
            break;
          }

          case 'F': {
            const flag = scene.add.sprite(x, (r + 1) * TILE, 'kenney', 'flagGreen1.png').setScale(0.55).setOrigin(0.5, 1).setDepth(5);
            scene.time.addEvent({
              delay: 350,
              loop: true,
              callback: () => {
                if (!flag.active) return;
                flag.setFrame(flag.frame.name === 'flagGreen1.png' ? 'flagGreen2.png' : 'flagGreen1.png');
              },
            });
            objs.flag = flag;
            break;
          }

          case 'P':
            objs.spawnPoint.set(x, y - TILE / 2);
            break;

          // ---- dekoracje ----
          case 'b':
            scene.add.image(x, (r + 1) * TILE, 'kenney', 'cactus.png').setScale(0.5).setOrigin(0.5, 1).setDepth(decoDepth);
            break;
          case 'm':
            scene.add.image(x, (r + 1) * TILE, 'kenney', 'fence.png').setScale(0.5).setOrigin(0.5, 1).setDepth(decoDepth);
            break;
          case 'r':
            scene.add.image(x, (r + 1) * TILE, 'kenney', 'rock.png').setScale(0.5).setOrigin(0.5, 1).setDepth(decoDepth);
            break;
        }
      }
    }
    return objs;
  }

  /** tło z paralaksą + dekoracyjne chmury i tumbleweedy */
  static buildBackground(scene: Phaser.Scene, level: LevelDef, worldW: number, worldH: number): void {
    const bg = scene.add.image(0, worldH / 2, level.theme.bg).setScrollFactor(0.05, 0.02).setDepth(-10).setTint(level.theme.bgTint);
    const scale = Math.max((scene.scale.width + worldW * 0.05 + 64) / bg.width, (worldH + 64) / bg.height);
    bg.setScale(scale).setOrigin(0, 0.55);

    // dryfujące chmury
    for (let i = 0; i < 6; i++) {
      const cx = Phaser.Math.Between(100, worldW - 100);
      const cy = Phaser.Math.Between(40, worldH * 0.35);
      const cloud = scene.add.ellipse(cx, cy, Phaser.Math.Between(120, 220), Phaser.Math.Between(36, 60), 0xffffff, 0.5).setScrollFactor(0.3, 0.15).setDepth(-8);
      scene.tweens.add({ targets: cloud, x: cx + Phaser.Math.Between(40, 120), duration: Phaser.Math.Between(6000, 12000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // kule ostu (tumbleweed)
    for (let i = 0; i < 4; i++) {
      const ty = worldH - TILE * 3.6;
      const tw = scene.add.circle(Phaser.Math.Between(200, worldW - 200), ty, Phaser.Math.Between(10, 16), 0x8a6a3b, 0.75).setDepth(-2);
      scene.tweens.add({ targets: tw, x: `+=${Phaser.Math.Between(300, 700)}`, duration: Phaser.Math.Between(7000, 14000), repeat: -1, yoyo: true, ease: 'Sine.easeInOut' });
      scene.tweens.add({ targets: tw, y: ty - 14, duration: 420, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    }
  }
}
