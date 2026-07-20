import Phaser from 'phaser';
import { CONFIG, SKINS } from '../config';
import { sfx } from '../audio';
import { Storage } from '../systems/Storage';
import { InputController } from '../systems/InputController';
import { Effects } from '../systems/Effects';

/**
 * Gracz — kowboj. Kapsułkuje CAŁĄ logikę ruchu:
 * bieg z przyspieszeniem, skok (coyote time + jump buffer + zmienna
 * wysokość), asymetryczną grawitację, wspinaczkę po drabinach
 * i dobór tekstury/animacji. Scena tylko woła update() raz na klatkę.
 */
export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private input: InputController;
  private effects: Effects;

  private lastGroundedAt = -9999;
  private jumpPressedAt = -9999;
  private jumpWasHeld = false;
  private wasGrounded = true;
  private walkPhase = 0;
  /** true gdy gracz jest w trybie wspinaczki */
  onLadder = false;
  /** klucze tekstur wybranej postaci (Kowboj / Kowbojka) */
  private readonly texStand: string;
  private readonly texJump: string;
  private readonly texShoot: string;
  private readonly texClimb1: string;
  private readonly texClimb2: string;
  /** do kiedy obowiązuje poza strzału (ms czasu sceny) */
  private shootPoseUntil = -9999;
  /** akumulator czasu animacji wspinaczki */
  private climbAnimTime = 0;
  private climbFrame = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, input: InputController, effects: Effects) {
    this.scene = scene;
    this.input = input;
    this.effects = effects;

    const P = CONFIG.player;
    const skin = SKINS[Storage.getSkin()];
    this.texStand = skin.stand;
    this.texJump = skin.jump;
    this.texShoot = skin.shoot;
    this.texClimb1 = skin.climb1;
    this.texClimb2 = skin.climb2;
    this.sprite = scene.physics.add.sprite(x, y, this.texStand);
    this.sprite.setScale(P.scale);
    this.sprite.body!.setSize(P.body.w, P.body.h).setOffset(P.body.offX, P.body.offY);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setMaxVelocity(P.maxVelX, P.maxVelY);
    this.sprite.setDragX(P.drag);
    this.sprite.setDepth(10);
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  /** rejestruje wciśnięcie skoku (dla jump buffera) — wołane też przez przycisk dotykowy */
  notifyJumpPressed(): void {
    this.jumpPressedAt = this.scene.time.now;
  }

  teleport(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
  }

  /** odrzut po strzale + animacja strzału (poza z wyciągniętym rewolwerem) */
  applyRecoil(dir: number): void {
    this.sprite.setVelocityX(this.body.velocity.x - dir * CONFIG.combat.recoilPush);
    this.scene.tweens.add({ targets: this.sprite, angle: -dir * 6, duration: 60, yoyo: true });
    // klatka strzału trzymana ~220 ms — widoczny błysk i wyciągnięta ręka
    this.shootPoseUntil = this.scene.time.now + 220;
    this.sprite.setTexture(this.texShoot);
  }

  /** odepchnięcie po obrażeniach */
  knockback(fromX: number, vx: number, vy: number): void {
    const dir = this.sprite.x < fromX ? -1 : 1;
    this.sprite.setVelocity(dir * vx, vy);
  }

  /**
   * Główna pętla ruchu. `touchingLadder` — czy gracz nachodzi na drabinę
   * (dostarczane przez scenę, bo overlap liczy fizyka sceny).
   * Zwraca true, jeśli gracz jest w trybie drabiny (scena pomija wtedy
   * pozostałą logikę ruchu).
   */
  update(time: number, delta: number, touchingLadder: boolean): boolean {
    const P = CONFIG.player;
    const body = this.body;
    const dt = delta / 1000;
    const inp = this.input;

    if (inp.jumpJustPressed()) this.jumpPressedAt = time;

    // ---- DRABINA ----
    if (touchingLadder && !this.onLadder && (inp.up || inp.down)) this.onLadder = true;
    if (!touchingLadder) this.onLadder = false;

    if (this.onLadder) {
      body.setAllowGravity(false);
      body.setVelocityY(inp.up ? -P.climbSpeed : inp.down ? P.climbSpeed : 0);
      body.setAccelerationX(0);
      body.setVelocityX(inp.left && !inp.right ? -P.climbSideSpeed : inp.right && !inp.left ? P.climbSideSpeed : 0);
      this.sprite.setFlipX(false); // widok od tyłu — bez odbicia
      this.sprite.setAngle(0);
      // animacja wspinaczki: przekładanie rąk tylko podczas ruchu,
      // stanie w miejscu = stopklatka (jak w klasycznych platformówkach)
      const climbing = inp.up || inp.down || inp.left || inp.right;
      if (climbing) {
        this.climbAnimTime += delta;
        if (this.climbAnimTime >= P.climbFrameMs) {
          this.climbAnimTime = 0;
          this.climbFrame = 1 - this.climbFrame;
        }
      }
      this.sprite.setTexture(this.climbFrame === 0 ? this.texClimb1 : this.texClimb2);
      // zeskok z drabiny spacją
      if (inp.spaceJustPressed()) {
        this.onLadder = false;
        body.setAllowGravity(true);
        body.setVelocityY(P.jumpVel * P.ladderJumpFactor);
        sfx.jump.play();
      }
      return true;
    }
    body.setAllowGravity(true);

    // ---- BIEG ----
    if (inp.left && !inp.right) {
      body.setAccelerationX(-P.accel);
      this.sprite.setFlipX(true);
    } else if (inp.right && !inp.left) {
      body.setAccelerationX(P.accel);
      this.sprite.setFlipX(false);
    } else {
      body.setAccelerationX(0);
    }
    body.setMaxVelocityX(P.moveSpeed);

    // ---- SKOK: coyote time + jump buffer ----
    const grounded = body.blocked.down || body.touching.down;
    if (grounded) this.lastGroundedAt = time;

    // kurz przy lądowaniu
    if (grounded && !this.wasGrounded && body.velocity.y >= 0) {
      this.effects.dust.explode(8, this.sprite.x, this.sprite.y + this.sprite.displayHeight * 0.4);
    }
    this.wasGrounded = grounded;

    if (time - this.jumpPressedAt < P.bufferMs && time - this.lastGroundedAt < P.coyoteMs) {
      body.setVelocityY(P.jumpVel);
      this.jumpPressedAt = -9999;
      this.lastGroundedAt = -9999;
      sfx.jump.play();
      this.effects.dust.explode(6, this.sprite.x, this.sprite.y + this.sprite.displayHeight * 0.4);
    }

    // zmienna wysokość skoku — puszczenie klawisza skraca skok
    const jumpHeld = inp.jumpHeld;
    if (!jumpHeld && this.jumpWasHeld && body.velocity.y < -150) {
      body.setVelocityY(body.velocity.y * 0.5);
    }
    this.jumpWasHeld = jumpHeld;

    // asymetryczna grawitacja — szybsze opadanie
    if (body.velocity.y > 0) {
      body.velocity.y += CONFIG.physics.extraFallGravity * dt;
    }

    // ---- TEKSTURA / ANIMACJA ----
    // poza strzału ma priorytet — nie nadpisuj jej klatką biegu/skoku
    if (time < this.shootPoseUntil) {
      this.sprite.setTexture(this.texShoot);
      return false;
    }
    if (!grounded) {
      this.sprite.setTexture(this.texJump);
    } else {
      this.sprite.setTexture(this.texStand);
      if (Math.abs(body.velocity.x) > 20) {
        this.walkPhase += dt * P.walkWobbleSpeed;
        this.sprite.setAngle(Math.sin(this.walkPhase) * P.walkWobbleDeg);
      } else if (Math.abs(this.sprite.angle) > 0.5) {
        this.sprite.setAngle(this.sprite.angle * 0.8);
      } else {
        this.sprite.setAngle(0);
      }
    }
    return false;
  }
}
