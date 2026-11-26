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
      if (m.spiel.fragenProRunde !== undefined && !(n >= 1)) fehler.push("Lernspiele: «Richtige Antworten pro Spielrunde» muss mindestens 1 sein.");
      if (m.spiel.sekunden !== undefined && !(s >= 10 && s <= 120)) fehler.push("Lernspiele: Die Rundendauer muss zwischen 10 und 120 Sekunden liegen.");
      if (Array.isArray(m.spiel.spiele) && !m.spiel.spiele.length) fehler.push("Lernspiele: Wähle mindestens ein Spiel aus.");
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

  // ---------- Passwort für den Lehrerbereich ----------
  // Eigene SHA-256-Umsetzung: funktioniert auch, wenn die App als Datei geöffnet wird
  // (dort fehlt in manchen Browsern die eingebaute Krypto-Schnittstelle).
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  function sha256hex(text) {
    const daten = new TextEncoder().encode(text);
    const laenge = daten.length, bloecke = ((laenge + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(bloecke); buf.set(daten); buf[laenge] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(bloecke - 4, laenge * 8); dv.setUint32(bloecke - 8, Math.floor(laenge / 0x20000000));
    const Hh = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const W = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bloecke; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
        const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, hh] = Hh;
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      Hh[0] += a; Hh[1] += b; Hh[2] += c; Hh[3] += d; Hh[4] += e; Hh[5] += f; Hh[6] += g; Hh[7] += hh;
    }
    return Array.from(Hh, x => x.toString(16).padStart(8, "0")).join("");
  }
  // Prüfwert mit Salz, 20 000-mal gehasht (bremst Durchprobieren)
  function passwortPruefwert(passwort, salz) {
    let x = sha256hex(salz + ":" + passwort);
    for (let i = 1; i < 20000; i++) x = sha256hex(x);
    return x;
  }
  function neuesSalz() {
    const c = window.crypto || null;
    const bytes = c && c.getRandomValues ? c.getRandomValues(new Uint8Array(12)) : Uint8Array.from({ length: 12 }, () => Math.floor(Math.random() * 256));
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  }
  const passwort = {
    erstellen(pw) { const salz = neuesSalz(); return { salz, pruefwert: passwortPruefwert(pw, salz) }; },
    pruefen(pw, lp) { return !!(lp && lp.salz && lp.pruefwert) && passwortPruefwert(pw, lp.salz) === lp.pruefwert; }
  };

  window.Lernapp = { version: "9", sha256hex, passwort, speicher, h, mischen, TYPEN, pruefeMaterial, parseDatei, herunterladen, K_MATERIAL: "lernapp.material" };
})();
