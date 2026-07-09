// Minimal i18n: Polish + English. Language is detected from the system on
// first run and can be toggled; the choice is persisted by the caller.

export const LANGS = ["pl", "en"];

export const STRINGS = {
  pl: {
    ontop: "Zawsze na wierzchu",
    opacity: "Przezroczystość",
    compact: "Kompaktowo / pełny",
    close: "Zamknij",
    lang: "Język: polski — kliknij, aby zmienić",
    slower: "Wolniej",
    faster: "Szybciej",
    scrubHint: "przeciągnij ←→ · dalej = szybciej",
    enterTempo: "Wpisz tempo",
    meter: "METRUM",
    meterTip: "Uderzenia na takt (Link quantum) — lokalne wyrównanie fazy, nie zmienia metrum u innych",
    fewerBeats: "Mniej uderzeń",
    moreBeats: "Więcej uderzeń",
  },
  en: {
    ontop: "Always on top",
    opacity: "Transparency",
    compact: "Compact / full",
    close: "Close",
    lang: "Language: English — click to change",
    slower: "Slower",
    faster: "Faster",
    scrubHint: "drag ←→ · farther = faster",
    enterTempo: "Enter tempo",
    meter: "METER",
    meterTip: "Beats per bar (Link quantum) — local phase alignment only, doesn't change others' meter",
    fewerBeats: "Fewer beats",
    moreBeats: "More beats",
  },
};

export function detectLang() {
  const l = (navigator.language || (navigator.languages && navigator.languages[0]) || "en").toLowerCase();
  return l.startsWith("pl") ? "pl" : "en";
}

export function normalizeLang(l) {
  return LANGS.includes(l) ? l : "en";
}
