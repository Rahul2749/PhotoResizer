"use client";

import { useEffect, useState } from "react";

const themes = [
  { id: "blue", name: "Blue", hi: "नीला", description: "Clear & confident", descriptionHi: "साफ़ और भरोसेमंद" },
  { id: "violet", name: "Violet", hi: "बैंगनी", description: "Creative & modern", descriptionHi: "रचनात्मक और आधुनिक" },
  { id: "coral", name: "Coral", hi: "कोरल", description: "Warm & approachable", descriptionHi: "गर्मजोशी और अपनापन" },
  { id: "charcoal", name: "Charcoal", hi: "चारकोल", description: "Simple & understated", descriptionHi: "सादा और शांत" },
] as const;

export default function ThemePicker({ lang }: { lang: "en" | "hi" }) {
  const [theme, setTheme] = useState<(typeof themes)[number]["id"]>("blue");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <section className="theme-picker" aria-labelledby="theme-label">
    <div className="theme-intro"><span id="theme-label">{lang === "en" ? "Choose your color" : "अपना रंग चुनें"}</span><p>{lang === "en" ? "Same tool. A look you like." : "वही टूल। आपकी पसंद का रंग।"}</p></div>
    <div className="theme-options" role="group" aria-label={lang === "en" ? "Color options" : "रंग के विकल्प"}>
      {themes.map((option) => <button key={option.id} type="button" className="theme-option" data-palette={option.id} aria-pressed={theme === option.id} onClick={() => setTheme(option.id)}>
        <span className="theme-swatch" aria-hidden="true">{theme === option.id ? "✓" : ""}</span>
        <span><strong>{lang === "en" ? option.name : option.hi}</strong><small>{lang === "en" ? option.description : option.descriptionHi}</small></span>
      </button>)}
    </div>
  </section>;
}
