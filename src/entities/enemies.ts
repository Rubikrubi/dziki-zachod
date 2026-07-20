import Phaser from 'phaser';
import { CONFIG, TILE } from '../config';
import { sfx } from '../audio';

/** Typy przeciwników występujące w grze */
export type EnemyType = 'bandit' | 'vulture' | 'scorpion' | 'indian' | 'boss';

/**
 * Fabryki przeciwników + system ich AI.
 * Dane jednostkowe (hp, kierunek, zasięg patrolu) trzymamy w DataManagerze
 * sprite'a — dzięki temu jedna grupa fizyczna obsługuje wszystkie typy,
 * a kolizje pozostają proste (grupa vs gracz / pociski).
 */

/** bandyta — naziemny patrol; 2-klatkowa animacja chodu (złowrogi uśmiech),
 *  krok animowany w updateEnemyAI — tekstura przelicza się z prędkością marszu */
export function spawnBandit(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, y: number, levelIndex: number, dirSeed: number): void {
  const E = CONFIG.enemies.bandit;
  const bandit = group.create(x, y + TILE / 2, 'bandit_walk1') as Phaser.Physics.Arcade.Sprite;
  bandit.setScale(0.3).setOrigin(0.5, 1);
  bandit.body!.setSize(155, 225).setOffset(50, 30);
  bandit.setData({
    type: 'bandit' satisfies EnemyType,
    hp: E.hp,
    dir: dirSeed % 2 === 0 ? 1 : -1,
    minX: x - E.patrolRange,
    maxX: x + E.patrolRange,
    speed: E.speedBase + levelIndex * E.speedPerLevel,
    score: E.score,
    /** akumulator czasu do przełączania klatek chodu */
    walkAnimTime: 0,
    walkFrame: 0,
  });
}

/** sęp — lot wahadłowy na tweenach (ciało kinematyczne: moves=false) */
export function spawnVulture(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, y: number, levelIndex: number): void {
  const E = CONFIG.enemies.vulture;
  const vulture = group.create(x, y, 'vulture') as Phaser.Physics.Arcade.Sprite;
  vulture.setScale(0.42);
  const body = vulture.body as Phaser.Physics.Arcade.Body;
  body.setAllowGravity(false);
  body.moves = false;
  body.setSize(170, 110).setOffset(43, 70);
  vulture.setData({ type: 'vulture' satisfies EnemyType, hp: E.hp, score: E.score });

  const range = E.rangeBase + levelIndex * E.rangePerLevel;
  scene.tweens.add({
    targets: vulture,
    x: x + range,
    duration: Math.max(600, E.durationBase - levelIndex * E.durationPerLevel),
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    onYoyo: () => vulture.setFlipX(true),
    onRepeat: () => vulture.setFlipX(false),
  });
  scene.tweens.add({ targets: vulture, y: y - 30, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

/** skorpion — szybki patrol, 2 HP, odporny na zgniecenie (noStomp) */
export function spawnScorpion(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, y: number, levelIndex: number, dirSeed: number): void {
  const E = CONFIG.enemies.scorpion;
  const scorp = group.create(x, y + TILE / 2, 'scorpion') as Phaser.Physics.Arcade.Sprite;
  scorp.setScale(0.38).setOrigin(0.5, 1);
  scorp.body!.setSize(180, 110).setOffset(38, 110);
  scorp.setData({
    type: 'scorpion' satisfies EnemyType,
    hp: E.hp,
    dir: dirSeed % 2 === 0 ? 1 : -1,
    minX: x - E.patrolRange,
    maxX: x + E.patrolRange,
    speed: E.speedBase + levelIndex * E.speedPerLevel,
    score: E.score,
    noStomp: true,
  });
}

/** Indianin — patroluje, po zauważeniu gracza szarżuje z tomahawkiem */
export function spawnIndian(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, y: number, levelIndex: number, dirSeed: number): void {
  const E = CONFIG.enemies.indian;
  const indian = group.create(x, y + TILE / 2, 'indian') as Phaser.Physics.Arcade.Sprite;
  indian.setScale(0.42).setOrigin(0.5, 1);
  indian.body!.setSize(140, 170).setOffset(58, 60);
  indian.setData({
    type: 'indian' satisfies EnemyType,
    hp: E.hp,
    dir: dirSeed % 2 === 0 ? 1 : -1,
    minX: x - E.patrolRange,
    maxX: x + E.patrolRange,
    speed: E.speedBase + levelIndex * E.speedPerLevel,
    chargeSpeed: E.chargeBase + levelIndex * E.chargePerLevel,
    charging: false,
    score: E.score,
  });
}

/**
 * SUPER BOSS — ryczący niedźwiedź grizzly. Strzeże mety ostatniego poziomu.
 * Odporny na zwykłe pociski, dynamit i zgniecenie — ranią go TYLKO
 * pociski dum-dum kupione w sklepie. 3 trafienia = zwycięstwo.
 */
export function spawnBoss(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, y: number): void {
  const E = CONFIG.enemies.boss;
  const boss = group.create(x, y + TILE / 2, 'grizzly') as Phaser.Physics.Arcade.Sprite;
  boss.setScale(0.42).setOrigin(0.5, 1);
  boss.body!.setSize(300, 440).setOffset(56, 60);
  boss.setData({
    type: 'boss' satisfies EnemyType,
    hp: E.hp,
    maxHp: E.hp,
    dir: -1,
    minX: x - E.patrolRange,
    maxX: x + E.patrolRange,
    speed: E.speed,
    score: E.score,
    noStomp: true,
  });
  boss.setDepth(9);

  // okresowy RYK: pauza w patrolu, powiększenie, wstrząs kamery
  scene.time.addEvent({
    delay: 3200,
    loop: true,
    callback: () => {
      if (!boss.active || !(boss.body as Phaser.Physics.Arcade.Body)?.enable) return;
      sfx.roar.play();
      boss.setData('roaring', true);
      boss.setVelocityX(0);
      scene.tweens.add({
        targets: boss,
        scaleX: 0.46,
        scaleY: 0.46,
        duration: 220,
        yoyo: true,
        repeat: 1,
        onComplete: () => boss.setData('roaring', false),
      });
      scene.cameras.main.shake(250, 0.008);
    },
  });
}

/**
 * AI przeciwników — wołane raz na klatkę dla całej grupy.
 * Patrol w zadanym zakresie + szarża Indian po wykryciu gracza.
 * `onIndianAlert` pozwala scenie pokazać "❗" bez zależności od Effects.
 */
export function updateEnemyAI(
  group: Phaser.Physics.Arcade.Group,
  player: Phaser.Physics.Arcade.Sprite,
  playerDead: boolean,
  onIndianAlert: (x: number, y: number) => void,
  delta = 16.7
): void {
  const E = CONFIG.enemies.indian;
  const BANDIT_FRAME_MS = 220; // tempo przekładania nóg bandyty
  group.children.each((child) => {
    const e = child as Phaser.Physics.Arcade.Sprite;
    const type = e.getData('type') as EnemyType;
    if (!e.active || type === 'vulture') return true;
    const body = e.body as Phaser.Physics.Arcade.Body;
    if (!body.enable) return true;
    // boss w trakcie ryku stoi w miejscu
    if (type === 'boss' && e.getData('roaring')) return true;

    let dir = e.getData('dir') as number;

    if (type === 'indian') {
      const dx = player.x - e.x;
      const dy = Math.abs(player.y - (e.y - e.displayHeight / 2));
      const sees = Math.abs(dx) < E.sightX && dy < TILE * E.sightYTiles && !playerDead;
      const wasCharging = e.getData('charging') as boolean;
      if (sees) {
        if (!wasCharging) {
          e.setData('charging', true);
          e.setTexture('indian_run');
          onIndianAlert(e.x, e.y - e.displayHeight - 10);
        }
        dir = dx >= 0 ? 1 : -1;
        e.setData('dir', dir);
        e.setVelocityX(dir * (e.getData('chargeSpeed') as number));
        e.setFlipX(dir < 0);
        return true;
      }
      if (wasCharging) {
        e.setData('charging', false);
        e.setTexture('indian');
      }
    }

    if (e.x <= (e.getData('minX') as number) || body.blocked.left) dir = 1;
    if (e.x >= (e.getData('maxX') as number) || body.blocked.right) dir = -1;
    e.setData('dir', dir);
    e.setVelocityX(dir * (e.getData('speed') as number));
    e.setFlipX(dir < 0);

    // 2-klatkowa animacja chodu bandyty (sprite jest profilem — flipX + krok)
    if (type === 'bandit') {
      let t = (e.getData('walkAnimTime') as number) + delta;
      if (t >= BANDIT_FRAME_MS) {
        t = 0;
        const frame = 1 - (e.getData('walkFrame') as number);
        e.setData('walkFrame', frame);
        e.setTexture(frame === 0 ? 'bandit_walk1' : 'bandit_walk2');
      }
      e.setData('walkAnimTime', t);
    }
    return true;
  });
}

