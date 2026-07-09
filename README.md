# Linknome

Mały, zawsze-na-wierzchu pilot do sterowania **tempem** i **metrum** sesji
[Ableton Link](https://www.ableton.com/en/link/) przez WiFi. Zaprojektowany tak,
by wygodnie zmieniać tempo zarówno **palcem** (duże szybkie zmiany i drobne
precyzyjne), jak i **myszką**.

- **Tempo (BPM)** — synchronizowane globalnie przez Link; zmiana tutaj zmienia
  tempo u wszystkich uczestników sesji w sieci lokalnej.
- **Metrum** — liczba uderzeń na takt mapowana na Link **quantum**. Uwaga: Link
  **nie przesyła** metrum między aplikacjami — quantum tylko wyrównuje lokalnie
  „1"/fazę, nie zmienia długości taktu u innych.

Stack: **Tauri v2** (Rust) + [`rusty_link`](https://crates.io/crates/rusty_link)
+ vanilla JS.

Tempo jest liczbą **całkowitą** (20–300 BPM).

## Sterowanie tempem (shuttle / jog)

- **Przeciąganie** po dużym polu BPM: **poziome wychylenie** od punktu dotknięcia
  ustawia *prędkość* zmiany — przy środku wolno i precyzyjnie, im dalej tym
  szybciej (w prawo = szybciej, w lewo = wolniej). Mała strefa martwa przy
  środku pozwala trzymać stałe tempo. Pasek na dole pokazuje kierunek i tempo
  zmiany.
- **Przyciski `−`/`+`**: tap = ±1, przytrzymanie = auto-powtarzanie z
  przyspieszeniem do ±5.
- **Kółko myszy**: ±1 (Shift = ±5).
- **Klawiatura**: ↑/↓ = ±1, Shift+↑/↓ = ±5, PageUp/Down = ±10.
- **TAP** — tap-tempo (uśrednienie kilku ostatnich uderzeń).
- **Dwuklik/dwutap** na liczbie — wpis wartości z klawiatury.

Górny pasek: **PL/EN** (język), 📌 zawsze-na-wierzchu, ◐ przezroczystość,
⤢ tryb kompaktowy, ✕ zamknij.

## Język

Interfejs jest w pełni polski i angielski. Język jest **wykrywany z systemu**
przy pierwszym uruchomieniu i można go zmienić przyciskiem **PL/EN** na górnym
pasku (wybór jest zapamiętywany).

## Wymagania (build)

- **Rust** (rustup) + **CMake ≥ 3.14** + kompilator C++ (rusty_link kompiluje
  oficjalną bibliotekę `abl_link`).
  - macOS: Xcode Command Line Tools.
  - Windows: MSVC Build Tools (VS 2022, „Desktop development with C++").
- **Node** + **pnpm**.

## Uruchomienie

```bash
pnpm install
pnpm tauri dev      # tryb deweloperski
pnpm tauri build    # paczki: .dmg/.app (macOS), .msi/.exe (Windows)
```

## Licencja

**GPL-2.0-or-later** — patrz `LICENSE` i `NOTICE`. Wynika to z licencji Ableton
Link (darmowa opcja to GPLv2+). Zamknięta dystrybucja wymaga komercyjnej licencji
Link od Ableton AG.
