import Phaser from 'phaser';

/**
 * Warstwa wejścia — scala klawiaturę i przyciski dotykowe w jeden
 * abstrakcyjny "stan intencji gracza". Reszta gry nie wie (i nie musi
 * wiedzieć), czy komenda przyszła z klawiatury, czy z ekranu dotykowego.
 */
export class InputController {
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: Record<'A' | 'D' | 'W' | 'X' | 'F' | 'C', Phaser.Input.Keyboard.Key>;

  /** stan przycisków dotykowych (ustawiany przez TouchControls) */
  touchLeft = false;
  touchRight = false;
  touchJump = false;

  /** callbacki akcji jednorazowych (strzał / dynamit) */
  onShoot?: () => void;
  onDynamite?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = {
      A: kb.addKey('A'),
      D: kb.addKey('D'),
      W: kb.addKey('W'),
      X: kb.addKey('X'),
      F: kb.addKey('F'),
      C: kb.addKey('C'),
    };

    // strzał myszą (dotyk ma własny przycisk)
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!p.wasTouch) this.onShoot?.();
    });
  }

  get left(): boolean {
    return this.cursors.left.isDown || this.keys.A.isDown || this.touchLeft;
  }

  get right(): boolean {
    return this.cursors.right.isDown || this.keys.D.isDown || this.touchRight;
  }

  get up(): boolean {
    return this.cursors.up.isDown || this.keys.W.isDown || this.touchJump;
  }

  get down(): boolean {
    return this.cursors.down.isDown;
  }

  get jumpHeld(): boolean {
    return this.up || this.cursors.space.isDown || this.touchJump;
  }

  /** true dokładnie w klatce wciśnięcia któregoś z klawiszy skoku */
  jumpJustPressed(): boolean {
    return (
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.W) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space)
    );
  }

  spaceJustPressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.cursors.space);
  }

  /** akcje jednorazowe sprawdzane raz na klatkę w update() sceny */
  pollActions(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.X) || Phaser.Input.Keyboard.JustDown(this.keys.F)) {
      this.onShoot?.();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
      this.onDynamite?.();
    }
  }

  /** rejestruje skróty pauzy (ESC / P) */
  bindPause(cb: () => void): void {
    this.scene.input.keyboard!.on('keydown-ESC', cb);
    this.scene.input.keyboard!.on('keydown-P', cb);
  }
}
