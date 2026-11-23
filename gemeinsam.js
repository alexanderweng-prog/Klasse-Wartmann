// Gemeinsame Hilfsfunktionen für App (app.js) und Editor (editor.js)
(() => {
  "use strict";

  // Speicher – robust, falls localStorage blockiert ist
  const speicher = {
    lesen(k, standard) {
      try { const v = localStorage.getItem(k); return v === null ? standard : JSON.parse(v); }
      catch { return standard; }
    },
    // gibt true zurück, wenn das Speichern geklappt hat
    schreiben(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    loeschen(k) { try { localStorage.removeItem(k); } catch { /* ignorieren */ } }
  };

  function h(tag, attrs = {}, ...kinder) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v; // nur für eigenes, statisches Markup
      else if (k === "value") el.value = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kind of kinder.flat()) {
      if (kind === null || kind === undefined || kind === false) continue;
      el.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
    }
    return el;
  }

  const mischen = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const TYPEN = { auswahl: "Eine richtige Antwort", mehrfach: "Mehrere richtige Antworten", zuordnen: "Zuordnen", offen: "Offene Frage (Selbstbewertung)" };

  function pruefeMaterial(m) {
    const fehler = [];
    if (!m || typeof m !== "object") return ["Die Datei enthält kein Objekt."];
    if (!m.titel) fehler.push("Der Titel des Themas fehlt.");
    if (!Array.isArray(m.kapitel) || !m.kapitel.length) fehler.push("Es braucht mindestens ein Kapitel.");
    const ids = new Set();
    (m.kapitel || []).forEach((k, i) => {
      const wo = `Kapitel ${i + 1}${k.titel ? ` «${k.titel}»` : ""}`;
      if (!k.id) fehler.push(`${wo}: «id» fehlt.`);
      if (!k.titel) fehler.push(`${wo}: Titel fehlt.`);
      ids.add(k.id);
      if (!Array.isArray(k.karten)) { fehler.push(`${wo}: «karten» fehlt.`); return; }
      k.karten.forEach((c, j) => {
        if (!c.titel || !c.text) fehler.push(`${wo}, Karte ${j + 1}: Titel oder Text fehlt.`);
      });
    });
    const pruefeFrage = (f, wo) => {
      if (!TYPEN[f.typ]) { fehler.push(`${wo}: unbekannter Typ «${f.typ}».`); return; }
      if (!f.frage) fehler.push(`${wo}: Fragetext fehlt.`);
      if (f.typ === "auswahl" || f.typ === "mehrfach") {
        if (!Array.isArray(f.optionen) || f.optionen.length < 2) fehler.push(`${wo}: Es braucht mindestens 2 Antworten.`);
        else if (f.optionen.some(o => !String(o).trim())) fehler.push(`${wo}: Eine Antwort ist leer.`);
      }
      if (f.typ === "auswahl" && !(Number.isInteger(f.richtig) && f.richtig >= 0 && f.richtig < (f.optionen || []).length))
        fehler.push(`${wo}: Markiere die richtige Antwort.`);
      if (f.typ === "mehrfach" && !(Array.isArray(f.richtig) && f.richtig.length && f.richtig.every(r => r >= 0 && r < (f.optionen || []).length)))
        fehler.push(`${wo}: Markiere mindestens eine richtige Antwort.`);
      if (f.typ === "zuordnen") {
        if (!Array.isArray(f.paare) || f.paare.length < 2) fehler.push(`${wo}: Es braucht mindestens 2 Paare.`);
        else {
          if (f.paare.some(p => !p.links || !p.rechts)) fehler.push(`${wo}: Ein Paar ist unvollständig.`);
          if (new Set(f.paare.map(p => p.rechts)).size !== f.paare.length) fehler.push(`${wo}: Rechte Seiten müssen verschieden sein.`);
        }
      }
      if (f.typ === "offen" && !f.musterloesung) fehler.push(`${wo}: Musterlösung fehlt.`);
    };
    (m.uebungen || []).forEach((f, i) => {
      if (!ids.has(f.kapitel)) fehler.push(`Übung ${i + 1}: Kapitel fehlt oder existiert nicht.`);
      pruefeFrage(f, `Übung ${i + 1}`);
    });
    if (m.spiel) {
      const n = Number(m.spiel.fragenProRunde), s = Number(m.spiel.sekunden);
      if (m.spiel.fragenProRunde !== undefined && !(n >= 1)) fehler.push("Lernspiel: «Richtige Antworten pro Flug» muss mindestens 1 sein.");
      if (m.spiel.sekunden !== undefined && !(s >= 10 && s <= 120)) fehler.push("Lernspiel: Flugdauer muss zwischen 10 und 120 Sekunden liegen.");
    }
    if (m.probetest) (m.probetest.fragen || []).forEach((f, i) => pruefeFrage(f, `Probetest, Frage ${i + 1}`));
    return fehler;
  }

  function parseDatei(text) {
    let t = text.trim();
    // .js-Datei: alles vor dem ersten "{" und nach der letzten "}" entfernen
    const start = t.indexOf("{"), ende = t.lastIndexOf("}");
    if (start === -1 || ende === -1) throw new Error("Keine geschweiften Klammern gefunden.");
    t = t.slice(start, ende + 1);
    return JSON.parse(t);
  }

  function herunterladen(inhalt, name, typ) {
    const blob = new Blob([inhalt], { type: typ });
    const a = h("a", { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  window.Lernapp = { version: "5", speicher, h, mischen, TYPEN, pruefeMaterial, parseDatei, herunterladen, K_MATERIAL: "lernapp.material" };
})();
