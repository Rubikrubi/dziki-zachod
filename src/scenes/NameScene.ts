import Phaser from 'phaser';
import { sfx } from '../audio';
import { music } from '../systems/Music';
import { Storage } from '../systems/Storage';
import { CONFIG } from '../config';

const FONT = '"Rye", "Baloo 2", serif';
const FONT_UI = '"Baloo 2", sans-serif';

/** Ekran wpisania nazwy gracza (pole tekstowe DOM) — między Title a Game. */
export class NameScene extends Phaser.Scene {
  constructor() {
    super('Name');
  }

  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'bg_canyon').setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);

    this.add
      .text(width / 2, height * 0.28, 'WPISZ SWOJĄ NAZWĘ', {
        fontFamily: FONT,
        fontSize: '52px',
        color: '#ffe6b3',
        stroke: '#5c2e0d',
        strokeThickness: 10,
      })
      .setOrigin(0.5);

    const initial = Storage.getPlayerName();
    const input = this.add
      .dom(width / 2, height * 0.46)
      .createFromHTML(
        `<input type="text" maxlength="${CONFIG.leaderboard.maxNameLen}" value="${initial.replace(/"/g, '&quot;')}"
          placeholder="Twój nick"
          style="width:360px;padding:14px 18px;font-size:26px;font-family:${FONT_UI};
          text-align:center;border:4px solid #8a6a3b;border-radius:12px;background:#fff8ec;color:#3d2817;outline:none;" />`
      );
    const el = input.node.firstElementChild as HTMLInputElement;
    // autofocus po dołączeniu do DOM
    this.time.delayedCall(50, () => el.focus());

    let started = false;
    const proceed = () => {
      if (started) return;
      started = true;
      const name = (el.value || '').trim() || 'Gracz';
      Storage.setPlayerName(name);
      sfx.click.play();
      music.startSelected();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', { level: 0, score: 0, hearts: 3, playerName: name });
      });
    };

    // Enter w polu tekstowym
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') proceed();
    });

    // Przycisk DALEJ
    const btn = this.add.container(width / 2, height * 0.62);
    const btnBg = this.add.rectangle(0, 0, 260, 76, 0xb5651d).setStrokeStyle(6, 0x5c2e0d);
    btnBg.setInteractive({ useHandCursor: true });
    const btnTxt = this.add
      .text(0, 0, 'DALEJ', { fontFamily: FONT, fontSize: '36px', color: '#ffe6b3', stroke: '#3d1f08', strokeThickness: 5 })
      .setOrigin(0.5);
    btn.add([btnBg, btnTxt]);
    btnBg.on('pointerover', () => btnBg.setFillStyle(0xd47a2c));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0xb5651d));
    btnBg.on('pointerdown', proceed);

    // ESC → powrót do menu
    this.add
      .text(width / 2, height * 0.74, '(ESC — powrót do menu)', { fontFamily: FONT_UI, fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5)
      .setAlpha(0.8);
    this.input.keyboard!.once('keydown-ESC', () => {
      sfx.click.play();
      this.scene.start('Title');
    });

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }
}
