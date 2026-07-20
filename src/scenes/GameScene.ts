import Phaser from 'phaser';
import { CONFIG, TILE } from '../config';
import { LEVELS } from '../levels';
import { sfx } from '../audio';
import { Player } from '../entities/Player';
import { updateEnemyAI } from '../entities/enemies';
import { InputController } from '../systems/InputController';
import { TouchControls } from '../systems/TouchControls';
import { Effects } from '../systems/Effects';
import { Hud } from '../systems/Hud';
import { CombatSystem } from '../systems/CombatSystem';
import { LootSystem } from '../systems/LootSystem';
import { LevelBuilder, LevelObjects } from '../systems/LevelBuilder';
import { computeTimeBonus, formatTime } from '../systems/scoring';
import { Storage } from '../systems/Storage';

/** dane przekazywane między poziomami / restartami */
export interface GameSceneData {
  level?: number;
  score?: number;
  hearts?: number;
  /** amunicja przenoszona z poprzedniego poziomu */
  ammo?: number;
  /** dynamit przenoszony z poprzedniego poziomu */
  dynamites?: number;
  /** nazwa gracza — przenoszona między poziomami do ekranów końcowych */
  playerName?: string;
}

/**
 * GameScene — orkiestrator rozgrywki. Sama nie implementuje mechanik:
 * deleguje do systemów (Combat/Loot/Effects/Hud/LevelBuilder) i encji
 * (Player, enemies). Trzyma wyłącznie stan przebiegu (wynik, serca,
 * checkpoint) i spina kolizje między grupami.
 */
export class GameScene extends Phaser.Scene {
  // --- systemy i encje ---
  private player!: Player;
  private inputCtl!: InputController;
  private effects!: Effects;
  private hud!: Hud;
  private combat!: CombatSystem;
  private loot!: LootSystem;
  private world!: LevelObjects;

  // --- stan przebiegu gry ---
  private levelIndex = 0;
  private score = 0;
  private hearts = 3;
  private readonly maxHearts = 3;
  private coinCount = 0;
  private invulnUntil = 0;
  private levelDone = false;
  private dead = false;
  private immortal = false;
  private levelStartScore = 0;
  private levelStartHearts = 3;
  private lastBossHintAt = -9999;
  private startAmmo: number = CONFIG.combat.startAmmo;
  private startDynamites = 0;
  private levelElapsedMs = 0;
  private lastShownSec = -1;
  private playerName = 'Gracz';

  constructor() {
    super('Game');
  }

  init(data: GameSceneData) {
    this.levelIndex = data.level ?? 0;
    this.score = data.score ?? 0;
    this.hearts = data.hearts ?? 3;
    // ekwipunek sumuje się i przechodzi między poziomami
    // (minimum startowe amunicji, żeby nie zostać z pustym rewolwerem)
    this.startAmmo = Math.max(data.ammo ?? CONFIG.combat.startAmmo, CONFIG.combat.startAmmo);
    this.startDynamites = data.dynamites ?? 0;
    this.playerName = data.playerName ?? (Storage.getPlayerName() || 'Gracz');
    this.levelStartScore = this.score;
    this.levelStartHearts = this.hearts;
    this.coinCount = 0;
    this.levelDone = false;
    this.dead = false;
    this.immortal = false;
    this.invulnUntil = 0;
  }

  create() {
    const level = LEVELS[this.levelIndex];

    // ---- świat ----
    this.world = LevelBuilder.build(this, level, this.levelIndex);
    const { worldW, worldH } = this.world;
    this.physics.world.setBounds(0, -TILE * 6, worldW, worldH + TILE * 6);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    LevelBuilder.buildBackground(this, level, worldW, worldH);

    // ---- systemy ----
    this.effects = new Effects(this);
    this.inputCtl = new InputController(this);
    this.player = new Player(this, this.world.spawnPoint.x, this.world.spawnPoint.y, this.inputCtl, this.effects);

    this.combat = new CombatSystem({
      scene: this,
      player: this.player,
      effects: this.effects,
      enemies: this.world.enemies,
      initialAmmo: this.startAmmo,
      initialDynamites: this.startDynamites,
      killEnemy: (e, shot) => this.killEnemy(e, shot),
      damagePlayer: (fromX) => this.damagePlayer(fromX),
      canAct: () => !this.levelDone && !this.dead,
      onAmmoChanged: (ammo) => this.hud.setAmmo(ammo, true),
      onAmmoEmpty: () => this.hud.shakeAmmo(),
      onDynamitesChanged: (n) => this.hud.setDynamites(n, true),
      onDynamitesEmpty: () => this.hud.shakeDynamites(),
    });
    this.combat.onDumdumChanged = (n) => this.hud.setDumdum(n);

    this.loot = new LootSystem({
      scene: this,
      effects: this.effects,
      addScore: (v) => this.addScore(v),
      addCoins: (n) => {
        this.coinCount += n;
        this.hud.setCoins(this.coinCount);
      },
      addAmmo: (n) => this.combat.addAmmo(n),
      addDynamites: (n) => this.combat.addDynamites(n),
      getCoins: () => this.coinCount,
      tryAddHeart: () => this.tryAddHeart(),
      activateImmortality: () => this.activateImmortality(),
    });

    // ---- wejście ----
    this.inputCtl.onShoot = () => this.combat.tryShoot();
    this.inputCtl.onDynamite = () => this.combat.tryPlantDynamite();
    this.inputCtl.bindPause(() => this.pauseGame());
    new TouchControls(this, this.inputCtl, () => this.player.notifyJumpPressed());

    // ---- HUD ----
    this.hud = new Hud(this, {
      maxHearts: this.maxHearts,
      hearts: this.hearts,
      score: this.score,
      ammo: this.combat.getAmmo(),
      dynamites: this.combat.getDynamites(),
      levelIndex: this.levelIndex,
      levelCount: LEVELS.length,
      levelName: level.name,
      onPause: () => this.pauseGame(),
    });

    this.setupCollisions();

    // ---- kamera ----
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(120, 80);

    this.showLevelBanner(level.name);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // ---- zegar poziomu ----
    this.levelElapsedMs = 0;
    this.lastShownSec = -1;
  }

  /** wszystkie collidery/overlapy w jednym miejscu */
  private setupCollisions(): void {
    const w = this.world;
    const p = this.player.sprite;

    this.physics.add.collider(p, w.ground);
    this.physics.add.collider(p, w.platforms);
    this.physics.add.collider(p, w.movingPlatforms);
    this.physics.add.collider(p, w.coinBoxes, (_p, box) => this.loot.hitCoinBox(box as Phaser.Physics.Arcade.Image, this.player.body, this.player.y), undefined, this);
    this.physics.add.collider(w.enemies, w.ground);

    this.physics.add.overlap(p, w.coins, (_p, c) => this.loot.collect(c as Phaser.Physics.Arcade.Image), undefined, this);
    this.physics.add.overlap(p, w.chests, (_p, ch) => this.loot.openChest(ch as Phaser.Physics.Arcade.Image), undefined, this);
    this.physics.add.overlap(p, w.shops, (_p, s) => this.visitShop(s as Phaser.Physics.Arcade.Image), undefined, this);
    this.physics.add.overlap(p, w.lava, () => this.hitHazard(), undefined, this);
    this.physics.add.overlap(p, w.enemies, (_p, e) => this.touchEnemy(e as Phaser.Physics.Arcade.Sprite), undefined, this);
    this.physics.add.overlap(p, w.springs, (_p, s) => this.hitSpring(s as Phaser.Physics.Arcade.Image), undefined, this);
    this.physics.add.overlap(p, w.checkpoints, (_p, c) => this.activateCheckpoint(c as Phaser.Physics.Arcade.Sprite), undefined, this);

    this.physics.add.overlap(this.combat.bullets, w.enemies, (b, e) => this.combat.onBulletHitEnemy(b as Phaser.Physics.Arcade.Image, e as Phaser.Physics.Arcade.Sprite), undefined, this);
    this.physics.add.collider(this.combat.bullets, w.ground, (b) => this.combat.onBulletHitWall(b as Phaser.Physics.Arcade.Image), undefined, this);
    this.physics.add.collider(this.combat.bullets, w.coinBoxes, (b) => this.combat.onBulletHitWall(b as Phaser.Physics.Arcade.Image), undefined, this);
  }

  /** czy na poziomie żyje jeszcze Super Boss (blokuje metę) */
  private isBossAlive(): boolean {
    let alive = false;
    this.world.enemies.children.each((child) => {
      const e = child as Phaser.Physics.Arcade.Sprite;
      if (e.active && e.getData('type') === 'boss') alive = true;
      return true;
    });
    return alive;
  }

  // ==================== PUNKTACJA / SERCA ====================

  private addScore(v: number): void {
    this.score += v;
    this.hud.setScore(this.score);
  }

  /** próbuje dodać serce; zwraca indeks ikony lub -1 przy pełnym HP */
  private tryAddHeart(): number {
    if (this.hearts >= this.maxHearts) return -1;
    this.hearts++;
    this.hud.setHearts(this.hearts, this.hearts - 1);
    return this.hearts - 1;
  }

  // ==================== WROGOWIE ====================

  /**
   * Przydrożny sklep — sprzedawca oddaje 3 pociski dum-dum za WSZYSTKIE
   * zebrane monety, ale tylko jeśli masz ich dość (min. 3 monety = 30 pkt
   * wartości). Brakuje choć jednej — nie ma transakcji!
   */
  private visitShop(shop: Phaser.Physics.Arcade.Image): void {
    if (shop.getData('purchased')) return;
    // anty-spam dialogu: odstęp między próbami
    const now = this.time.now;
    if (now < ((shop.getData('nextTryAt') as number) || 0)) return;
    shop.setData('nextTryAt', now + 1500);

    const priceCoins = Math.floor(CONFIG.combat.dumdumMinCoins / CONFIG.loot.coin);
    if (this.coinCount >= priceCoins) {
      // transakcja: wszystkie monety za 3 dum-dum
      shop.setData('purchased', true);
      const paid = this.coinCount;
      this.coinCount = 0;
      this.hud.setCoins(0);
      this.combat.addDumdum(CONFIG.combat.dumdumPackSize);
      sfx.win.play();
      sfx.reload.play();
      this.effects.coins.explode(24, shop.x, shop.y - 60);
      this.effects.popup(shop.x, shop.y - 130, `−${paid} monet → +${CONFIG.combat.dumdumPackSize} DUM-DUM! ⭐`);
      this.showShopBubble(shop, `Całe złoto za ${CONFIG.combat.dumdumPackSize} dum-dum.\nTylko one powalą grizzly!`, '#c8ffc8');
    } else {
      sfx.empty.play();
      this.showShopBubble(shop, `Potrzebuję ${priceCoins} monet — masz ${this.coinCount}.\nBez pełnej ceny nie ma dum-dum!`, '#ffc8c8');
    }
  }

  /** dymek dialogowy sprzedawcy nad sklepem */
  private showShopBubble(shop: Phaser.Physics.Arcade.Image, msg: string, color: string): void {
    const t = this.add
      .text(shop.x, shop.y - shop.displayHeight - 18, msg, {
        fontFamily: CONFIG.ui.fontUI,
        fontSize: '20px',
        color,
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5, 1)
      .setDepth(60)
      .setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 200, yoyo: true, hold: 1600, onComplete: () => t.destroy() });
  }

  /** uśmiercenie wroga (strzał/zgniecenie/aura) + punkty + efekty */
  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite, shot: boolean): void {
    // nieśmiertelność/aura NIE zabija bossa — tylko dum-dum (obsługa w CombatSystem)
    if (enemy.getData('type') === 'boss' && !shot) return;
    const score = (enemy.getData('score') as number) || 25;
    (enemy.body as Phaser.Physics.Arcade.Body).enable = false;
    this.tweens.killTweensOf(enemy);
    sfx.stomp.play();
    if (shot) {
      // zestrzelony — odlatuje obracając się
      const dir = this.player.x < enemy.x ? 1 : -1;
      this.tweens.add({
        targets: enemy,
        x: enemy.x + dir * 90,
        y: enemy.y - 60,
        angle: dir * 200,
        alpha: 0,
        scale: enemy.scale * 0.6,
        duration: 450,
        ease: 'Quad.easeOut',
        onComplete: () => enemy.destroy(),
      });
    } else {
      // zgnieciony
      this.tweens.add({ targets: enemy, alpha: 0, y: enemy.y + 20, scaleY: enemy.scaleY * 0.3, duration: 400, onComplete: () => enemy.destroy() });
    }
    this.addScore(score);
    this.effects.popup(enemy.x, enemy.y - 30, `+${score}`);
    this.effects.coins.explode(10, enemy.x, enemy.y - 20);
    this.effects.shake(80, 0.004);
  }

  /** kontakt gracz–wróg: zgniecenie / ogłuszenie / obrażenia */
  private touchEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!enemy.active || this.levelDone || this.dead) return;
    // nieśmiertelny kowboj niszczy wrogów dotknięciem (oprócz bossa!)
    if (this.immortal && enemy.getData('type') !== 'boss') {
      this.killEnemy(enemy, true);
      return;
    }
    const falling = this.player.body.velocity.y > 60;
    const above = this.player.y < enemy.y - enemy.displayHeight * 0.45;
    // boss: dotknięcie ZAWSZE rani gracza (nawet nieśmiertelnego odpycha)
    if (enemy.getData('type') === 'boss') {
      this.damagePlayer(enemy.x);
      return;
    }
    if (falling && above && !enemy.getData('noStomp')) {
      this.player.sprite.setVelocityY(CONFIG.player.stompBounce);
      const hp = ((enemy.getData('hp') as number) || 1) - 1;
      enemy.setData('hp', hp);
      if (hp > 0) {
        // twardy przeciwnik — skok tylko ogłusza
        sfx.stomp.play();
        enemy.setTintFill(0xffffff);
        this.time.delayedCall(90, () => {
          if (enemy.active) enemy.clearTint();
        });
        this.effects.dust.explode(8, enemy.x, enemy.y - enemy.displayHeight / 2);
        return;
      }
      this.killEnemy(enemy, false);
    } else {
      this.damagePlayer(enemy.x);
    }
  }

  // ==================== OBRAŻENIA / ŚMIERĆ ====================

  private hitHazard(): void {
    if (this.time.now < this.invulnUntil || this.levelDone || this.dead) return;
    this.damagePlayer(this.player.x, true);
  }

  private damagePlayer(fromX: number, respawn = false): void {
    if (this.time.now < this.invulnUntil || this.levelDone || this.dead) return;

    // artefakt nieśmiertelności — bez obrażeń do końca poziomu
    if (this.immortal) {
      this.invulnUntil = this.time.now + 400;
      this.effects.coins.explode(8, this.player.x, this.player.y);
      if (respawn) {
        this.player.teleport(this.world.spawnPoint.x, this.world.spawnPoint.y);
        this.cameras.main.flash(200, 255, 220, 120);
      } else {
        this.player.knockback(fromX, 200, -250);
      }
      return;
    }

    this.hearts--;
    this.invulnUntil = this.time.now + CONFIG.player.hurtInvulnMs;
    sfx.hurt.play();
    this.effects.shake(200, 0.012);
    this.hud.setHearts(this.hearts);

    if (this.hearts <= 0) {
      this.onPlayerDeath();
      return;
    }

    if (respawn) {
      this.player.teleport(this.world.spawnPoint.x, this.world.spawnPoint.y);
      this.cameras.main.flash(250, 255, 80, 80);
    } else {
      this.player.knockback(fromX, 260, -320);
    }

    // miganie w czasie nietykalności
    this.tweens.add({ targets: this.player.sprite, alpha: 0.3, duration: 120, yoyo: true, repeat: 5, onComplete: () => this.player.sprite.setAlpha(1) });
  }

  private onPlayerDeath(): void {
    this.dead = true;
    this.player.sprite.setTint(0xff8888);
    this.player.sprite.setAngle(-15);
    this.physics.pause();
    this.time.delayedCall(700, () => {
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameOver', {
          won: false,
          score: this.score,
          level: this.levelIndex,
          retryScore: this.levelStartScore,
          retryHearts: Math.max(this.levelStartHearts, 2),
          playerName: this.playerName,
        });
      });
    });
  }

  // ==================== INTERAKCJE ŚWIATA ====================

  private hitSpring(spring: Phaser.Physics.Arcade.Image): void {
    const body = this.player.body;
    if (body.velocity.y < 0) return; // tylko przy opadaniu/staniu
    body.setVelocityY(CONFIG.player.springVel);
    sfx.jump.play();
    sfx.stomp.play();
    this.tweens.add({ targets: spring, scaleY: 0.3, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    this.effects.dust.explode(10, spring.x, spring.y - 10);
    this.effects.shake(90, 0.004);
  }

  private activateCheckpoint(cp: Phaser.Physics.Arcade.Sprite): void {
    if (cp.getData('active')) return;
    cp.setData('active', true);
    cp.setFrame('flagYellow1.png');
    this.world.spawnPoint.set(cp.x, cp.y - TILE * 1.5);
    sfx.win.play();
    this.effects.coins.explode(14, cp.x, cp.y - 40);
    this.effects.popup(cp.x, cp.y - 80, 'CHECKPOINT!');
    this.time.addEvent({
      delay: 350,
      loop: true,
      callback: () => {
        if (!cp.active || !cp.getData('active')) return;
        cp.setFrame(cp.frame.name === 'flagYellow1.png' ? 'flagYellow2.png' : 'flagYellow1.png');
      },
    });
  }

  private activateImmortality(): void {
    this.immortal = true;
    sfx.win.play();
    sfx.coin.play();
    this.cameras.main.flash(400, 255, 230, 120);
    this.effects.coins.explode(30, this.player.x, this.player.y);
    this.player.sprite.setTint(0xffe08a);
    this.effects.aura.start();
    this.addScore(CONFIG.loot.artifactScore);

    const txt = this.add
      .text(this.scale.width / 2, this.scale.height * 0.32, 'GWIAZDA SZERYFA!\nNietykalny do końca poziomu ⭐', {
        fontFamily: CONFIG.ui.fontWest,
        fontSize: '42px',
        color: '#ffe15c',
        stroke: '#7a5c00',
        strokeThickness: 9,
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setScale(0);
    this.tweens.add({ targets: txt, scale: 1, duration: 400, ease: 'Back.easeOut' });
    this.tweens.add({ targets: txt, alpha: 0, delay: 2200, duration: 500, onComplete: () => txt.destroy() });
  }

  // ==================== PRZEBIEG POZIOMU ====================

  private pauseGame(): void {
    if (this.levelDone || this.dead) return;
    sfx.click.play();
    this.scene.launch('Pause');
    this.scene.pause();
  }

  private showLevelBanner(name: string): void {
    const banner = this.add
      .text(this.scale.width / 2, this.scale.height * 0.35, `Poziom ${this.levelIndex + 1}\n${name}`, {
        fontFamily: CONFIG.ui.fontWest,
        fontSize: '52px',
        color: '#ffe6b3',
        stroke: '#5c2e0d',
        strokeThickness: 10,
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, duration: 400, yoyo: true, hold: 1100, onComplete: () => banner.destroy() });
  }

  private completeLevel(): void {
    if (this.levelDone) return;
    this.levelDone = true;
    sfx.win.play();
    const bonus = CONFIG.levelBonus.base + this.hearts * CONFIG.levelBonus.perHeart;
    this.addScore(bonus);

    // bonus za czas (dodatkowy, ponad bonus bazowy powyżej)
    const seconds = this.levelElapsedMs / 1000;
    const par = LEVELS[this.levelIndex].par ?? CONFIG.time.defaultPar;
    const tb = computeTimeBonus(seconds, par, CONFIG.time);
    if (tb.bonus > 0) this.addScore(tb.bonus);

    this.player.sprite.setVelocityX(0);
    this.player.sprite.setAccelerationX(0);
    if (this.world.flag) this.effects.coins.explode(24, this.world.flag.x, this.world.flag.y - 60);

    const txt = this.add
      .text(
        this.scale.width / 2,
        this.scale.height * 0.4,
        `POZIOM UKOŃCZONY!\n+${bonus}` +
          (tb.bonus > 0
            ? `\n${tb.medal === 'gold' ? '🥇' : tb.medal === 'silver' ? '🥈' : '🥉'} +${tb.bonus} za czas (${formatTime(seconds)})`
            : `\n⏱ ${formatTime(seconds)}`),
        {
          fontFamily: CONFIG.ui.fontWest,
          fontSize: '56px',
          color: '#ffe15c',
          stroke: '#7a5c00',
          strokeThickness: 10,
          align: 'center',
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setScale(0);
    this.tweens.add({ targets: txt, scale: 1, duration: 400, ease: 'Back.easeOut' });

    this.time.delayedCall(1600, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (this.levelIndex + 1 < LEVELS.length) {
          this.scene.restart({
            level: this.levelIndex + 1,
            score: this.score,
            hearts: this.hearts,
            ammo: this.combat.getAmmo(),
            dynamites: this.combat.getDynamites(),
            playerName: this.playerName,
          } satisfies GameSceneData);
        } else {
          // finał gry (Super Boss pokonany) — ceremonia szeryfa + napisy końcowe
          this.scene.start('Ending', { score: this.score, playerName: this.playerName });
        }
      });
    });
  }

  // ==================== PĘTLA GRY ====================

  update(time: number, delta: number) {
    if (!this.player || this.levelDone || this.dead) return;

    // zegar poziomu — licznik HUD aktualizowany tylko przy zmianie pełnej sekundy
    if (!this.levelDone && !this.dead) {
      this.levelElapsedMs += delta;
      const sec = Math.floor(this.levelElapsedMs / 1000);
      if (sec !== this.lastShownSec) {
        this.lastShownSec = sec;
        this.hud.setTime(sec);
      }
    }

    // akcje jednorazowe (strzał / dynamit z klawiatury)
    this.inputCtl.pollActions();

    // ruch gracza; true = tryb drabiny (dalej tylko meta/upadek)
    const touchingLadder = this.physics.overlap(this.player.sprite, this.world.ladders);
    this.player.update(time, delta, touchingLadder);

    // aura nieśmiertelności podąża za graczem
    if (this.immortal) this.effects.aura.setPosition(this.player.x, this.player.y);

    // AI przeciwników
    updateEnemyAI(this.world.enemies, this.player.sprite, this.dead, (x, y) => this.effects.popup(x, y, '❗'), delta);

    // meta — flaga (na poziomie finałowym zablokowana, dopóki żyje Super Boss)
    if (this.world.flag) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.world.flag.x, this.world.flag.y - 40);
      if (d < 70) {
        if (this.isBossAlive()) {
          // przypomnienie co ~1,2 s zamiast spamu co klatkę
          if (time - this.lastBossHintAt > 1200) {
            this.lastBossHintAt = time;
            this.effects.popup(this.world.flag.x, this.world.flag.y - 120, 'Pokonaj SUPER BOSSA! 🐻');
          }
        } else {
          this.completeLevel();
        }
      }
    }

    // upadek poza świat
    if (this.player.y > this.physics.world.bounds.bottom - 10) {
      this.invulnUntil = 0;
      this.damagePlayer(this.player.x, true);
    }
  }
}
