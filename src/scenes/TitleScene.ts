import Phaser from 'phaser';
import { sfx } from '../audio';
import { Storage } from '../systems/Storage';
import { SKINS, SkinId } from '../config';
import { music } from '../systems/Music';

const FONT = '"Rye", "Baloo 2", serif';
const FONT_UI = '"Baloo 2", sans-serif';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'bg_canyon').setDisplaySize(width, height);

    // podłoga dekoracyjna
    for (let x = 0; x < width + 64; x += 64) {
      this.add.image(x + 32, height - 32, 'kenney', 'sandMid.png').setScale(0.5);
    }
    this.add.image(width / 2 - 460, height - 64, 'kenney', 'cactus.png').setScale(0.6).setOrigin(0.5, 1);
    this.add.image(width / 2 + 470, height - 64, 'kenney', 'cactus.png').setScale(0.5).setOrigin(0.5, 1);

    // wybrana postać podskakuje (aktualizuje się po zmianie wyboru)
    const hero = this.add.image(width / 2 - 300, height - 64, SKINS[Storage.getSkin()].stand).setScale(0.55).setOrigin(0.5, 1);
    this.tweens.add({
      targets: hero,
      y: height - 130,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.easeOut',
      onYoyo: () => hero.setTexture(SKINS[Storage.getSkin()].jump),
      onRepeat: () => hero.setTexture(SKINS[Storage.getSkin()].stand),
    });

    // ---- WYBÓR POSTACI (A = Kowboj, B = Kowbojka) ----
    const selY = height * 0.585;
    const frames: Record<SkinId, Phaser.GameObjects.Rectangle> = {} as never;
    const mkChoice = (skin: SkinId, x: number) => {
      const frame = this.add.rectangle(x, selY, 96, 116, 0x3d2817, 0.85).setStrokeStyle(4, 0x8a6a3b);
      const icon = this.add.image(x, selY + 40, SKINS[skin].stand).setScale(0.32).setOrigin(0.5, 1);
      this.add
        .text(x, selY + 52, SKINS[skin].name, { fontFamily: FONT_UI, fontSize: '17px', color: '#ffe6b3' })
        .setOrigin(0.5, 0);
      frame.setInteractive({ useHandCursor: true });
      frame.on('pointerover', () => frame.setScale(1.06));
      frame.on('pointerout', () => frame.setScale(1));
      frame.on('pointerdown', () => {
        sfx.click.play();
        Storage.setSkin(skin);
        refreshSelection();
        hero.setTexture(SKINS[skin].stand);
        this.tweens.add({ targets: icon, scale: 0.38, duration: 120, yoyo: true, ease: 'Back.easeOut' });
      });
      frames[skin] = frame;
    };
    const refreshSelection = () => {
      const sel = Storage.getSkin();
      (Object.keys(frames) as SkinId[]).forEach((k) => {
        frames[k].setStrokeStyle(4, k === sel ? 0xffd700 : 0x8a6a3b);
        frames[k].setFillStyle(0x3d2817, k === sel ? 0.95 : 0.6);
      });
    };
    // ramki po bokach przycisku GRAJ
    mkChoice('A', width / 2 - 250);
    mkChoice('B', width / 2 + 250);
    refreshSelection();
    this.add
      .text(width / 2, selY - 78, 'Wybierz postać:', { fontFamily: FONT_UI, fontSize: '18px', color: '#ffffff', stroke: '#00000055', strokeThickness: 3 })
      .setOrigin(0.5)
      .setAlpha(0.9);

    // czarny zamaskowany bandyta
    const bandit = this.add.image(width / 2 + 300, height - 64, 'bandit').setScale(0.5).setOrigin(0.5, 1);
    this.tweens.add({ targets: bandit, angle: 5, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // sęp krąży nad tytułem
    const vulture = this.add.image(width / 2 + 380, height * 0.16, 'vulture').setScale(0.4);
    this.tweens.add({ targets: vulture, x: width / 2 - 380, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onYoyo: () => vulture.setFlipX(true), onRepeat: () => vulture.setFlipX(false) });

    const title = this.add
      .text(width / 2, height * 0.26, 'DZIKI\nZACHÓD', {
        fontFamily: FONT,
        fontSize: '92px',
        color: '#ffe6b3',
        stroke: '#5c2e0d',
        strokeThickness: 14,
        align: 'center',
        lineSpacing: -14,
      })
      .setOrigin(0.5)
      .setShadow(0, 6, 'rgba(0,0,0,0.4)', 8);
    this.tweens.add({ targets: title, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const hi = Storage.getHighscore();
    if (hi > 0) {
      this.add
        .text(width / 2, height * 0.47, `🏆 Rekord: ${hi}`, {
          fontFamily: FONT,
          fontSize: '28px',
          color: '#fff3b0',
          stroke: '#7a5c00',
          strokeThickness: 6,
        })
        .setOrigin(0.5);
    }

    const btn = this.add.container(width / 2, height * 0.62);
    const btnBg = this.add.rectangle(0, 0, 300, 84, 0xb5651d).setStrokeStyle(6, 0x5c2e0d);
    btnBg.setInteractive({ useHandCursor: true });
    const btnTxt = this.add.text(0, 0, 'GRAJ!', { fontFamily: FONT, fontSize: '40px', color: '#ffe6b3', stroke: '#3d1f08', strokeThickness: 5 }).setOrigin(0.5);
    btn.add([btnBg, btnTxt]);
    this.tweens.add({ targets: btn, y: height * 0.62 + 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    btnBg.on('pointerover', () => btnBg.setFillStyle(0xd47a2c));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0xb5651d));

    const start = () => {
      sfx.click.play();
      music.startSelected(); // gest użytkownika — można uruchomić audio
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Name');
      });
    };
    btnBg.once('pointerdown', start);
    this.input.keyboard!.once('keydown-SPACE', start);
    this.input.keyboard!.once('keydown-ENTER', start);

    this.buildOptionsButton();

    // opis sterowania — zawijany i ograniczony do szerokości ekranu,
    // żeby nie wyjeżdżał poza krawędzie na żadnej rozdzielczości
    this.add
      .text(
        width / 2,
        height * 0.775,
        '← → / A D — ruch  •  ↑ / W / SPACJA — skok  •  ↑↓ — drabiny  •  X / F / klik — strzał  •  C — dynamit 🧨  •  ESC — pauza\n10 poziomów! Na końcu BOSS — grizzly 🐻 (pokonasz go tylko pociskami DUM-DUM ze sklepu). Diament 💎 = 2× zebrane monety!',
        {
          fontFamily: FONT_UI,
          fontSize: '17px',
          color: '#ffffff',
          stroke: '#00000055',
          strokeThickness: 4,
          align: 'center',
          wordWrap: { width: width - 120, useAdvancedWrap: true },
        }
      )
      .setOrigin(0.5)
      .setAlpha(0.95);

    // przycisk pobierania kodu źródłowego (prawy dolny róg)
    const dlBtn = this.add.container(width - 130, height - 40);
    const dlBg = this.add.rectangle(0, 0, 220, 52, 0x3d2817, 0.9).setStrokeStyle(3, 0xffb347);
    const dlTxt = this.add.text(0, 0, '📦 Kod (GitHub)', { fontFamily: FONT_UI, fontSize: '22px', color: '#ffe6b3' }).setOrigin(0.5);
    dlBtn.add([dlBg, dlTxt]);
    dlBg.setInteractive({ useHandCursor: true });
    dlBg.on('pointerover', () => {
      dlBg.setFillStyle(0x5c3a1e, 0.95);
      dlBtn.setScale(1.05);
    });
    dlBg.on('pointerout', () => {
      dlBg.setFillStyle(0x3d2817, 0.9);
      dlBtn.setScale(1);
    });
    dlBg.on('pointerdown', () => {
      sfx.click.play();
      // kod zrodlowy gry na GitHubie
      window.open('https://github.com/Rubikrubi/dziki-zachod', '_blank', 'noopener');
    });

    const rankBtn = this.add.container(this.scale.width / 2, this.scale.height - 40);
    const rankBg = this.add.rectangle(0, 0, 220, 52, 0x3d2817, 0.9).setStrokeStyle(3, 0xffb347);
    const rankTxt = this.add.text(0, 0, '🏆 Ranking', { fontFamily: FONT_UI, fontSize: '22px', color: '#ffe6b3' }).setOrigin(0.5);
    rankBtn.add([rankBg, rankTxt]);
    rankBg.setInteractive({ useHandCursor: true });
    rankBg.on('pointerover', () => {
      rankBg.setFillStyle(0x5c3a1e, 0.95);
      rankBtn.setScale(1.05);
    });
    rankBg.on('pointerout', () => {
      rankBg.setFillStyle(0x3d2817, 0.9);
      rankBtn.setScale(1);
    });
    rankBg.on('pointerdown', () => {
      sfx.click.play();
      this.scene.start('Leaderboard', {});
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  /**
   * Przycisk "⚙ OPCJE" (lewy dolny róg). Panel opcji to osobna modalna
   * scena (OptionsScene) uruchamiana NAD tytułem — płaskie obiekty bez
   * kontenerów dają niezawodny hit-testing przycisków.
   */
  private buildOptionsButton(): void {
    const { height } = this.scale;
    const optBtn = this.add.container(130, height - 40).setDepth(300);
    const optBg = this.add.rectangle(0, 0, 220, 52, 0x3d2817, 0.9).setStrokeStyle(3, 0xffb347);
    const optTxt = this.add.text(0, 0, '⚙️ Opcje', { fontFamily: FONT_UI, fontSize: '22px', color: '#ffe6b3' }).setOrigin(0.5);
    optBtn.add([optBg, optTxt]);
    optBg.setInteractive({ useHandCursor: true });
    optBg.on('pointerover', () => {
      optBg.setFillStyle(0x5c3a1e, 0.95);
      optBtn.setScale(1.05);
    });
    optBg.on('pointerout', () => {
      optBg.setFillStyle(0x3d2817, 0.9);
      optBtn.setScale(1);
    });
    optBg.on('pointerdown', () => {
      sfx.click.play();
      this.scene.launch('Options');
      this.scene.pause();
    });
  }
}
