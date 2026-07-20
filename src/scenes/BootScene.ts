import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width / 2, height / 2, 420, 26, 0x3d2817).setStrokeStyle(3, 0xffb347);
    const bar = this.add.rectangle(width / 2 - 205, height / 2, 0, 16, 0xffb347).setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => {
      bar.width = 410 * p;
    });
    this.load.on('complete', () => {
      barBg.destroy();
      bar.destroy();
    });

    this.load.atlasXML('kenney', 'assets/platformer.png', 'assets/platformer.xml');
    // tła — każdy z 10 poziomów ma własne, niepowtarzalne
    this.load.image('bg_canyon', 'assets/bg_canyon.png');
    this.load.image('bg_town', 'assets/bg_town.png');
    this.load.image('bg_mine', 'assets/bg_mine.png');
    this.load.image('bg_night', 'assets/bg_night.png');
    this.load.image('bg_gorge', 'assets/bg_gorge.png');
    this.load.image('bg_bank', 'assets/bg_bank.png');
    this.load.image('bg_shaft', 'assets/bg_shaft.png');
    this.load.image('bg_prairie', 'assets/bg_prairie.png');
    this.load.image('bg_fortress', 'assets/bg_fortress.png');
    this.load.image('bg_duel', 'assets/bg_duel.png');
    // postacie
    // kowboj v5 — TA SAMA stylistyka twarzy co kowbojka: duże owalne oczy + uśmiech
    this.load.image('cowboy_stand', 'assets/cowboy_stand_v5.png');
    this.load.image('cowboy_jump', 'assets/cowboy_jump_v5.png');
    this.load.image('cowboy_shoot', 'assets/cowboy_shoot_v5.png');
    this.load.image('cowgirl_shoot', 'assets/cowgirl_shoot_v9.png');
    // wspinaczka — widok od tyłu, 2 klatki (naprzemienne ręce)
    this.load.image('cowboy_climb1', 'assets/cowboy_climb1_v2.png');
    this.load.image('cowboy_climb2', 'assets/cowboy_climb2_v2.png');
    // kowbojka v9 — każda klatka znormalizowana do IDENTYCZNEGO bboxa jak
    // odpowiadająca klatka kowboja: ta sama pozycja i rozmiar zawartości
    // w kanwie 256×256 ⇒ wspólny hitbox z configu pasuje 1:1, a sterowanie
    // obu postaci jest fizycznie nieodróżnialne
    // v10 = v9 odbite w poziomie: warkocz po lewej stronie (jak w jump/shoot),
    // dzięki czemu przy fladze flipX=false (patrzy w prawo) warkocz ciągnie się
    // ZA ruchem — spójnie we wszystkich klatkach. Fix „przeskakującego" warkocza.
    this.load.image('cowgirl_stand', 'assets/cowgirl_stand_v10.png');
    this.load.image('cowgirl_jump', 'assets/cowgirl_jump_v9.png');
    this.load.image('cowgirl_climb1', 'assets/cowgirl_climb1_v9.png');
    this.load.image('cowgirl_climb2', 'assets/cowgirl_climb2_v9.png');
    // bandyta — 2 klatki chodu (złowrogi uśmiech), animowane w AI
    this.load.image('bandit', 'assets/bandit_walk1_v1.png');
    this.load.image('bandit_walk1', 'assets/bandit_walk1_v1.png');
    this.load.image('bandit_walk2', 'assets/bandit_walk2_v1.png');
    // drabina: klasyczne kafelki Kenney (ladderTop/ladderMid) z atlasu 'kenney'
    this.load.image('vulture', 'assets/vulture.png');
    this.load.image('scorpion', 'assets/scorpion.png');
    this.load.image('indian', 'assets/indian.png');
    this.load.image('indian_run', 'assets/indian_run.png');
    this.load.image('bullet', 'assets/bullet.png');
    this.load.image('coin_dollar', 'assets/coin_dollar_v1.png');
    this.load.image('cartridge', 'assets/cartridge_v1.png');
    this.load.image('dynamite', 'assets/dynamite.png');
    this.load.image('artifact', 'assets/sheriff_star_v1.png'); // złota gwiazda szeryfa
    this.load.image('chest_closed', 'assets/chest_closed_v3.png');
    this.load.image('chest_open', 'assets/chest_open_v3.png');
    this.load.image('grizzly', 'assets/grizzly_v1.png');
    this.load.image('shop', 'assets/shop_v1.png');
    // muzyka ładowana przez Howlera (audio.ts) — nie przez Phaser loader
  }

  create() {
    // mała, okrągła cząsteczka do particle effects
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('spark', 16, 16);
    g.destroy();

    this.scene.start('Title');
  }
}
