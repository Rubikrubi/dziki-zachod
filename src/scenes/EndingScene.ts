import Phaser from 'phaser';
import { sfx } from '../audio';
import { Storage } from '../systems/Storage';
import { CONFIG } from '../config';

const FONT = '"Rye", "Baloo 2", serif';
const FONT_UI = '"Baloo 2", sans-serif';

interface EndingData {
  score: number;
  playerName?: string;
}

/**
 * Scena finałowa po pokonaniu Super Bossa i ukończeniu gry.
 * Plansza 1: wielka złota gwiazda szeryfa + nominacja (tekst dopasowany
 *            do płci wybranej postaci: zostałeś/zostałaś).
 * Plansza 2: napisy końcowe — autor gry + model AI + wielkie THE END.
 */
export class EndingScene extends Phaser.Scene {
  private score = 0;
  private phase = 0; // 0 = gwiazda szeryfa, 1 = THE END
  private canAdvance = false;
  private playerName = 'Gracz';

  constructor() {
    super('Ending');
  }

  init(data: EndingData) {
    this.score = data.score ?? 0;
    this.playerName = data.playerName ?? (Storage.getPlayerName() || 'Gracz');
    this.phase = 0;
    this.canAdvance = false;
  }

  create() {
    const { width, height } = this.scale;

    // tło: nocny pojedynek przyciemniony na uroczystą ceremonię
    this.add.image(width / 2, height / 2, 'bg_duel').setDisplaySize(width, height).setTint(0x8877aa);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);

    Storage.submitScore(this.score);
    Storage.submitToLeaderboard(this.playerName, this.score);
    this.showSheriffScreen();

    // przejście do kolejnej planszy: klik / SPACJA / ENTER
    const advance = () => {
      if (!this.canAdvance) return;
      this.canAdvance = false;
      sfx.click.play();
      if (this.phase === 0) {
        this.phase = 1;
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.children.removeAll();
          this.showCreditsScreen();
          this.cameras.main.fadeIn(500, 0, 0, 0);
        });
      } else {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Leaderboard', { highlightName: this.playerName }));
      }
    };
    this.input.on('pointerdown', advance);
    this.input.keyboard!.on('keydown-SPACE', advance);
    this.input.keyboard!.on('keydown-ENTER', advance);

    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  /** Plansza 1 — nominacja na szeryfa */
  private showSheriffScreen(): void {
    const { width, height } = this.scale;
    sfx.win.play();

    // złote konfetti przez całą ceremonię
    this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: width },
      y: -10,
      lifespan: 3500,
      speedY: { min: 100, max: 250 },
      speedX: { min: -40, max: 40 },
      scale: { start: 0.7, end: 0 },
      quantity: 2,
      tint: [0xffd700, 0xfff3b0, 0xb5651d, 0xffffff],
    });

    // WIELKA złota gwiazda szeryfa — wjazd z obrotem i "sprężynką"
    const star = this.add.image(width / 2, height * 0.34, 'artifact').setScale(0).setDepth(10);
    this.tweens.add({ targets: star, scale: 1.05, angle: 360, duration: 900, ease: 'Back.easeOut' });
    // delikatne pulsowanie po wjeździe
    this.tweens.add({ targets: star, scale: 1.12, duration: 900, yoyo: true, repeat: -1, delay: 1000, ease: 'Sine.easeInOut' });
    // promienista poświata
    const glow = this.add.circle(width / 2, height * 0.34, 170, 0xffd700, 0.18).setDepth(9);
    this.tweens.add({ targets: glow, scale: 1.35, alpha: 0.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // tekst dopasowany do postaci: Kowboj → zostałeś, Kowbojka → zostałaś
    const isCowgirl = Storage.getSkin() === 'B';
    const verb = isCowgirl ? 'ZOSTAŁAŚ' : 'ZOSTAŁEŚ';

    const title = this.add
      .text(width / 2, height * 0.62, `WŁAŚNIE ${verb}\nSZERYFEM NA DZIKIM ZACHODZIE!`, {
        fontFamily: FONT,
        fontSize: '46px',
        color: '#ffe15c',
        stroke: '#5c2e0d',
        strokeThickness: 10,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 500, delay: 700, ease: 'Back.easeOut' });

    const hi = Storage.getHighscore();
    this.add
      .text(width / 2, height * 0.78, `Wynik: ${this.score}   •   Rekord: ${Math.max(hi, this.score)}`, {
        fontFamily: FONT_UI,
        fontSize: '28px',
        color: '#ffffff',
        stroke: '#00000088',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(10);

    // podpowiedź przejścia dalej (pojawia się po chwili, mruga)
    this.time.delayedCall(1600, () => {
      this.canAdvance = true;
      const hint = this.add
        .text(width / 2, height * 0.9, 'Kliknij lub naciśnij SPACJĘ, aby kontynuować…', {
          fontFamily: FONT_UI,
          fontSize: '20px',
          color: '#ffe6b3',
        })
        .setOrigin(0.5)
        .setDepth(10);
      this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    });
  }

  /** Plansza 2 — napisy końcowe + THE END */
  private showCreditsScreen(): void {
    const { width, height } = this.scale;

    // czarne tło z lekkim gwiaździstym pyłem
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0605, 1);
    for (let i = 0; i < 40; i++) {
      const s = this.add.circle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), Phaser.Math.Between(1, 2), 0xfff3b0, 0.7);
      this.tweens.add({ targets: s, alpha: 0.15, duration: Phaser.Math.Between(600, 1600), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1000) });
    }

    // mała gwiazda szeryfa jako ozdobnik
    this.add.image(width / 2, height * 0.16, 'artifact').setScale(0.35);

    const credits = this.add
      .text(width / 2, height * 0.42, 'Autor gry: Rubikrubi\n\nWspółtwórca: model AI Claude (Anthropic)', {
        fontFamily: FONT_UI,
        fontSize: '30px',
        color: '#ffe6b3',
        stroke: '#3d1f08',
        strokeThickness: 5,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: credits, alpha: 1, duration: 900, delay: 300 });

    // wielki napis THE END
    const theEnd = this.add
      .text(width / 2, height * 0.68, 'THE END', {
        fontFamily: FONT,
        fontSize: '120px',
        color: '#ffd700',
        stroke: '#5c2e0d',
        strokeThickness: 16,
      })
      .setOrigin(0.5)
      .setShadow(0, 8, 'rgba(0,0,0,0.5)', 10)
      .setScale(0);
    this.tweens.add({ targets: theEnd, scale: 1, duration: 700, delay: 1100, ease: 'Back.easeOut' });
    this.tweens.add({ targets: theEnd, scale: 1.04, duration: 1100, yoyo: true, repeat: -1, delay: 1900, ease: 'Sine.easeInOut' });

    this.time.delayedCall(2200, () => {
      this.canAdvance = true;
      const hint = this.add
        .text(width / 2, height * 0.92, 'Kliknij, aby zobaczyć ranking', {
          fontFamily: FONT_UI,
          fontSize: '20px',
          color: '#ffe6b3',
        })
        .setOrigin(0.5);
      this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    });
  }
}
