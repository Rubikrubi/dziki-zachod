import Phaser from 'phaser';
import { sfx } from '../audio';
import { music, TRACKS } from '../systems/Music';

const FONT = '"Rye", "Baloo 2", serif';
const FONT_UI = '"Baloo 2", sans-serif';

/**
 * Modalna scena opcji (wybór muzyki). Uruchamiana NAD sceną tytułową
 * (scene.launch + pause) — ten sam wzorzec co PauseScene nad GameScene.
 * Płaska hierarchia obiektów (bez kontenerów) = niezawodny hit-testing.
 */
export class OptionsScene extends Phaser.Scene {
  constructor() {
    super('Options');
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // przyciemnienie — łyka kliknięcia poza panelem i zamyka opcje
    const dim = this.add.rectangle(cx, cy, width, height, 0x000000, 0.55).setInteractive();

    // panel (interaktywny, żeby kliknięcia w tło panelu nie zamykały okna)
    this.add.rectangle(cx, cy, 560, 430, 0x2a1a0e, 0.97).setStrokeStyle(5, 0xffb347).setInteractive();

    this.add
      .text(cx, cy - 170, 'OPCJE', { fontFamily: FONT, fontSize: '44px', color: '#ffe6b3', stroke: '#3d1f08', strokeThickness: 6 })
      .setOrigin(0.5);
    this.add.text(cx, cy - 118, '🎵 Muzyka w tle:', { fontFamily: FONT_UI, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

    // wiersze: 3 utwory + wyłączenie muzyki
    const rows: Array<{ id: number; label: string }> = [
      ...TRACKS.map((t, i) => ({ id: i, label: `${t.icon} ${t.name}` })),
      { id: -1, label: '🔇 Muzyka wyłączona' },
    ];
    const rowBgs = new Map<number, Phaser.GameObjects.Rectangle>();

    const refreshRows = () => {
      const sel = music.selection;
      rowBgs.forEach((bg, id) => {
        bg.setFillStyle(id === sel ? 0xb5651d : 0x3d2817, id === sel ? 0.95 : 0.8);
        bg.setStrokeStyle(3, id === sel ? 0xffd700 : 0x8a6a3b);
      });
    };

    rows.forEach((row, i) => {
      const y = cy - 62 + i * 62;
      const bg = this.add.rectangle(cx, y, 460, 52, 0x3d2817, 0.8).setStrokeStyle(3, 0x8a6a3b).setInteractive({ useHandCursor: true });
      this.add.text(cx, y, row.label, { fontFamily: FONT_UI, fontSize: '22px', color: '#ffe6b3' }).setOrigin(0.5);
      bg.on('pointerover', () => bg.setScale(1.03));
      bg.on('pointerout', () => bg.setScale(1));
      bg.on('pointerdown', () => {
        sfx.click.play();
        // klik = gest użytkownika, więc utwór może zagrać od razu;
        // id -1 natychmiast zatrzymuje bieżącą muzykę
        void music.setSelection(row.id);
        refreshRows();
      });
      rowBgs.set(row.id, bg);
    });
    refreshRows();

    // przycisk zamknięcia
    const closeBg = this.add.rectangle(cx, cy + 172, 220, 54, 0xb5651d).setStrokeStyle(4, 0x5c2e0d).setInteractive({ useHandCursor: true });
    this.add.text(cx, cy + 172, 'ZAMKNIJ', { fontFamily: FONT_UI, fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
    closeBg.on('pointerover', () => closeBg.setScale(1.05));
    closeBg.on('pointerout', () => closeBg.setScale(1));

    const close = () => {
      sfx.click.play();
      this.scene.stop();
      this.scene.resume('Title');
    };
    closeBg.on('pointerdown', close);
    dim.on('pointerdown', close);
    this.input.keyboard!.on('keydown-ESC', close);

    // wejście z animacją
    this.cameras.main.fadeIn(150, 0, 0, 0);
  }
}
