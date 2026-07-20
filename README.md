# 🤠 Dziki Zachód — platformówka 2D

Westernowa platformówka 2D w przeglądarce. Wciel się w kowboja (lub kowgirl), przebijaj się przez **10 poziomów** Dzikiego Zachodu, strzelaj do bandytów, zbieraj monety i naboje, wspinaj się po drabinach — a na końcu pokonaj **bossa grizzly 🐻**.

## ▶️ Zagraj teraz (bez instalacji)

**👉 [rubikrubi.github.io/dziki-zachod](https://rubikrubi.github.io/dziki-zachod/)**

Wystarczy kliknąć w link i grać w przeglądarce (komputer lub telefon — jest sterowanie dotykowe).

## 🎮 Sterowanie (klawiatura)

| Klawisz | Akcja |
|---|---|
| `←` `→` / `A` `D` | ruch w lewo / prawo |
| `↑` / `W` / `SPACJA` | skok |
| `↑` `↓` | wchodzenie / schodzenie po drabinach |
| `X` / `F` / klik myszą | strzał |
| `C` | dynamit 🧨 |
| `ESC` / `P` | pauza |
| `SPACJA` / `ENTER` | start gry na ekranie tytułowym |

Na telefonie: przyciski dotykowe na ekranie (ruch, skok, strzał).

## 🎯 Cel gry

- Dotrzyj do flagi na końcu każdego z **10 poziomów**.
- Strzelaj do bandytów, sępów, skorpionów i innych wrogów.
- Zbieraj **monety 💰** i **naboje**, otwieraj skrzynie.
- W sklepie kup pociski **DUM-DUM** — tylko nimi pokonasz finałowego bossa **grizzly 🐻**.
- **Diament 💎** = 2× zebrane monety. Rywalizuj o miejsce w rankingu!

## 💻 Jak pobrać i uruchomić na swoim PC

### Sposób 1 — najprościej (gotowa wersja)

Gra działa też online pod linkiem powyżej — nic nie musisz instalować. Jeśli mimo to chcesz mieć ją lokalnie:

1. Pobierz repozytorium: zielony przycisk **Code → Download ZIP** na GitHubie i rozpakuj.
2. Zainstaluj [Node.js](https://nodejs.org/) (wersja 18 lub nowsza).
3. W folderze gry otwórz terminal i uruchom:

```bash
npm install
npm run dev
```

4. Otwórz w przeglądarce adres, który wypisze terminal (zwykle `http://localhost:5173`).

### Sposób 2 — dla programistów (klon + build)

```bash
git clone https://github.com/Rubikrubi/dziki-zachod.git
cd dziki-zachod
npm install
npm run dev      # tryb deweloperski z podglądem na żywo
npm run build    # produkcyjny build do folderu dist/
npm run preview  # podgląd zbudowanej wersji
npm test         # testy (vitest)
```

> ℹ️ Gra to aplikacja przeglądarkowa (moduły ES + wczytywanie plików). **Nie da się jej uruchomić przez zwykłe dwukliknięcie `index.html`** — potrzebny jest lokalny serwer HTTP, który uruchamiają powyższe komendy (`npm run dev` / `npm run preview`).

## 🛠️ Technologie

- [Phaser 3](https://phaser.io/) — silnik gier 2D
- [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/) — build i dev server
- [Howler.js](https://howlerjs.com/) — dźwięk
- Hosting: **GitHub Pages** (gotowy build publikowany z gałęzi `gh-pages`)

## 🔄 Aktualizacja wersji online

Po zmianach w kodzie zbuduj grę i opublikuj build na gałąź `gh-pages`:

```bash
npm run build            # tworzy folder dist/
npx gh-pages -d dist     # publikuje dist/ na gałąź gh-pages
```

Po chwili nowa wersja pojawi się pod adresem gry. (Gałąź `main` = kod źródłowy, `gh-pages` = zbudowana gra publikowana przez GitHub Pages.)

## Część kodu, dokumentacja projektu były przygotowywane z pomocą modelu AI Claude Code
Ostateczne sprawdzenie, testy na urządzeniu oraz publikację wykonał autor repozytorium.

## 👤 Autor

**Rubikrubi** — [github.com/Rubikrubi](https://github.com/Rubikrubi)

## 📄 Licencja

Projekt do użytku osobistego i edukacyjnego. Grafiki części sprite'ów pochodzą z zestawu [Kenney](https://kenney.nl/) (domena publiczna, CC0).
