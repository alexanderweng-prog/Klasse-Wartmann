// Editor für Lernmaterial: Formularfelder statt JSON
(() => {
  "use strict";
  const { h, speicher, TYPEN, pruefeMaterial, parseDatei, herunterladen, K_MATERIAL } = window.Lernapp;
  const K_ENTWURF = "lernapp.entwurf";

  let M = null;          // Material, das gerade bearbeitet wird
  let root = null;       // Container (main#app)
  let zurueck = null;    // Callback zur App
  let tab = "allgemein";
  const offen = new WeakSet(); // aufgeklappte Einträge bleiben nach Neuzeichnen offen
  let speicherTimer = null;

  const klon = (o) => JSON.parse(JSON.stringify(o));
  const SPIEL_IDS = ["flug", "faenger", "jagd", "stadt"];
  const SPIEL_NAMEN = { flug: "🚀 Globi-Flug (Geschicklichkeit)", faenger: "⭐ Bewertungs-Fänger (Geschicklichkeit)", jagd: "🦠 Viren-Jagd (Reaktion)", stadt: "🏗️ Globis Stadt (ruhig, ohne Zeitdruck)" };
  const neueId = () => "k" + Math.random().toString(36).slice(2, 8);

  function normalisieren(m) {
    m.maskottchen = m.maskottchen || {};
    m.maskottchen.lob = Array.isArray(m.maskottchen.lob) ? m.maskottchen.lob : [];
    m.maskottchen.trost = Array.isArray(m.maskottchen.trost) ? m.maskottchen.trost : [];
    m.begleiter = Object.assign({ name: "Bläss", bild: "", zeigen: true }, m.begleiter || {});
    m.kapitel = Array.isArray(m.kapitel) ? m.kapitel : [];
    m.kapitel.forEach(k => { k.id = k.id || neueId(); k.karten = Array.isArray(k.karten) ? k.karten : []; });
    m.uebungen = Array.isArray(m.uebungen) ? m.uebungen : [];
    m.spiel = Object.assign({ fragenProRunde: 3, sekunden: 30 }, m.spiel || {});
    if (!Array.isArray(m.spiel.spiele)) m.spiel.spiele = SPIEL_IDS.slice();
    if (m.probetest) m.probetest.fragen = Array.isArray(m.probetest.fragen) ? m.probetest.fragen : [];
    return m;
  }

  function leeresMaterial() {
    const id = neueId();
    return normalisieren({
      titel: "Neues Thema", fach: (M && M.fach) || "Medien und Informatik", stufe: (M && M.stufe) || "",
      maskottchen: M ? klon(M.maskottchen) : { name: "Globi" },
      kapitel: [{ id, titel: "Kapitel 1", icon: "📘", karten: [{ titel: "", text: "", merksatz: "" }] }],
      uebungen: [],
      probetest: { titel: "Probetest", minuten: 15, hinweis: "", fragen: [] }
    });
  }

  // ---------- Öffnen / Entwurf ----------
  function oeffnen(material, ziel, schliessen) {
    root = ziel; zurueck = schliessen;
    const entwurf = speicher.lesen(K_ENTWURF, null);
    if (entwurf && entwurf.daten &&
        confirm(`Es gibt einen nicht übernommenen Entwurf «${entwurf.daten.titel || "ohne Titel"}» vom ${new Date(entwurf.zeit).toLocaleString("de-CH")}.\n\nOK = Entwurf weiterbearbeiten\nAbbrechen = aktuelles Material öffnen`)) {
      M = normalisieren(entwurf.daten);
    } else {
      speicher.loeschen(K_ENTWURF);
      M = normalisieren(klon(material));
    }
    tab = "allgemein";
    zeichnen();
  }

  let ungesichert = false;
  function entwurfSichern() {
    clearTimeout(speicherTimer);
    if (ungesichert && M) speicher.schreiben(K_ENTWURF, { zeit: Date.now(), daten: M });
    ungesichert = false;
  }
  // beim Schliessen/Neuladen sofort sichern, damit nichts verloren geht
  window.addEventListener("pagehide", entwurfSichern);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") entwurfSichern(); });

  function geaendert() {
    ungesichert = true;
    clearTimeout(speicherTimer);
    speicherTimer = setTimeout(entwurfSichern, 400);
    statusZeile.textContent = "Entwurf wird automatisch gesichert (noch nicht in der App übernommen).";
    statusZeile.className = "ed-status";
  }

  // ---------- Feld-Bausteine ----------
  let feldNr = 0;
  function feld(label, obj, key, { typ = "text", hilfe, zeilen, platzhalter, min, step, beiAenderung } = {}) {
    const id = "ed-f" + (++feldNr);
    let input;
    if (typ === "textarea") input = h("textarea", { id, rows: zeilen || 3, placeholder: platzhalter });
    else input = h("input", { id, type: typ, placeholder: platzhalter, min, step });
    input.value = obj[key] ?? "";
    input.addEventListener("input", () => {
      obj[key] = typ === "number" ? (input.value === "" ? undefined : Number(input.value)) : input.value;
      if (beiAenderung) beiAenderung();
      geaendert();
    });
    return h("div", { class: "ed-feld" },
      h("label", { for: id }, label),
      input,
      hilfe ? h("small", { class: "muted" }, hilfe) : null);
  }

  // Liste von Texten als mehrzeiliges Feld (eine Zeile = ein Eintrag)
  function zeilenFeld(label, obj, key, hilfe) {
    const id = "ed-f" + (++feldNr);
    const ta = h("textarea", { id, rows: 3 });
    ta.value = (obj[key] || []).join("\n");
    ta.addEventListener("input", () => { obj[key] = ta.value.split("\n").map(s => s.trim()).filter(Boolean); geaendert(); });
    return h("div", { class: "ed-feld" }, h("label", { for: id }, label), ta, hilfe ? h("small", { class: "muted" }, hilfe) : null);
  }

  function knopf(text, onclick, { klasse = "", titel } = {}) {
    return h("button", { class: "btn " + klasse, type: "button", title: titel, "aria-label": titel, onclick }, text);
  }

  // Liste mit Aufklappen, Verschieben, Kopieren, Löschen
  function listeEditor(arr, { name, zusammenfassung, inhalt, neu, vorLoeschen }) {
    const eintraege = arr.map((item, i) => {
      const det = h("details", { class: "ed-eintrag" });
      if (offen.has(item)) det.open = true;
      det.addEventListener("toggle", () => { det.open ? offen.add(item) : offen.delete(item); if (det.open && !det.dataset.gefuellt) fuellen(); });
      const fuellen = () => {
        det.dataset.gefuellt = "1";
        det.append(h("div", { class: "ed-eintrag-inhalt" },
          inhalt(item, i),
          h("div", { class: "row ed-aktionen" },
            knopf("↑", () => { if (i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; geaendert(); zeichnen(); } }, { titel: "Nach oben" }),
            knopf("↓", () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; geaendert(); zeichnen(); } }, { titel: "Nach unten" }),
            knopf("Kopieren", () => { const k = klon(item); if (k.id) k.id = neueId(); arr.splice(i + 1, 0, k); offen.add(k); geaendert(); zeichnen(); }),
            knopf("Löschen", () => {
              if (vorLoeschen && !vorLoeschen(item)) return;
              if (!vorLoeschen && !confirm(`${name} wirklich löschen?`)) return;
              arr.splice(i, 1); geaendert(); zeichnen();
            }, { klasse: "btn-gefahr" }))));
      };
      det.append(h("summary", {}, h("span", { class: "ed-nr" }, `${i + 1}`), h("span", { class: "ed-zus" }, zusammenfassung(item) || "(leer)")));
      if (det.open) fuellen();
      return det;
    });
    return h("div", { class: "ed-liste" },
      eintraege,
      knopf(`+ ${name} hinzufügen`, () => { const n = neu(); arr.push(n); offen.add(n); geaendert(); zeichnen(); }, { klasse: "ed-neu" }));
  }

  // ---------- Fragen ----------
  function typWechseln(f, neuerTyp) {
    const alt = f.typ;
    if (alt === neuerTyp) return;
    f.typ = neuerTyp;
    if (neuerTyp === "auswahl" || neuerTyp === "mehrfach") {
      if (!Array.isArray(f.optionen) || f.optionen.length < 2) f.optionen = ["", ""];
      if (neuerTyp === "auswahl") f.richtig = Array.isArray(f.richtig) ? (f.richtig[0] ?? 0) : (Number.isInteger(f.richtig) ? f.richtig : 0);
      else f.richtig = Array.isArray(f.richtig) ? f.richtig : (Number.isInteger(f.richtig) ? [f.richtig] : []);
    }
    if (neuerTyp === "zuordnen" && (!Array.isArray(f.paare) || f.paare.length < 2)) f.paare = [{ links: "", rechts: "" }, { links: "", rechts: "" }];
    if (neuerTyp === "offen") { f.musterloesung = f.musterloesung || ""; f.punkte = f.punkte || 1; }
    // nicht mehr passende Felder entfernen
    if (!["auswahl", "mehrfach"].includes(neuerTyp)) { delete f.optionen; delete f.richtig; }
    if (neuerTyp !== "zuordnen") delete f.paare;
    if (neuerTyp !== "offen") delete f.musterloesung;
  }

  function neueFrage(probetest) {
    const f = { typ: "auswahl", frage: "", optionen: ["", ""], richtig: 0 };
    if (probetest) { f.punkte = 1; f.abschnitt = ""; }
    else { f.kapitel = M.kapitel[0] ? M.kapitel[0].id : ""; f.erklaerung = ""; }
    return f;
  }

  function kontextEditor(f) {
    const art = !f.kontext ? "keine" : typeof f.kontext === "string" ? "text" : "tabelle";
    const box = h("div", {});
    const id = "ed-f" + (++feldNr);
    const sel = h("select", { id },
      h("option", { value: "keine" }, "Keine"), h("option", { value: "text" }, "Text"), h("option", { value: "tabelle" }, "Tabelle"));
    sel.value = art;
    const inhalt = () => {
      box.replaceChildren();
      if (sel.value === "text") {
        if (typeof f.kontext !== "string") f.kontext = "";
        box.append(feld("Zusatztext", f, "kontext", { typ: "textarea" }));
      } else if (sel.value === "tabelle") {
        if (!f.kontext || typeof f.kontext !== "object") f.kontext = { kopf: [], zeilen: [] };
        const ta = h("textarea", { rows: 4, "aria-label": "Tabelle", placeholder: "Pizzeria | Sterne | Bewertungen\nBella | 4.9 | 3\nRoma | 4.2 | 85" });
        ta.value = [f.kontext.kopf, ...f.kontext.zeilen].filter(r => r.length).map(r => r.join(" | ")).join("\n");
        ta.addEventListener("input", () => {
          const reihen = ta.value.split("\n").filter(z => z.trim()).map(z => z.split("|").map(s => s.trim()));
          f.kontext = { kopf: reihen[0] || [], zeilen: reihen.slice(1) };
          geaendert();
        });
        box.append(h("div", { class: "ed-feld" }, ta,
          h("small", { class: "muted" }, "Erste Zeile = Spaltentitel. Spalten mit | trennen (auf Schweizer Tastatur: AltGr + 7).")));
      } else delete f.kontext;
    };
    sel.addEventListener("change", () => { inhalt(); geaendert(); });
    inhalt();
    return h("div", { class: "ed-feld" }, h("label", { for: id }, "Material zur Frage (z. B. Tabelle)"), sel, box);
  }

  function optionenEditor(f) {
    const mehr = f.typ === "mehrfach";
    const name = "ed-r" + (++feldNr);
    const zeilen = f.optionen.map((o, j) => {
      const istRichtig = mehr ? f.richtig.includes(j) : f.richtig === j;
      const marke = h("input", { type: mehr ? "checkbox" : "radio", name, "aria-label": `Antwort ${j + 1} ist richtig` });
      marke.checked = istRichtig;
      marke.addEventListener("change", () => {
        if (mehr) f.richtig = marke.checked ? [...new Set([...f.richtig, j])].sort() : f.richtig.filter(r => r !== j);
        else f.richtig = j;
        geaendert();
      });
      const txt = h("input", { type: "text", "aria-label": `Antwort ${j + 1}`, placeholder: `Antwort ${j + 1}` });
      txt.value = o;
      txt.addEventListener("input", () => { f.optionen[j] = txt.value; geaendert(); });
      const weg = knopf("✕", () => {
        if (f.optionen.length <= 2) { alert("Es braucht mindestens 2 Antworten."); return; }
        f.optionen.splice(j, 1);
        const neu = (r) => (r > j ? r - 1 : r);
        if (mehr) f.richtig = f.richtig.filter(r => r !== j).map(neu);
        else f.richtig = f.richtig === j ? 0 : neu(f.richtig);
        geaendert(); zeichnen();
      }, { titel: `Antwort ${j + 1} entfernen` });
      return h("div", { class: "ed-option" }, h("label", { class: "ed-richtig" }, marke, h("span", {}, "richtig")), txt, weg);
    });
    return h("div", { class: "ed-feld" },
      h("span", { class: "ed-label" }, mehr ? "Antworten (alle richtigen ankreuzen)" : "Antworten (die richtige markieren)"),
      zeilen,
      knopf("+ Antwort", () => { f.optionen.push(""); geaendert(); zeichnen(); }),
      h("small", { class: "muted" }, "In den Übungen wird die Reihenfolge automatisch gemischt."));
  }

  function paareEditor(f) {
    const zeilen = f.paare.map((p, j) => {
      const l = h("input", { type: "text", placeholder: "Begriff / Beispiel", "aria-label": `Paar ${j + 1} links` });
      const r = h("input", { type: "text", placeholder: "passende Beschreibung", "aria-label": `Paar ${j + 1} rechts` });
      l.value = p.links || ""; r.value = p.rechts || "";
      l.addEventListener("input", () => { p.links = l.value; geaendert(); });
      r.addEventListener("input", () => { p.rechts = r.value; geaendert(); });
      const weg = knopf("✕", () => {
        if (f.paare.length <= 2) { alert("Es braucht mindestens 2 Paare."); return; }
        f.paare.splice(j, 1); geaendert(); zeichnen();
      }, { titel: `Paar ${j + 1} entfernen` });
      return h("div", { class: "ed-paar" }, l, h("span", { "aria-hidden": "true" }, "→"), r, weg);
    });
    return h("div", { class: "ed-feld" },
      h("span", { class: "ed-label" }, "Paare (links → richtige Zuordnung rechts)"),
      zeilen,
      knopf("+ Paar", () => { f.paare.push({ links: "", rechts: "" }); geaendert(); zeichnen(); }),
      h("small", { class: "muted" }, "Die rechten Einträge erscheinen in der App gemischt als Auswahlliste."));
  }

  function frageEditor(f, { probetest }) {
    const teile = [];
    if (probetest) {
      teile.push(h("div", { class: "ed-zwei" },
        feld("Abschnitt (Überschrift)", f, "abschnitt", { platzhalter: "z. B. Aufgabe 1 · Internet" }),
        feld("Punkte", f, "punkte", { typ: "number", min: 0, step: 0.5 })));
    } else {
      const id = "ed-f" + (++feldNr);
      const sel = h("select", { id }, M.kapitel.map(k => h("option", { value: k.id }, `${k.icon || ""} ${k.titel}`)));
      sel.value = f.kapitel;
      sel.addEventListener("change", () => { f.kapitel = sel.value; geaendert(); });
      teile.push(h("div", { class: "ed-feld" }, h("label", { for: id }, "Kapitel"), sel));
    }
    const tid = "ed-f" + (++feldNr);
    const typSel = h("select", { id: tid }, Object.entries(TYPEN).map(([k, v]) => h("option", { value: k }, v)));
    typSel.value = f.typ;
    typSel.addEventListener("change", () => { typWechseln(f, typSel.value); geaendert(); zeichnen(); });
    teile.push(h("div", { class: "ed-feld" }, h("label", { for: tid }, "Fragetyp"), typSel));
    teile.push(feld("Frage", f, "frage", { typ: "textarea", zeilen: 2 }));
    teile.push(kontextEditor(f));
    if (f.typ === "auswahl" || f.typ === "mehrfach") teile.push(optionenEditor(f));
    if (f.typ === "zuordnen") teile.push(paareEditor(f));
    if (f.typ === "offen") {
      teile.push(feld("Musterlösung", f, "musterloesung", { typ: "textarea", hilfe: "Wird nach dem Antworten angezeigt; die Schüler/innen bewerten sich damit selbst." }));
      if (!probetest) teile.push(feld("Punkte", f, "punkte", { typ: "number", min: 1, step: 1 }));
    }
    if (!probetest && f.typ !== "offen") teile.push(feld("Erklärung (nach dem Prüfen)", f, "erklaerung", { typ: "textarea", zeilen: 2 }));
    return h("div", {}, teile);
  }

  // ---------- Reiter ----------
  function reiterAllgemein() {
    const mk = M.maskottchen;
    const vorschau = h("div", { class: "ed-bild" });
    const zeigeVorschau = () => {
      vorschau.replaceChildren(mk.bild
        ? h("img", { src: mk.bild, alt: "Vorschau Maskottchen", onerror: (e) => { e.target.replaceWith(h("span", { class: "muted" }, "Bild nicht gefunden")); } })
        : h("span", { class: "muted" }, "kein Bild – Platzhalter-Figur"));
    };
    zeigeVorschau();
    const datei = h("input", { type: "file", accept: "image/*", hidden: true });
    datei.addEventListener("change", async () => {
      const f = datei.files[0]; if (!f) return;
      try { mk.bild = await bildVerkleinern(f); zeigeVorschau(); geaendert(); bildPfad.querySelector("input").value = "(eingebettetes Bild)"; }
      catch { alert("Das Bild konnte nicht gelesen werden."); }
      datei.value = "";
    });
    const bildPfad = feld("Bild (Pfad)", { get bild() { return mk.bild && mk.bild.startsWith("data:") ? "(eingebettetes Bild)" : mk.bild; }, set bild(v) { mk.bild = v; } }, "bild",
      { hilfe: "z. B. bilder/maskottchen.png – oder unten ein Bild wählen, dann wird es direkt ins Material eingebettet.", beiAenderung: zeigeVorschau });

    return [
      h("section", { class: "card stack" },
        h("h2", {}, "Thema"),
        feld("Titel", M, "titel"),
        h("div", { class: "ed-zwei" }, feld("Fach", M, "fach"), feld("Stufe", M, "stufe", { platzhalter: "z. B. 7. Klasse" }))),
      h("section", { class: "card stack" },
        h("h2", {}, "Maskottchen"),
        feld("Name", mk, "name"),
        h("div", { class: "ed-bildzeile" }, vorschau,
          h("div", { class: "stack", style: "flex:1" }, bildPfad,
            h("div", { class: "row" },
              h("label", { class: "btn" }, "Bild wählen …", datei),
              knopf("Bild entfernen", () => { mk.bild = ""; bildPfad.querySelector("input").value = ""; zeigeVorschau(); geaendert(); })))),
        feld("Begrüssung", mk, "begruessung", { typ: "textarea", zeilen: 2 }),
        zeilenFeld("Lob (ein Spruch pro Zeile)", mk, "lob", "Zufällig bei richtigen Antworten."),
        zeilenFeld("Trost (ein Spruch pro Zeile)", mk, "trost", "Zufällig bei falschen Antworten.")),
      begleiterAbschnitt(),
      h("section", { class: "card stack" },
        h("h2", {}, "Lernspiele"),
        h("p", { class: "muted" }, "Die Spiele nutzen die Übungsfragen (ohne offene Fragen). Für jede Spielrunde müssen zuerst Fragen richtig beantwortet werden."),
        h("div", { class: "ed-zwei" },
          feld("Richtige Antworten pro Spielrunde", M.spiel, "fragenProRunde", { typ: "number", min: 1, step: 1, hilfe: "Empfohlen: 3 bis 5" }),
          feld("Rundendauer in Sekunden", M.spiel, "sekunden", { typ: "number", min: 10, step: 5, hilfe: "10 bis 120 Sekunden (gilt nicht für Globis Stadt)" })),
        h("fieldset", { class: "ed-spiele" },
          h("legend", {}, "Diese Spiele stehen zur Auswahl"),
          SPIEL_IDS.map(id => {
            const cb = h("input", { type: "checkbox", id: "ed-spiel-" + id });
            cb.checked = M.spiel.spiele.includes(id);
            cb.addEventListener("change", () => {
              M.spiel.spiele = SPIEL_IDS.filter(x => x === id ? cb.checked : M.spiel.spiele.includes(x));
              geaendert();
            });
            return h("label", { class: "ed-check", for: "ed-spiel-" + id }, cb, " ", SPIEL_NAMEN[id]);
          }),
          h("small", { class: "muted" }, "Ist nur ein Spiel gewählt, startet es direkt ohne Auswahl.")))
    ];
  }

  function begleiterAbschnitt() {
    const bg = M.begleiter;
    const vorschau = h("div", { class: "ed-bild ed-bild-klein" });
    const zeige = () => vorschau.replaceChildren(bg.bild
      ? h("img", { src: bg.bild, alt: "Vorschau Begleiter", onerror: (e) => { e.target.replaceWith(h("span", { class: "muted" }, "Bild nicht gefunden")); } })
      : h("span", { class: "muted" }, "gezeichneter Hund"));
    zeige();
    const datei = h("input", { type: "file", accept: "image/*", hidden: true });
    datei.addEventListener("change", async () => {
      const f = datei.files[0]; if (!f) return;
      try { bg.bild = await bildVerkleinern(f); zeige(); geaendert(); } catch { alert("Das Bild konnte nicht gelesen werden."); }
      datei.value = "";
    });
    const an = h("input", { type: "checkbox", id: "ed-begl-an" });
    an.checked = bg.zeigen !== false;
    an.addEventListener("change", () => { bg.zeigen = an.checked; geaendert(); });
    return h("section", { class: "card stack" },
      h("h2", {}, "Begleiter"),
      h("label", { class: "ed-check", for: "ed-begl-an" }, an, " Begleiter neben dem Maskottchen anzeigen"),
      feld("Name", bg, "name", { hilfe: "Wird in den Texten nicht automatisch eingesetzt – erwähne ihn z. B. in der Begrüssung." }),
      h("div", { class: "ed-bildzeile" }, vorschau,
        h("div", { class: "row", style: "flex:1" },
          h("label", { class: "btn" }, "Eigenes Bild wählen …", datei),
          knopf("Gezeichneten Hund verwenden", () => { bg.bild = ""; zeige(); geaendert(); }))));
  }

  function reiterTheorie() {
    return [
      h("p", { class: "muted" }, "Jedes Kapitel erscheint als eigene Kachel auf der Startseite. Klicke auf einen Eintrag, um ihn aufzuklappen."),
      listeEditor(M.kapitel, {
        name: "Kapitel",
        zusammenfassung: k => `${k.icon || "📘"} ${k.titel || ""} · ${k.karten.length} Karten · ${M.uebungen.filter(f => f.kapitel === k.id).length} Übungen`,
        neu: () => { const c = { titel: "", text: "", merksatz: "" }; offen.add(c); return { id: neueId(), titel: "", icon: "📘", karten: [c] }; },
        vorLoeschen: (k) => {
          const n = M.uebungen.filter(f => f.kapitel === k.id).length;
          if (!confirm(`Kapitel «${k.titel}» löschen?${n ? `\n\nAchtung: ${n} Übungen gehören dazu und werden ebenfalls gelöscht.` : ""}`)) return false;
          M.uebungen = M.uebungen.filter(f => f.kapitel !== k.id);
          return true;
        },
        inhalt: (k) => h("div", { class: "stack" },
          h("div", { class: "ed-zwei ed-icon" },
            feld("Titel des Kapitels", k, "titel"),
            feld("Symbol", k, "icon", { hilfe: "ein Emoji, z. B. 🌐 ⭐ 🤖" })),
          h("h3", {}, "Lernkarten"),
          listeEditor(k.karten, {
            name: "Karte",
            zusammenfassung: c => c.titel,
            neu: () => ({ titel: "", text: "", merksatz: "" }),
            inhalt: (c) => h("div", { class: "stack" },
              feld("Titel", c, "titel"),
              feld("Text", c, "text", { typ: "textarea", zeilen: 6, hilfe: "Zeilenumbrüche werden übernommen. Für Aufzählungen Zeilen mit «• » beginnen." }),
              feld("Merksatz", c, "merksatz", { hilfe: "Kurz und prägnant – wird hervorgehoben." }))
          }))
      })
    ];
  }

  function reiterUebungen() {
    if (!M.kapitel.length) return [h("p", {}, "Lege zuerst im Reiter «Theorie» ein Kapitel an.")];
    const nachKapitel = M.kapitel.map(k => {
      const fragen = M.uebungen.filter(f => f.kapitel === k.id).length;
      return `${k.icon || ""} ${k.titel}: ${fragen}`;
    }).join(" · ");
    return [
      h("p", { class: "muted" }, `Fragen pro Kapitel – ${nachKapitel}`),
      listeEditor(M.uebungen, {
        name: "Übungsfrage",
        zusammenfassung: f => {
          const k = M.kapitel.find(x => x.id === f.kapitel);
          return `${k ? (k.icon || "") + " " : "⚠ "}${f.frage || ""}`;
        },
        neu: () => neueFrage(false),
        inhalt: (f) => frageEditor(f, { probetest: false })
      })
    ];
  }

  function reiterProbetest() {
    const aktiv = h("input", { type: "checkbox", id: "ed-pt-aktiv" });
    aktiv.checked = !!M.probetest;
    aktiv.addEventListener("change", () => {
      if (aktiv.checked) M.probetest = M._probetestAblage || { titel: "Probetest", minuten: 15, hinweis: "", fragen: [] };
      else { M._probetestAblage = M.probetest; M.probetest = null; }
      geaendert(); zeichnen();
    });
    const kopf = h("label", { class: "ed-check", for: "ed-pt-aktiv" }, aktiv, " Probetest anbieten");
    if (!M.probetest) return [h("section", { class: "card" }, kopf)];
    const pt = M.probetest;
    const max = () => pt.fragen.reduce((s, f) => s + (Number(f.punkte) || (f.typ === "zuordnen" ? (f.paare || []).length : 1)), 0);
    const maxAnzeige = h("strong", {}, String(max()));

    // Notenschlüssel
    const nkBox = h("div", {});
    const modus = h("select", { id: "ed-nk" }, h("option", { value: "formel" }, "Formel: Note = 1 + 5 × Punkte ÷ Maximum"), h("option", { value: "tabelle" }, "Eigene Tabelle"));
    modus.value = Array.isArray(pt.notenschluessel) && pt.notenschluessel.length ? "tabelle" : "formel";
    const nkZeichnen = () => {
      nkBox.replaceChildren();
      if (modus.value === "formel") { delete pt.notenschluessel; return; }
      const ta = h("textarea", { rows: 8, "aria-label": "Notenschlüssel" });
      const alsText = () => (pt.notenschluessel || []).map(e => `${e.punkte} = ${e.note}`).join("\n");
      ta.value = alsText();
      ta.addEventListener("input", () => {
        pt.notenschluessel = ta.value.split("\n").map(z => z.split("=").map(s => s.trim().replace(",", ".")))
          .filter(z => z.length === 2 && z[0] !== "" && !isNaN(z[0]) && !isNaN(z[1]))
          .map(([p, n]) => ({ punkte: Number(p), note: Number(n) }));
        geaendert();
      });
      nkBox.append(ta,
        h("small", { class: "muted" }, "Eine Zeile pro Stufe: «Punkte = Note», z. B. «12 = 5». Gilt ab dieser Punktzahl."),
        knopf("Tabelle aus Formel erzeugen", () => {
          const m = max();
          pt.notenschluessel = [];
          for (let p = m; p >= 0; p--) pt.notenschluessel.push({ punkte: p, note: Math.round((1 + 5 * p / (m || 1)) * 4) / 4 });
          ta.value = alsText(); geaendert();
        }));
    };
    modus.addEventListener("change", () => { nkZeichnen(); geaendert(); });
    nkZeichnen();

    const punkteAktualisieren = () => { maxAnzeige.textContent = String(max()); };
    const fragenListe = listeEditor(pt.fragen, {
      name: "Testfrage",
      zusammenfassung: f => `${f.abschnitt ? f.abschnitt + " – " : ""}${f.frage || ""} (${f.punkte ?? "?"} P)`,
      neu: () => neueFrage(true),
      inhalt: (f) => frageEditor(f, { probetest: true })
    });
    fragenListe.addEventListener("input", punkteAktualisieren);

    return [
      h("section", { class: "card stack" },
        kopf,
        feld("Titel", pt, "titel"),
        h("div", { class: "ed-zwei" },
          feld("Zeit in Minuten", pt, "minuten", { typ: "number", min: 1 }),
          h("div", { class: "ed-feld" }, h("span", { class: "ed-label" }, "Total Punkte"), h("div", { class: "ed-total" }, maxAnzeige))),
        feld("Hinweis auf der Startseite", pt, "hinweis", { typ: "textarea", zeilen: 2 }),
        h("div", { class: "ed-feld" }, h("label", { for: "ed-nk" }, "Notenschlüssel"), modus, nkBox)),
      h("h2", {}, "Fragen"),
      fragenListe
    ];
  }

  // ---------- Bild verkleinern und einbetten ----------
  function bildVerkleinern(datei) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const maxH = 400, maxB = 400;
        const f = Math.min(1, maxH / img.height, maxB / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(datei);
    });
  }

  // ---------- Speichern / Export ----------
  function sauber() {
    const m = klon(M);
    delete m._probetestAblage;
    if (!m.probetest) delete m.probetest;
    const putzen = (f) => {
      if (f.kontext && typeof f.kontext === "object" && !f.kontext.kopf.length) delete f.kontext;
      if (f.kontext === "") delete f.kontext;
      if (f.erklaerung === "") delete f.erklaerung;
      if (f.abschnitt === "") delete f.abschnitt;
      if (f.punkte === undefined || f.punkte === null) delete f.punkte;
    };
    m.uebungen.forEach(putzen);
    if (m.probetest) m.probetest.fragen.forEach(putzen);
    m.kapitel.forEach(k => k.karten.forEach(c => { if (!c.merksatz) delete c.merksatz; }));
    return m;
  }

  function pruefenUndMelden() {
    const fehler = pruefeMaterial(sauber());
    fehlerBox.replaceChildren();
    if (fehler.length) {
      fehlerBox.append(h("div", { class: "hinweis-box" },
        h("strong", {}, `${fehler.length} ${fehler.length === 1 ? "Problem" : "Probleme"} – bitte zuerst beheben:`),
        h("ul", {}, fehler.slice(0, 15).map(f => h("li", {}, f))),
        fehler.length > 15 ? h("p", {}, `… und ${fehler.length - 15} weitere.`) : null));
      fehlerBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return fehler.length === 0;
  }

  function uebernehmen() {
    if (!pruefenUndMelden()) return;
    if (!speicher.schreiben(K_MATERIAL, sauber())) {
      alert("Der Browser erlaubt kein Speichern (z. B. privates Fenster oder Bild zu gross). Lade stattdessen «thema.js» herunter und ersetze damit die Datei inhalt/thema.js.");
      return;
    }
    clearTimeout(speicherTimer); ungesichert = false;
    speicher.loeschen(K_ENTWURF);
    location.reload();
  }

  function alsThemaJs() {
    return `/*
  LERNINHALT – erstellt mit dem Editor der Lernapp.
  Diese Datei ersetzt inhalt/thema.js. Bearbeiten am einfachsten wieder im Editor
  (Lehrperson → Editor öffnen).
*/
window.LERNINHALT = ${JSON.stringify(sauber(), null, 2)};
`;
  }

  // ---------- Zeichnen ----------
  const statusZeile = h("p", { class: "ed-status muted", role: "status" });
  const fehlerBox = h("div", { "aria-live": "polite" });

  function zeichnen() {
    const scrollY = window.scrollY;
    feldNr = 0;
    const reiter = [["allgemein", "Allgemein"], ["theorie", "Theorie"], ["uebungen", `Übungen (${M.uebungen.length})`], ["probetest", "Probetest"]];
    const tabs = h("div", { class: "ed-tabs", role: "tablist" }, reiter.map(([id, text]) =>
      h("button", { type: "button", role: "tab", class: "ed-tab" + (tab === id ? " aktiv" : ""), "aria-selected": String(tab === id),
        onclick: () => { tab = id; zeichnen(); window.scrollTo(0, 0); } }, text)));

    const oeffnenInput = h("input", { type: "file", accept: ".json,.js,application/json,text/javascript", hidden: true });
    oeffnenInput.addEventListener("change", async () => {
      const f = oeffnenInput.files[0]; if (!f) return;
      try { M = normalisieren(parseDatei(await f.text())); tab = "allgemein"; geaendert(); zeichnen(); }
      catch (e) { alert("Die Datei konnte nicht gelesen werden: " + e.message); }
      oeffnenInput.value = "";
    });

    const inhalt = { allgemein: reiterAllgemein, theorie: reiterTheorie, uebungen: reiterUebungen, probetest: reiterProbetest }[tab]();

    root.replaceChildren(h("div", { class: "editor stack" },
      h("div", { class: "row between" },
        h("h1", { style: "margin:0" }, "Editor"),
        knopf("← Zur App", () => {
          if (confirm("Editor verlassen? Dein Entwurf bleibt gespeichert, ist aber noch nicht in der App übernommen.")) { entwurfSichern(); zurueck(); }
        }, { klasse: "btn-ghost" })),
      h("div", { class: "ed-leiste" },
        knopf("✓ In App übernehmen", uebernehmen, { klasse: "btn-primary" }),
        knopf("Prüfen", () => { if (pruefenUndMelden()) { statusZeile.textContent = "Alles in Ordnung – keine Fehler gefunden."; statusZeile.className = "ed-status ok"; } }),
        knopf("thema.js herunterladen", () => { if (pruefenUndMelden()) herunterladen(alsThemaJs(), "thema.js", "text/javascript"); }),
        knopf("JSON herunterladen", () => { if (pruefenUndMelden()) herunterladen(JSON.stringify(sauber(), null, 2), "lernmaterial.json", "application/json"); }),
        h("label", { class: "btn" }, "Datei öffnen …", oeffnenInput),
        knopf("Neues leeres Thema", () => {
          if (!confirm("Ein leeres Thema beginnen? Das aktuelle Material im Editor wird ersetzt (das Material in der App bleibt, bis du übernimmst).")) return;
          M = leeresMaterial(); tab = "allgemein"; geaendert(); zeichnen();
        })),
      statusZeile,
      fehlerBox,
      tabs,
      h("div", { class: "stack", role: "tabpanel" }, inhalt)));
    window.scrollTo(0, scrollY);
  }

  window.LernEditor = { oeffnen, version: "7" };
})();
