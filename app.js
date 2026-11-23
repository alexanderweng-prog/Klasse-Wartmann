(() => {
  "use strict";
  window.LernappVersion = "6";

  const { speicher, h, mischen, pruefeMaterial, parseDatei, herunterladen, K_MATERIAL } = window.Lernapp;

  const eigenesMaterial = speicher.lesen(K_MATERIAL, null);
  const M = (eigenesMaterial && !pruefeMaterial(eigenesMaterial).length) ? eigenesMaterial : window.LERNINHALT;
  const materialQuelle = M === eigenesMaterial ? "eigenes" : "standard";

  // Fortschritt pro Material getrennt speichern
  const K_FORTSCHRITT = "lernapp.fortschritt." + hash(JSON.stringify(M ? M.titel + (M.kapitel || []).map(k => k.id).join() : ""));
  function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); }
  let fortschritt = speicher.lesen(K_FORTSCHRITT, { gelernt: {}, uebung: {}, tests: [] });
  const sichern = () => speicher.schreiben(K_FORTSCHRITT, fortschritt);

  // ---------- Hilfen ----------
  const app = document.getElementById("app");
  const zufall = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const masko = (M && M.maskottchen) || {};
  const lob = () => zufall(masko.lob && masko.lob.length ? masko.lob : ["Richtig!"]);
  const trost = () => zufall(masko.trost && masko.trost.length ? masko.trost : ["Leider falsch."]);
  function zeige(...knoten) { app.replaceChildren(...knoten); window.scrollTo(0, 0); app.focus({ preventScroll: true }); }

  // ---------- Maskottchen ----------
  // Platzhalter-Figur (neutral). Eigenes Bild: Pfad unter maskottchen.bild in thema.js
  const PLATZHALTER_SVG = `
    <svg viewBox="0 0 120 120" role="img" aria-label="Maskottchen (Platzhalter)">
      <ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".12"/>
      <circle cx="60" cy="64" r="42" fill="#f5b83d"/>
      <circle cx="60" cy="64" r="42" fill="none" stroke="#c98a17" stroke-width="3"/>
      <circle cx="45" cy="58" r="10" fill="#fff"/><circle cx="75" cy="58" r="10" fill="#fff"/>
      <circle cx="47" cy="60" r="5" fill="#1c2233"/><circle cx="77" cy="60" r="5" fill="#1c2233"/>
      <path d="M44 80 Q60 94 76 80" fill="none" stroke="#1c2233" stroke-width="4" stroke-linecap="round"/>
      <circle cx="34" cy="76" r="5" fill="#ef7d57" opacity=".6"/><circle cx="86" cy="76" r="5" fill="#ef7d57" opacity=".6"/>
      <path d="M30 30 L60 16 L90 30 L60 44 Z" fill="#1f5fd1"/>
      <path d="M86 32 L86 46" stroke="#1f5fd1" stroke-width="3"/><circle cx="86" cy="48" r="3" fill="#1f5fd1"/>
    </svg>`;
  function figur() {
    const box = h("div", { class: "maskottchen-figur" });
    if (masko.bild) {
      const img = h("img", { src: masko.bild, alt: masko.name || "Maskottchen" });
      img.addEventListener("error", () => { box.innerHTML = PLATZHALTER_SVG; }, { once: true });
      box.append(img);
    } else box.innerHTML = PLATZHALTER_SVG;
    return box;
  }
  function sprechblase(text, { klein = false, hopp = false } = {}) {
    const f = figur();
    if (hopp) f.classList.add("hopp");
    return h("div", { class: "maskottchen" + (klein ? " klein" : ""), "aria-live": "polite" },
      f, h("div", { class: "blase" }, h("strong", {}, masko.name || "Tipp"), text));
  }

  // ---------- Startseite ----------
  function kapitelStand(k) {
    const gelernt = (fortschritt.gelernt[k.id] || []).length;
    const u = fortschritt.uebung[k.id];
    return { gelernt, total: k.karten.length, uebung: u };
  }
  function startseite() {
    const karten = M.kapitel.map(k => {
      const s = kapitelStand(k);
      const anzahlUebungen = (M.uebungen || []).filter(f => f.kapitel === k.id).length;
      return h("article", { class: "card kapitel-karte" },
        h("h3", {}, h("span", { "aria-hidden": "true" }, k.icon || "📘"), k.titel),
        h("div", { class: "muted" }, `Theorie: ${s.gelernt} von ${s.total} Karten gelernt`),
        h("div", { class: "balken", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": s.total, "aria-valuenow": s.gelernt },
          h("span", { style: `width:${s.total ? (100 * s.gelernt / s.total) : 0}%` })),
        s.uebung ? h("p", { class: "muted" }, `Beste Übung: ${s.uebung.best} von ${s.uebung.von} richtig`) : null,
        h("div", { class: "row" },
          h("button", { class: "btn btn-primary", type: "button", onclick: () => lernen(k, 0) }, "Theorie lernen"),
          anzahlUebungen ? h("button", { class: "btn", type: "button", onclick: () => ueben(k) }, `Üben (${anzahlUebungen})`) : null));
    });

    const letzte = fortschritt.tests[fortschritt.tests.length - 1];
    const pt = M.probetest;
    const probe = pt && pt.fragen && pt.fragen.length ? h("article", { class: "card probetest-karte" },
      h("h3", {}, "📝 ", pt.titel || "Probetest"),
      h("p", {}, pt.hinweis || ""),
      letzte ? h("p", { class: "muted" }, `Letzter Versuch: ${letzte.punkte} von ${letzte.max} Punkten · Note ${letzte.note.toFixed(2)}`) : null,
      h("button", { class: "btn btn-primary", type: "button", onclick: probetestStart }, "Probetest starten")) : null;

    const alleUebungen = (M.uebungen || []).length;
    const spielFragen = spielPool().length;
    const scfg = spielEinstellungen();
    const spielKarte = spielFragen ? h("article", { class: "card spiel-karte" },
      h("h3", {}, "🎮 Lernen & Spielen"),
      h("p", {}, `Beantworte Fragen richtig und verdiene dir eine Spielrunde: ${antworten(scfg.fragenProRunde)} = 1 Runde.`),
      h("p", { class: "spiel-icons", "aria-label": "Spiele: " + scfg.spiele.map(id => SPIELE[id].name).join(", ") },
        scfg.spiele.map(id => h("span", { title: SPIELE[id].name }, `${SPIELE[id].icon} ${SPIELE[id].name}`))),
      h("button", { class: "btn btn-primary", type: "button", onclick: spielStart }, scfg.spiele.length > 1 ? "Spiel auswählen" : "Spiel starten")) : null;
    zeige(h("div", { class: "stack" },
      sprechblase(masko.begruessung || `Willkommen! Heute lernst du: ${M.titel}.`, { hopp: true }),
      h("h1", {}, M.titel),
      h("div", { class: "grid" }, karten),
      alleUebungen ? h("div", { class: "row" },
        h("button", { class: "btn", type: "button", onclick: () => ueben(null) }, `🔀 Gemischt üben (alle ${alleUebungen} Fragen)`)) : null,
      spielKarte,
      probe));
  }

  // ---------- Theorie ----------
  function lernen(k, i) {
    const karte = k.karten[i];
    const gelernt = new Set(fortschritt.gelernt[k.id] || []);
    const markieren = () => { gelernt.add(i); fortschritt.gelernt[k.id] = [...gelernt]; sichern(); };

    const nav = h("div", { class: "punkte-nav", role: "tablist", "aria-label": "Karten" },
      k.karten.map((c, j) => h("button", {
        type: "button", class: (j === i ? "aktiv " : "") + (gelernt.has(j) ? "gelernt" : ""),
        "aria-label": `Karte ${j + 1}: ${c.titel}`, "aria-current": j === i ? "true" : null,
        onclick: () => lernen(k, j)
      })));

    const letzte = i === k.karten.length - 1;
    zeige(h("div", { class: "stack" },
      h("div", { class: "row between" },
        h("button", { class: "btn btn-ghost", type: "button", onclick: startseite }, "← Übersicht"),
        h("span", { class: "muted" }, `${k.icon || ""} ${k.titel} · Karte ${i + 1} von ${k.karten.length}`)),
      h("article", { class: "card lernkarte" },
        h("h2", {}, karte.titel),
        h("p", { class: "text" }, karte.text),
        karte.merksatz ? h("div", { class: "merksatz" }, "💡 ", karte.merksatz) : null),
      nav,
      h("div", { class: "row between" },
        h("button", { class: "btn", type: "button", disabled: i === 0, onclick: () => lernen(k, i - 1) }, "← Zurück"),
        letzte
          ? h("button", { class: "btn btn-primary", type: "button", onclick: () => { markieren(); kapitelFertig(k); } }, "Verstanden ✓ Fertig")
          : h("button", { class: "btn btn-primary", type: "button", onclick: () => { markieren(); lernen(k, i + 1); } }, "Verstanden ✓ Weiter →"))));
  }
  function kapitelFertig(k) {
    const anzahl = (M.uebungen || []).filter(f => f.kapitel === k.id).length;
    zeige(h("div", { class: "stack" },
      sprechblase(`Du hast alle Karten zu «${k.titel}» durch. ${anzahl ? "Jetzt testen wir, ob es sitzt!" : ""}`, { hopp: true }),
      h("div", { class: "row" },
        anzahl ? h("button", { class: "btn btn-primary", type: "button", onclick: () => ueben(k) }, "Jetzt üben") : null,
        h("button", { class: "btn", type: "button", onclick: () => lernen(k, 0) }, "Nochmals lesen"),
        h("button", { class: "btn", type: "button", onclick: startseite }, "Zur Übersicht"))));
  }

  // ---------- Fragen rendern (für Üben und Probetest) ----------
  // Gibt { knoten, auswerten() -> {punkte, max, richtig}, sperren() } zurück
  function frageWidget(f, { sofortFeedback, optionenMischen = false }) {
    const max = f.punkte || (f.typ === "zuordnen" ? f.paare.length : 1);
    const teile = [];
    if (f.abschnitt) teile.push(h("div", { class: "abschnitt" }, f.abschnitt));
    teile.push(h("p", { class: "frage-text" }, f.frage));
    if (f.kontext && f.kontext.kopf) {
      teile.push(h("div", { class: "tabelle-wrap" }, h("table", {},
        h("thead", {}, h("tr", {}, f.kontext.kopf.map(x => h("th", { scope: "col" }, x)))),
        h("tbody", {}, f.kontext.zeilen.map(z => h("tr", {}, z.map(x => h("td", {}, x))))))));
    } else if (typeof f.kontext === "string") teile.push(h("p", {}, f.kontext));

    const box = h("div", {});
    let auswerten, sperren;

    if (f.typ === "auswahl" || f.typ === "mehrfach") {
      const mehr = f.typ === "mehrfach";
      const reihenfolge = optionenMischen ? mischen(f.optionen.map((_, j) => j)) : f.optionen.map((_, j) => j);
      const gewaehlt = new Set();
      const buttons = reihenfolge.map(j => h("button", {
        class: "opt", type: "button", "aria-pressed": "false",
        onclick: () => {
          if (mehr) { gewaehlt.has(j) ? gewaehlt.delete(j) : gewaehlt.add(j); }
          else { gewaehlt.clear(); gewaehlt.add(j); }
          buttons.forEach((b, x) => { const an = gewaehlt.has(reihenfolge[x]); b.classList.toggle("gewaehlt", an); b.setAttribute("aria-pressed", String(an)); });
          if (!mehr && sofortFeedback && box.onAntwort) box.onAntwort();
        }
      }, f.optionen[j]));
      if (mehr) box.append(h("p", { class: "muted" }, "Mehrere Antworten möglich."));
      box.append(h("div", { class: "optionen" }, buttons));
      const richtigSet = new Set(mehr ? f.richtig : [f.richtig]);
      auswerten = () => {
        const ok = gewaehlt.size === richtigSet.size && [...gewaehlt].every(x => richtigSet.has(x));
        return { punkte: ok ? max : 0, max, richtig: ok, beantwortet: gewaehlt.size > 0 };
      };
      sperren = () => buttons.forEach((b, x) => {
        const j = reihenfolge[x]; b.disabled = true;
        if (richtigSet.has(j)) b.classList.add("richtig");
        else if (gewaehlt.has(j)) b.classList.add("falsch");
      });
    }

    if (f.typ === "zuordnen") {
      const ziele = mischen(f.paare.map(p => p.rechts));
      const zeilen = f.paare.map((p, j) => {
        const sel = h("select", { "aria-label": `Zuordnung für: ${p.links}`, id: `z-${Math.random().toString(36).slice(2)}` },
          h("option", { value: "" }, "– bitte wählen –"), ziele.map(z => h("option", { value: z }, z)));
        const zeile = h("div", { class: "zuordnung-zeile" }, h("div", { class: "links" }, p.links), sel);
        return { p, sel, zeile };
      });
      box.append(h("div", { class: "zuordnung" }, zeilen.map(z => z.zeile)));
      auswerten = () => {
        let pkt = 0, alle = true;
        zeilen.forEach(z => { if (z.sel.value === z.p.rechts) pkt++; if (!z.sel.value) alle = false; });
        const anteil = pkt / zeilen.length;
        return { punkte: Math.round(anteil * max * 4) / 4, max, richtig: pkt === zeilen.length, beantwortet: alle };
      };
      sperren = () => zeilen.forEach(z => {
        z.sel.disabled = true;
        const ok = z.sel.value === z.p.rechts;
        z.zeile.classList.add(ok ? "richtig" : "falsch");
        if (!ok) z.zeile.append(h("div", { class: "korrektur" }, "Richtig: ", z.p.rechts));
      });
    }

    if (f.typ === "offen") {
      const ta = h("textarea", { "aria-label": "Deine Antwort", placeholder: "Schreibe deine Antwort hier …" });
      box.append(ta);
      let selbst = null;
      const selbstBox = h("div", {});
      box.append(selbstBox);
      auswerten = () => ({ punkte: selbst ?? 0, max, richtig: selbst === max, beantwortet: ta.value.trim().length > 0, offen: true, bewertet: selbst !== null });
      sperren = (onBewertet) => {
        ta.readOnly = true;
        const knoepfe = [];
        for (let p = 0; p <= max; p++) {
          const b = h("button", { class: "btn", type: "button", onclick: () => {
            selbst = p; knoepfe.forEach(k => k.classList.toggle("aktiv", k === b)); onBewertet && onBewertet();
          } }, `${p} ${p === 1 ? "Punkt" : "Punkte"}`);
          knoepfe.push(b);
        }
        selbstBox.replaceChildren(
          h("div", { class: "loesung" }, h("strong", {}, "Lösung: "), f.musterloesung),
          h("p", { class: "muted", style: "margin-top:10px" }, "Vergleiche ehrlich: Wie viele Punkte gibst du dir?"),
          h("div", { class: "selbst", role: "group", "aria-label": "Selbstbewertung" }, knoepfe));
      };
    }

    teile.push(box);
    return { knoten: h("div", {}, teile), auswerten, sperren, box, max };
  }

  // ---------- Üben ----------
  function ueben(k) {
    const pool = (M.uebungen || []).filter(f => !k || f.kapitel === k.id);
    const fragen = mischen(pool);
    let i = 0, richtigeAnzahl = 0;
    const kapitelName = k ? k.titel : "Gemischt";

    function schritt() {
      const f = fragen[i];
      const w = frageWidget(f, { sofortFeedback: false, optionenMischen: true });
      const feedback = h("div", {});
      const weiter = h("button", { class: "btn btn-primary", type: "button", hidden: true, onclick: () => {
        if (f.typ === "offen" && w.auswerten().richtig) richtigeAnzahl++;
        i++; i < fragen.length ? schritt() : ende();
      } },
        i === fragen.length - 1 ? "Resultat ansehen" : "Nächste Frage →");
      const blaseBox = h("div", {});

      const pruefen = h("button", { class: "btn btn-primary", type: "button", onclick: () => {
        const r = w.auswerten();
        if (!r.beantwortet) { blaseBox.replaceChildren(sprechblase("Wähle oder schreibe zuerst eine Antwort.", { klein: true })); return; }
        pruefen.hidden = true;
        if (f.typ === "offen") {
          w.sperren(() => {
            const r2 = w.auswerten();
            weiter.hidden = false;
            blaseBox.replaceChildren(sprechblase(r2.richtig ? lob() : "Gut, dass du ehrlich bist. Lies die Lösung nochmals genau.", { klein: true, hopp: r2.richtig }));
          });
          return;
        }
        w.sperren();
        if (r.richtig) richtigeAnzahl++;
        feedback.replaceChildren(h("div", { class: "feedback " + (r.richtig ? "ok" : "nok") },
          h("strong", {}, r.richtig ? "Richtig! " : "Nicht ganz. "), f.erklaerung || ""));
        blaseBox.replaceChildren(sprechblase(r.richtig ? lob() : trost(), { klein: true, hopp: r.richtig }));
        weiter.hidden = false;
        weiter.focus();
      } }, "Prüfen");

      zeige(h("div", { class: "stack" },
        h("div", { class: "row between" },
          h("button", { class: "btn btn-ghost", type: "button", onclick: startseite }, "← Übersicht"),
          h("span", { class: "muted" }, `Üben · ${kapitelName} · Frage ${i + 1} von ${fragen.length}`)),
        h("article", { class: "card" }, w.knoten, feedback),
        blaseBox,
        h("div", { class: "row end" }, pruefen, weiter)));
    }

    function ende() {
      const id = k ? k.id : "_gemischt";
      const alt = fortschritt.uebung[id];
      fortschritt.uebung[id] = { best: Math.max(richtigeAnzahl, alt ? alt.best : 0), von: fragen.length };
      sichern();
      const quote = richtigeAnzahl / fragen.length;
      const text = quote === 1 ? "Alles richtig! Du bist bereit für den Test." :
        quote >= .7 ? "Sehr gut! Schau dir die Fehler nochmals an." :
        "Lies die Theorie-Karten nochmals durch und versuch es dann wieder.";
      zeige(h("div", { class: "stack" },
        sprechblase(text, { hopp: quote >= .7 }),
        h("article", { class: "card resultat" },
          h("p", { class: "muted" }, `Übung ${kapitelName}`),
          h("div", { class: "note-gross" }, `${richtigeAnzahl} / ${fragen.length}`),
          h("p", {}, "Fragen richtig")),
        h("div", { class: "row" },
          h("button", { class: "btn btn-primary", type: "button", onclick: () => ueben(k) }, "Nochmals üben"),
          k ? h("button", { class: "btn", type: "button", onclick: () => lernen(k, 0) }, "Theorie wiederholen") : null,
          h("button", { class: "btn", type: "button", onclick: startseite }, "Zur Übersicht"))));
    }

    if (!fragen.length) { startseite(); return; }
    schritt();
  }

  // ---------- Lernspiele ----------
  // Offene Fragen sind ausgeschlossen: Selbstbewertung liesse sich im Spiel zu leicht ausnutzen.
  const SPIELE = {
    flug: { name: "Globi-Flug", icon: "🚀", art: "Geschicklichkeit", einheit: "Pakete", text: "Gedrückt halten zum Steigen. Pakete sammeln, Viren ausweichen." },
    faenger: { name: "Bewertungs-Fänger", icon: "⭐", art: "Geschicklichkeit", einheit: "Sterne", text: "Echte Bewertungen fangen, gefälschte meiden." },
    jagd: { name: "Viren-Jagd", icon: "🦠", art: "Reaktion", einheit: "Viren", text: "Viren schnell antippen, Datenpakete in Ruhe lassen." },
    stadt: { name: "Globis Stadt", icon: "🏗️", art: "Ruhig, ohne Zeitdruck", einheit: "Münzen", text: "Mit verdienten Münzen eine eigene Stadt bauen. Sie bleibt gespeichert." }
  };
  const GEBAEUDE = [
    ["baum", "🌳", "Baum", 1], ["blumen", "🌷", "Blumen", 1], ["haus", "🏠", "Haus", 2], ["brunnen", "⛲", "Brunnen", 3],
    ["laden", "🏪", "Laden", 3], ["funkmast", "📡", "Funkmast", 4], ["schule", "🏫", "Schule", 5], ["spital", "🏥", "Spital", 6],
    ["rechenzentrum", "🖥️", "Rechenzentrum", 8], ["stadion", "🏟️", "Stadion", 10], ["schloss", "🏰", "Schloss", 15]
  ].map(([id, icon, name, preis]) => ({ id, icon, name, preis }));
  const STADT_FELDER = 30;

  const spielPool = () => (M.uebungen || []).filter(f => f.typ !== "offen");
  function spielEinstellungen() {
    const s = M.spiel || {};
    const spiele = (Array.isArray(s.spiele) ? s.spiele : Object.keys(SPIELE)).filter(id => SPIELE[id]);
    return {
      fragenProRunde: Math.max(1, Math.round(Number(s.fragenProRunde) || 3)),
      sekunden: Math.min(120, Math.max(10, Math.round(Number(s.sekunden) || 30))),
      spiele: spiele.length ? spiele : Object.keys(SPIELE)
    };
  }
  function spielStand(id) {
    fortschritt.spiele = fortschritt.spiele || {};
    return (fortschritt.spiele[id] = fortschritt.spiele[id] || { rekord: 0, total: 0, runden: 0 });
  }
  function stadtStand() {
    const st = (fortschritt.stadt = fortschritt.stadt || { muenzen: 0, felder: [] });
    while (st.felder.length < STADT_FELDER) st.felder.push(null);
    return st;
  }
  // alter Spielstand (nur Globi-Flug) übernehmen
  if (fortschritt.spiel && !fortschritt.spiele) {
    fortschritt.spiele = { flug: { rekord: fortschritt.spiel.rekord || 0, total: fortschritt.spiel.paketeTotal || 0, runden: fortschritt.spiel.fluege || 0 } };
    delete fortschritt.spiel;
  }
  function figurQuelle() {
    if (masko.bild) return masko.bild;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(PLATZHALTER_SVG.trim().replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '));
  }
  const antworten = (n) => n === 1 ? "1 richtige Antwort" : `${n} richtige Antworten`;

  function spielStart() {
    const cfg = spielEinstellungen();
    if (cfg.spiele.length === 1) { spielSitzung(cfg.spiele[0]); return; }
    const karten = cfg.spiele.map(id => {
      const sp = SPIELE[id];
      const st = id === "stadt" ? null : spielStand(id);
      const stadt = id === "stadt" ? stadtStand() : null;
      const info = st && st.runden ? `Rekord: ${st.rekord} ${sp.einheit}` :
        stadt && stadt.felder.some(Boolean) ? `${stadt.felder.filter(Boolean).length} Gebäude gebaut` : "Noch nicht gespielt";
      return h("button", { class: "spiel-wahl", type: "button", onclick: () => { fortschritt.letztesSpiel = id; sichern(); spielSitzung(id); } },
        h("span", { class: "spiel-wahl-icon", "aria-hidden": "true" }, sp.icon),
        h("span", { class: "spiel-wahl-name" }, sp.name),
        h("span", { class: "spiel-wahl-art" }, sp.art),
        h("span", { class: "spiel-wahl-text" }, sp.text),
        h("span", { class: "spiel-wahl-info" }, info));
    });
    zeige(h("div", { class: "stack" },
      h("div", { class: "row between" },
        h("button", { class: "btn btn-ghost", type: "button", onclick: startseite }, "← Übersicht"),
        h("span", { class: "muted" }, "Spiel wählen")),
      sprechblase(`Welches Spiel möchtest du spielen? Für jede Runde brauchst du ${antworten(cfg.fragenProRunde)}.`, { hopp: true }),
      h("div", { class: "spiel-wahl-raster" }, karten)));
  }

  function spielSitzung(id) {
    const sp = SPIELE[id];
    const cfg = spielEinstellungen();
    const pool = spielPool();
    const istStadt = id === "stadt";
    let warteschlange = mischen(pool);
    const sitzung = { energie: 0, richtig: 0, beantwortet: 0, punkte: 0, runden: 0 };

    function energieAnzeige() {
      const n = cfg.fragenProRunde;
      return h("div", { class: "energie", role: "group", "aria-label": `Energie ${sitzung.energie} von ${n}` },
        h("span", { class: "energie-label" }, "⚡ Energie"),
        h("div", { class: "energie-zellen" }, Array.from({ length: n }, (_, i) => h("span", { class: i < sitzung.energie ? "voll" : "" }))),
        h("span", { class: "muted" }, istStadt ? `🪙 ${stadtStand().muenzen} Münzen` : `${sp.icon} ${sitzung.punkte} ${sp.einheit}`));
    }
    function kopf(text) {
      return h("div", { class: "row between" },
        h("button", { class: "btn btn-ghost", type: "button", onclick: sitzungEnde }, "← Beenden"),
        h("span", { class: "muted" }, text));
    }

    function frage() {
      if (!warteschlange.length) warteschlange = mischen(pool);
      const f = warteschlange.shift();
      const w = frageWidget(f, { sofortFeedback: false, optionenMischen: true });
      const feedback = h("div", {});
      const blaseBox = h("div", {});
      const energieBox = h("div", {}, energieAnzeige());
      const weiter = h("button", { class: "btn btn-primary", type: "button", hidden: true }, "Weiter");
      const pruefen = h("button", { class: "btn btn-primary", type: "button", onclick: () => {
        const r = w.auswerten();
        if (!r.beantwortet) { blaseBox.replaceChildren(sprechblase("Wähle zuerst eine Antwort.", { klein: true })); return; }
        pruefen.hidden = true;
        w.sperren();
        sitzung.beantwortet++;
        if (r.richtig) {
          sitzung.richtig++; sitzung.energie++;
          if (istStadt) { stadtStand().muenzen++; sitzung.punkte++; sichern(); }
        } else warteschlange.splice(Math.min(3, warteschlange.length), 0, f); // kommt bald nochmals
        energieBox.replaceChildren(energieAnzeige());
        const belohnung = istStadt ? "+1 Münze 🪙 " : "+1 Energie ⚡ ";
        feedback.replaceChildren(h("div", { class: "feedback " + (r.richtig ? "ok" : "nok") },
          h("strong", {}, r.richtig ? "Richtig! " + belohnung : "Nicht ganz. Diese Frage kommt später nochmals. "), f.erklaerung || ""));
        const bereit = sitzung.energie >= cfg.fragenProRunde;
        blaseBox.replaceChildren(sprechblase(bereit ? (istStadt ? "Energie voll! Zeit zum Bauen!" : "Energie voll! Bereit zum Spielen?") : (r.richtig ? lob() : trost()), { klein: true, hopp: r.richtig }));
        weiter.textContent = bereit ? `${sp.icon} ${istStadt ? "Zur Stadt" : sp.name + " starten"}!` : "Nächste Frage →";
        weiter.onclick = bereit ? (istStadt ? stadt : runde) : frage;
        weiter.hidden = false;
        weiter.focus();
      } }, "Prüfen");
      zeige(h("div", { class: "stack" },
        kopf(`${sp.icon} ${sp.name} · ${sitzung.richtig} von ${sitzung.beantwortet} richtig`),
        energieBox,
        h("article", { class: "card" }, w.knoten, feedback),
        blaseBox,
        h("div", { class: "row end" }, pruefen, weiter)));
    }

    // Geschicklichkeitsspiele
    function runde() {
      sitzung.energie -= cfg.fragenProRunde;
      const buehne = h("div", { class: "spiel-buehne" });
      const hilfe = { flug: "Maus, Finger oder Leertaste gedrückt halten = steigen, loslassen = sinken.",
        faenger: "Globi mit Maus oder Finger führen, oder mit den Pfeiltasten ← → bewegen.",
        jagd: "Viren antippen oder anklicken. Mit der Tastatur: Ziffern 1–9 für die Bildschirme." }[id];
      zeige(h("div", { class: "stack" }, kopf(`${sp.name} läuft …`), buehne, h("p", { class: "muted spiel-hilfe" }, hilfe)));
      window.LernSpiel[id](buehne, { sekunden: cfg.sekunden, bild: figurQuelle() }).then(res => {
        if (res.abgebrochen) return;
        sitzung.punkte += res.punkte; sitzung.runden++;
        const st = spielStand(id);
        const neuerRekord = res.punkte > st.rekord && st.runden > 0;
        st.rekord = Math.max(st.rekord, res.punkte); st.total += res.punkte; st.runden++;
        sichern();
        const text = neuerRekord ? `Neuer Rekord: ${res.punkte} ${sp.einheit}! Unglaublich!` :
          res.leben <= 0 ? `Oh nein, keine Leben mehr! Trotzdem ${res.punkte} ${sp.einheit}.` :
          `Geschafft! ${res.punkte} ${sp.einheit}.`;
        zeige(h("div", { class: "stack" },
          sprechblase(text + " Jetzt wieder Energie sammeln!", { hopp: true }),
          h("article", { class: "card resultat" },
            h("p", { class: "muted" }, "Diese Runde"),
            h("div", { class: "note-gross" }, `${sp.icon} ${res.punkte}`),
            h("p", {}, `Rekord: ${st.rekord} · in diesem Spiel total: ${sitzung.punkte} ${sp.einheit}`)),
          h("div", { class: "row" },
            h("button", { class: "btn btn-primary", type: "button", onclick: frage }, "Weiter Fragen beantworten"),
            h("button", { class: "btn", type: "button", onclick: sitzungEnde }, "Spiel beenden"))));
      });
    }

    // Ruhiges Bauspiel
    let gewaehlt = null;
    function stadt() {
      sitzung.energie = 0; sitzung.runden++;
      const st = stadtStand();
      const wert = st.felder.reduce((s, idx) => s + ((GEBAEUDE.find(g => g.id === idx) || {}).preis || 0), 0);
      const meldung = h("p", { class: "muted", role: "status" },
        gewaehlt === "abriss" ? "Tippe auf ein Gebäude, um es abzureissen (ohne Rückgabe der Münzen)." :
        gewaehlt ? `Tippe auf ein freies Feld, um ${GEBAEUDE.find(g => g.id === gewaehlt).name} zu bauen.` : "Wähle unten ein Gebäude.");
      const shop = h("div", { class: "stadt-shop", role: "group", "aria-label": "Gebäude wählen" },
        GEBAEUDE.map(g => h("button", {
          type: "button", class: "stadt-gebaeude" + (gewaehlt === g.id ? " aktiv" : ""), disabled: st.muenzen < g.preis,
          "aria-pressed": String(gewaehlt === g.id), onclick: () => { gewaehlt = g.id; stadtNeu(); }
        }, h("span", { class: "stadt-icon", "aria-hidden": "true" }, g.icon), h("span", {}, g.name), h("span", { class: "stadt-preis" }, `🪙 ${g.preis}`))),
        h("button", { type: "button", class: "stadt-gebaeude" + (gewaehlt === "abriss" ? " aktiv" : ""), "aria-pressed": String(gewaehlt === "abriss"),
          onclick: () => { gewaehlt = "abriss"; stadtNeu(); } }, h("span", { class: "stadt-icon", "aria-hidden": "true" }, "🧹"), h("span", {}, "Abreissen"), h("span", { class: "stadt-preis" }, "gratis")));
      const raster = h("div", { class: "stadt-raster" }, st.felder.map((idx, i) => {
        const g = GEBAEUDE.find(x => x.id === idx);
        return h("button", { type: "button", class: "stadt-feld" + (g ? " bebaut" : ""), "aria-label": `Feld ${i + 1}: ${g ? g.name : "frei"}`,
          onclick: () => {
            if (gewaehlt === "abriss") { if (g) { st.felder[i] = null; sichern(); stadtNeu(); } return; }
            const neu = GEBAEUDE.find(x => x.id === gewaehlt);
            if (!neu || g) return;
            if (st.muenzen < neu.preis) return;
            st.muenzen -= neu.preis; st.felder[i] = neu.id; sichern();
            if (st.muenzen < neu.preis) gewaehlt = null;
            stadtNeu();
          } }, g ? g.icon : "");
      }));
      zeige(h("div", { class: "stack" },
        kopf("Globis Stadt"),
        sprechblase(st.felder.every(Boolean) ? "Wow, die Stadt ist voll! Du kannst Gebäude abreissen und neu planen." :
          `Du hast ${st.muenzen} ${st.muenzen === 1 ? "Münze" : "Münzen"}. Was bauen wir?`, { klein: true }),
        h("div", { class: "row between" }, h("strong", {}, `🪙 ${st.muenzen} Münzen`), h("span", { class: "muted" }, `Stadtwert: ${wert}`)),
        h("div", { class: "card stadt-karte" }, raster),
        meldung,
        shop,
        h("div", { class: "row" },
          h("button", { class: "btn btn-primary", type: "button", onclick: () => { gewaehlt = null; frage(); } }, "Weiter Fragen beantworten"),
          h("button", { class: "btn", type: "button", onclick: sitzungEnde }, "Spiel beenden"))));
    }
    function stadtNeu() { const y = window.scrollY; sitzung.runden--; stadt(); window.scrollTo(0, y); }

    function sitzungEnde() {
      window.LernSpiel.stopp();
      const quote = sitzung.beantwortet ? Math.round(100 * sitzung.richtig / sitzung.beantwortet) : 0;
      zeige(h("div", { class: "stack" },
        sprechblase(sitzung.beantwortet ? `Gut gespielt! Du hast ${sitzung.richtig} von ${sitzung.beantwortet} Fragen richtig beantwortet (${quote} %).` : "Schade, dass du schon gehst. Bis zum nächsten Mal!", { hopp: true }),
        h("article", { class: "card resultat" },
          h("p", { class: "muted" }, `${sp.icon} ${sp.name}`),
          h("div", { class: "note-gross" }, istStadt ? `🪙 ${sitzung.punkte}` : `${sp.icon} ${sitzung.punkte}`),
          h("p", {}, istStadt ? `${sitzung.punkte} Münzen verdient` : `${sitzung.runden} ${sitzung.runden === 1 ? "Runde" : "Runden"} · ${sitzung.richtig} richtige Antworten`)),
        h("div", { class: "row" },
          h("button", { class: "btn btn-primary", type: "button", onclick: spielStart }, "Anderes Spiel wählen"),
          h("button", { class: "btn", type: "button", onclick: startseite }, "Zur Übersicht"))));
    }

    frage();
  }

  // ---------- Probetest ----------
  let timerId = null;
  function stoppeTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

  function note(punkte, max) {
    const nk = M.probetest.notenschluessel;
    if (Array.isArray(nk) && nk.length) {
      const passend = nk.filter(e => punkte >= e.punkte).sort((a, b) => b.punkte - a.punkte)[0];
      return passend ? passend.note : nk.reduce((a, b) => (a.punkte < b.punkte ? a : b)).note;
    }
    return Math.round((1 + 5 * punkte / max) * 4) / 4; // Standardformel, auf Viertelnoten
  }

  function probetestStart() {
    const pt = M.probetest;
    const widgets = pt.fragen.map(f => frageWidget(f, { sofortFeedback: false }));
    const max = widgets.reduce((s, w) => s + w.max, 0);
    let rest = (pt.minuten || 15) * 60;
    const timer = h("span", { class: "timer", role: "timer", "aria-live": "off" });
    const anzeigen = () => {
      const m = Math.floor(rest / 60), s = rest % 60;
      timer.textContent = `⏱ ${m}:${String(s).padStart(2, "0")}`;
      timer.classList.toggle("knapp", rest <= 120);
    };
    anzeigen();
    stoppeTimer();
    timerId = setInterval(() => { rest--; anzeigen(); if (rest <= 0) { stoppeTimer(); abgeben(true); } }, 1000);

    const abgeben = (zeitAbgelaufen = false) => {
      stoppeTimer();
      korrektur(widgets, max, zeitAbgelaufen);
    };

    zeige(h("div", { class: "stack" },
      h("div", { class: "row between" },
        h("button", { class: "btn btn-ghost", type: "button", onclick: () => { if (confirm("Probetest abbrechen?")) { stoppeTimer(); startseite(); } } }, "← Abbrechen"),
        timer),
      h("h1", {}, pt.titel || "Probetest"),
      h("p", { class: "muted" }, `${max} Punkte · ${pt.minuten || 15} Minuten`),
      widgets.map((w, i) => h("article", { class: "card" },
        h("div", { class: "frage-kopf" }, h("span", {}, `Frage ${i + 1}`), h("span", {}, `${w.max} P`)), w.knoten)),
      h("div", { class: "row end" },
        h("button", { class: "btn btn-primary", type: "button", onclick: () => { if (confirm("Test abgeben? Danach kannst du nichts mehr ändern.")) abgeben(); } }, "Test abgeben"))));
  }

  function korrektur(widgets, max, zeitAbgelaufen) {
    const offene = widgets.filter(w => w.auswerten().offen);
    const fertigBtn = h("button", { class: "btn btn-primary", type: "button", disabled: offene.length > 0, onclick: () => resultat(widgets, max) }, "Note berechnen");
    const status = h("p", { class: "muted", role: "status" });
    const aktualisieren = () => {
      const fehlend = offene.filter(w => !w.auswerten().bewertet).length;
      fertigBtn.disabled = fehlend > 0;
      status.textContent = fehlend ? `Noch ${fehlend} offene ${fehlend === 1 ? "Antwort" : "Antworten"} selbst bewerten.` : "Alles bewertet.";
    };
    widgets.forEach(w => w.sperren(aktualisieren));
    aktualisieren();

    const knoten = [...app.querySelectorAll("article.card")];
    zeige(h("div", { class: "stack" },
      sprechblase(zeitAbgelaufen ? "Die Zeit ist um! Schauen wir, wie es gelaufen ist." :
        "Abgegeben! Bei den offenen Fragen vergleichst du jetzt deine Antwort mit der Lösung und gibst dir ehrlich Punkte.", { hopp: true }),
      h("h1", {}, "Korrektur"),
      knoten,
      status,
      h("div", { class: "row end" }, fertigBtn)));
  }

  function resultat(widgets, max) {
    const punkte = widgets.reduce((s, w) => s + w.auswerten().punkte, 0);
    const n = note(Math.floor(punkte), max);
    fortschritt.tests.push({ punkte, max, note: n, datum: new Date().toISOString() });
    fortschritt.tests = fortschritt.tests.slice(-20);
    sichern();
    const text = n >= 5.5 ? "Hervorragend! Du bist top vorbereitet." :
      n >= 4.5 ? "Gut gemacht! Mit etwas Wiederholung schaffst du noch mehr." :
      n >= 4 ? "Genügend. Übe die Kapitel, bei denen du Punkte verloren hast." :
      "Das reicht noch nicht. Lies die Theorie nochmals und übe dann gezielt – du schaffst das!";
    zeige(h("div", { class: "stack" },
      sprechblase(text, { hopp: n >= 4.5 }),
      h("article", { class: "card resultat" },
        h("p", { class: "muted" }, "Dein Resultat"),
        h("div", { class: "note-gross" }, `Note ${n.toFixed(2)}`),
        h("p", {}, `${punkte} von ${max} Punkten`)),
      h("div", { class: "row" },
        h("button", { class: "btn btn-primary", type: "button", onclick: probetestStart }, "Nochmals versuchen"),
        h("button", { class: "btn", type: "button", onclick: startseite }, "Zur Übersicht"))));
  }

  // ---------- Bereich Lehrperson ----------
  const dlg = document.getElementById("lp-dialog");
  const meldung = document.getElementById("lp-meldung");
  const melde = (t, art) => { meldung.textContent = t; meldung.className = "lp-meldung " + (art || ""); };
  document.getElementById("lp-btn").addEventListener("click", () => {
    document.getElementById("lp-quelle").textContent = materialQuelle === "eigenes"
      ? `Aktiv: eigenes Material «${M.titel}» (in diesem Browser gespeichert).`
      : `Aktiv: Standardmaterial aus inhalt/thema.js («${M.titel}»).`;
    melde("");
    dlg.showModal();
  });
  document.getElementById("lp-datei").addEventListener("change", async (e) => {
    const datei = e.target.files[0];
    if (!datei) return;
    try {
      const daten = parseDatei(await datei.text());
      const fehler = pruefeMaterial(daten);
      if (fehler.length) { melde("Fehler im Material: " + fehler.slice(0, 5).join(" "), "fehler"); return; }
      if (!speicher.schreiben(K_MATERIAL, daten)) {
        melde("Der Browser erlaubt kein Speichern. Ersetze stattdessen die Datei inhalt/thema.js.", "fehler"); return;
      }
      melde(`«${daten.titel}» geladen. Die App startet neu …`, "ok");
      setTimeout(() => location.reload(), 900);
    } catch (err) {
      melde("Die Datei konnte nicht gelesen werden (kein gültiges JSON): " + err.message, "fehler");
    } finally { e.target.value = ""; }
  });
  document.getElementById("lp-export").addEventListener("click", () => {
    herunterladen(JSON.stringify(M, null, 2), "lernmaterial.json", "application/json");
  });
  document.getElementById("lp-editor").addEventListener("click", () => {
    if (!window.LernEditor || window.LernEditor.version !== window.LernappVersion) {
      melde("Der Editor konnte nicht geladen werden: Die Datei editor.js fehlt oder ist veraltet. Lade alle Dateien der App neu herunter und lade die Seite neu (Mac: Cmd + Shift + R, Windows: Ctrl + F5).", "fehler");
      return;
    }
    dlg.close();
    stoppeTimer();
    window.LernEditor.oeffnen(M, app, startseite);
  });
  document.getElementById("lp-standard").addEventListener("click", () => {
    if (!confirm("Eigenes Material entfernen und Standardmaterial aus inhalt/thema.js verwenden?")) return;
    speicher.loeschen(K_MATERIAL); location.reload();
  });
  document.getElementById("lp-fortschritt").addEventListener("click", () => {
    if (!confirm("Lernfortschritt für dieses Material in diesem Browser löschen?")) return;
    speicher.loeschen(K_FORTSCHRITT);
    fortschritt = { gelernt: {}, uebung: {}, tests: [] };
    melde("Lernfortschritt gelöscht.", "ok");
    startseite();
  });

  // ---------- Start ----------
  document.getElementById("home-btn").addEventListener("click", () => { stoppeTimer(); if (window.LernSpiel) window.LernSpiel.stopp(); startseite(); });
  if (!M) {
    zeige(h("div", { class: "hinweis-box" }, "Kein Lernmaterial gefunden. Prüfe die Datei inhalt/thema.js."));
    return;
  }
  const fehlerStandard = pruefeMaterial(M);
  document.title = `${M.titel} – Lernapp`;
  document.getElementById("brand-titel").textContent = M.titel;
  document.getElementById("brand-fach").textContent = [M.fach, M.stufe].filter(Boolean).join(" · ");
  if (fehlerStandard.length) {
    zeige(h("div", { class: "hinweis-box" }, h("strong", {}, "Fehler im Material: "), fehlerStandard.join(" ")));
    return;
  }
  startseite();
})();
