// KI-Import für den Editor: Material (PDF, Bilder, Word, Text) hochladen, die KI erstellt
// Theorie, Übungen und Probetest im Format von inhalt/thema.js.
// Die KI läuft über den Lernwerkstatt-Server (Vercel). Der API-Schlüssel bleibt dort, hier braucht es nur den Klassencode.
(() => {
  "use strict";
  const { h, speicher, parseDatei } = window.Lernapp;
  const K_KI = "lernapp.ki";
  const STANDARD_SERVER = "https://lernwerkstatt-pi.vercel.app";

  const einst = Object.assign({ server: STANDARD_SERVER, code: "", modell: "" }, speicher.lesen(K_KI, {}));
  const sichernEinst = () => speicher.schreiben(K_KI, einst);
  const serverUrl = () => String(einst.server || STANDARD_SERVER).trim().replace(/\/+$/, "");

  // Zustand bleibt erhalten, wenn der Editor neu zeichnet
  const Z = { dateien: [], text: "", wunsch: "", modus: "ersetzen", uebungen: 6, punkte: 15, minuten: 15, status: null, laeuft: false, meldung: "", fehler: "", abbruch: null };

  // ---------- Dateien lesen ----------
  const groesse = (n) => n < 1024 * 1024 ? Math.round(n / 1024) + " KB" : (n / 1024 / 1024).toFixed(1).replace(".", ",") + " MB";

  function base64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  // Bilder verkleinern (lange Seite höchstens 1600 px), als JPEG – spart Platz und Kosten
  function bildLesen(datei) {
    return new Promise((ok, nein) => {
      const img = new Image();
      img.onload = () => {
        const f = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
        const g = c.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        ok(c.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.onerror = () => nein(new Error("Das Bild konnte nicht gelesen werden."));
      img.src = URL.createObjectURL(datei);
    });
  }

  // Word (.docx) ist ein ZIP-Archiv. Wir lesen nur word/document.xml und holen den Text heraus.
  async function zipDatei(buf, gesucht) {
    const d = new DataView(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (d.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("Die Word-Datei ist beschädigt.");
    let p = d.getUint32(eocd + 16, true);
    const anzahl = d.getUint16(eocd + 10, true);
    for (let n = 0; n < anzahl; n++) {
      if (d.getUint32(p, true) !== 0x02014b50) break;
      const methode = d.getUint16(p + 10, true), komprimiert = d.getUint32(p + 20, true);
      const nl = d.getUint16(p + 28, true), xl = d.getUint16(p + 30, true), kl = d.getUint16(p + 32, true), lokal = d.getUint32(p + 42, true);
      const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nl));
      if (name === gesucht) {
        const start = lokal + 30 + d.getUint16(lokal + 26, true) + d.getUint16(lokal + 28, true);
        const roh = new Uint8Array(buf, start, komprimiert);
        if (methode === 0) return new TextDecoder().decode(roh);
        if (methode !== 8 || typeof DecompressionStream === "undefined") throw new Error("Dieser Browser kann die Word-Datei nicht entpacken.");
        const strom = new Blob([roh]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return await new Response(strom).text();
      }
      p += 46 + nl + xl + kl;
    }
    throw new Error("In der Word-Datei wurde kein Text gefunden.");
  }

  async function wordLesen(datei) {
    const xml = await zipDatei(await datei.arrayBuffer(), "word/document.xml");
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const zeilen = [];
    const absatz = (p) => {
      let t = "";
      p.querySelectorAll("*").forEach(e => {
        if (e.namespaceURI !== W) return;
        if (e.localName === "t") t += e.textContent;
        else if (e.localName === "tab") t += "\t";
        else if (e.localName === "br") t += "\n";
      });
      return t;
    };
    const koerper = doc.getElementsByTagNameNS(W, "body")[0];
    if (!koerper) throw new Error("In der Word-Datei wurde kein Text gefunden.");
    for (const el of koerper.children) {
      if (el.localName === "p") zeilen.push(absatz(el));
      else if (el.localName === "tbl") {
        for (const tr of el.getElementsByTagNameNS(W, "tr")) {
          zeilen.push([...tr.getElementsByTagNameNS(W, "tc")].map(tc => [...tc.getElementsByTagNameNS(W, "p")].map(absatz).join(" ").trim()).join(" | "));
        }
        zeilen.push("");
      }
    }
    const text = zeilen.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) throw new Error("In der Word-Datei wurde kein Text gefunden.");
    return text;
  }

  // Jede Datei wird zu einem Baustein der Anfrage an die KI
  async function baustein(datei) {
    const name = datei.name, typ = datei.type, endung = (name.split(".").pop() || "").toLowerCase();
    if (typ === "application/pdf" || endung === "pdf") {
      return { name, art: "PDF", block: { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64(new Uint8Array(await datei.arrayBuffer())) }, title: name } };
    }
    if (typ.startsWith("image/")) {
      return { name, art: "Bild", block: { type: "image", source: { type: "base64", media_type: "image/jpeg", data: await bildLesen(datei) } } };
    }
    if (endung === "docx") {
      return { name, art: "Word", block: { type: "text", text: `Material aus der Word-Datei «${name}»:\n\n${await wordLesen(datei)}` } };
    }
    if (endung === "doc") throw new Error(`«${name}» ist eine alte Word-Datei (.doc). Bitte in Word als .docx oder als PDF speichern.`);
    if (typ.startsWith("text/") || ["txt", "md", "csv"].includes(endung)) {
      return { name, art: "Text", block: { type: "text", text: `Material aus der Datei «${name}»:\n\n${await datei.text()}` } };
    }
    throw new Error(`«${name}» wird nicht unterstützt. Möglich sind PDF, Bilder (JPG, PNG), Word (.docx) und Textdateien.`);
  }

  // ---------- Server ----------
  async function statusLaden() {
    try {
      const r = await fetch(serverUrl() + "/api/status", { cache: "no-store" });
      if (!r.ok) throw new Error();
      Z.status = await r.json();
      const liste = Z.status.modelle || [];
      // Standard: Sonnet (schnell und gründlich genug), sonst das erste freigegebene Modell
      if (!einst.modell || !liste.includes(einst.modell)) einst.modell = liste.find(m => /sonnet/.test(m)) || liste[0] || "";
    } catch { Z.status = { fehler: true }; }
  }

  // Zufällige Gerätekennung für das Stundenlimit des Servers (kein Name)
  function geraet() {
    let g = speicher.lesen("lernapp.geraet", "");
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(g)) { g = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join(""); speicher.schreiben("lernapp.geraet", g); }
    return g;
  }

  // ---------- Auftrag an die KI ----------
  function auftrag(M) {
    const hinzu = Z.modus === "hinzufuegen";
    return `Du erstellst Lernmaterial für eine Lern-App der Sekundarschule (Schweiz, Lehrplan 21).
Fach: ${M.fach || "(aus dem Material ableiten)"} · Stufe: ${M.stufe || "(aus dem Material ableiten)"}
${hinzu ? `Das Thema «${M.titel}» besteht schon mit den Kapiteln: ${M.kapitel.map(k => k.titel).join(", ")}. Erstelle NUR ZUSÄTZLICHE Kapitel zum neuen Material, ohne Wiederholungen.` : "Erstelle ein vollständiges Thema aus dem Material oben."}

Grundsätze:
- Nur Inhalte, die im Material stehen oder direkt daraus folgen. Nichts erfinden. Wo das Material knapp ist, lieber weniger Karten und Fragen.
- Einfache, klare Sprache für Jugendliche der genannten Stufe. Kurze Sätze. Fachbegriffe erklären.
- Schweizer Rechtschreibung: «ss» statt «ß», Anführungszeichen «…».
- Falsche Antwortmöglichkeiten müssen plausibel sein und typische Fehlvorstellungen treffen, aber eindeutig falsch.
- Die richtige Antwort steht nicht immer an derselben Stelle.

Aufbau:
- 2 bis 5 Kapitel, je 3 bis 7 Lernkarten. Jede Karte: «titel», «text» (2 bis 5 Sätze), «merksatz» (ein kurzer Satz).
- Jedes Kapitel: «id» (kurz, nur Kleinbuchstaben und Bindestrich), «titel», «icon» (ein passendes Emoji).
- Übungen: etwa ${Z.uebungen} pro Kapitel. Gemischt aus den Typen auswahl, mehrfach, zuordnen und höchstens einer offenen Frage pro Kapitel. Jede Übung mit «kapitel» (die id) und «erklaerung» (1 bis 2 Sätze, warum die Lösung stimmt; bei offenen Fragen stattdessen «musterloesung» und «punkte»).
${hinzu ? "- Keinen Probetest erstellen (das Feld «probetest» weglassen)." : `- Probetest wie ein echter Test: insgesamt genau ${Z.punkte} Punkte, gedacht für ${Z.minuten} Minuten. Fragen mit «punkte» und «abschnitt» (z. B. «Aufgabe 1 · Kapitelname»). Auch offene Fragen mit «musterloesung». Andere Fragen als in den Übungen. Kein Notenschlüssel.`}
${Z.wunsch.trim() ? `\nWunsch der Lehrperson: ${Z.wunsch.trim()}\n` : ""}
Fragetypen (genau so):
- {"typ":"auswahl","frage":"…","optionen":["…","…","…","…"],"richtig":0}   (richtig = Index ab 0)
- {"typ":"mehrfach","frage":"… (mehrere Antworten möglich)","optionen":["…","…","…","…"],"richtig":[0,2]}
- {"typ":"zuordnen","frage":"Ordne zu.","paare":[{"links":"…","rechts":"…"},{"links":"…","rechts":"…"},{"links":"…","rechts":"…"}]}   (3 bis 5 Paare, alle rechten Seiten verschieden)
- {"typ":"offen","frage":"…","musterloesung":"…","punkte":1}

Antworte NUR mit einem JSON-Objekt, ohne Text davor oder danach, in dieser Form:
{"titel":"…","fach":"…","stufe":"…","kapitel":[{"id":"…","titel":"…","icon":"…","karten":[{"titel":"…","text":"…","merksatz":"…"}]}],"uebungen":[{"kapitel":"…","typ":"…","frage":"…", …}]${hinzu ? "" : ',"probetest":{"titel":"Probetest: …","minuten":' + Z.minuten + ',"hinweis":"…","fragen":[{"abschnitt":"…","typ":"…","punkte":1,"frage":"…", …}]}'}}`;
  }

  // Server-Sent Events lesen und den Text zusammensetzen
  async function streamLesen(antwort, fortschritt) {
    const leser = antwort.body.getReader(), dec = new TextDecoder();
    let puffer = "", text = "", stopp = "";
    for (;;) {
      const { value, done } = await leser.read();
      if (done) break;
      puffer += dec.decode(value, { stream: true });
      let i;
      while ((i = puffer.indexOf("\n\n")) >= 0) {
        const block = puffer.slice(0, i); puffer = puffer.slice(i + 2);
        const daten = block.split("\n").filter(z => z.startsWith("data:")).map(z => z.slice(5).trim()).join("");
        if (!daten) continue;
        let e; try { e = JSON.parse(daten); } catch { continue; }
        if (e.type === "content_block_delta" && e.delta && e.delta.type === "text_delta") { text += e.delta.text; fortschritt(text.length); }
        else if (e.type === "message_delta" && e.delta && e.delta.stop_reason) stopp = e.delta.stop_reason;
        else if (e.type === "error") throw new Error((e.error && e.error.message) || "Fehler beim KI-Dienst.");
      }
    }
    return { text, stopp };
  }

  // KI-Antwort aufräumen, damit sie zum Editor passt
  function aufraeumen(neu, M) {
    const vorhanden = new Set(Z.modus === "hinzufuegen" ? M.kapitel.map(k => k.id) : []);
    const ids = new Map();
    (neu.kapitel || []).forEach((k, i) => {
      let id = String(k.id || k.titel || "kapitel-" + (i + 1)).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "kapitel-" + (i + 1);
      while (vorhanden.has(id)) id += "-2";
      vorhanden.add(id); ids.set(k.id, id); k.id = id;
      k.karten = Array.isArray(k.karten) ? k.karten : [];
    });
    const putzFrage = (f) => {
      if (f.typ === "auswahl") f.richtig = Number(f.richtig);
      if (f.typ === "mehrfach") f.richtig = (Array.isArray(f.richtig) ? f.richtig : [f.richtig]).map(Number);
      if (f.typ === "offen") f.punkte = Number(f.punkte) || 1;
      if (f.punkte !== undefined) f.punkte = Number(f.punkte) || 1;
      return f;
    };
    neu.uebungen = (neu.uebungen || []).map(f => { f.kapitel = ids.get(f.kapitel) || f.kapitel; return putzFrage(f); });
    if (neu.probetest) {
      neu.probetest.fragen = (neu.probetest.fragen || []).map(putzFrage);
      neu.probetest.minuten = Number(neu.probetest.minuten) || Z.minuten;
      delete neu.probetest.notenschluessel; // Formel der App gilt
    }
    return neu;
  }

  async function erstellen(M, uebernehmen, neuZeichnen) {
    if (Z.laeuft) return;
    Z.fehler = ""; Z.meldung = "";
    if (!Z.dateien.length && !Z.text.trim()) { Z.fehler = "Lade zuerst Material hoch oder füge Text ein."; return neuZeichnen(); }
    if (Z.status && Z.status.codeNoetig && !einst.code.trim()) { Z.fehler = "Trag zuerst den Klassencode ein (wie in der Lernwerkstatt)."; return neuZeichnen(); }
    if (Z.modus === "ersetzen" && !confirm("Die KI erstellt ein neues Thema. Theorie, Übungen und Probetest im Editor werden ersetzt (Maskottchen und Spiel-Einstellungen bleiben). Weiter?")) return;

    Z.laeuft = true; Z.meldung = "Material wird vorbereitet …"; neuZeichnen();
    const ctrl = new AbortController(); Z.abbruch = ctrl;
    try {
      const bausteine = [];
      for (const d of Z.dateien) { Z.meldung = `Lese «${d.name}» …`; neuZeichnen(); bausteine.push((await baustein(d)).block); }
      if (Z.text.trim()) bausteine.push({ type: "text", text: "Material (eingefügter Text):\n\n" + Z.text.trim() });
      bausteine.push({ type: "text", text: auftrag(M) });

      const body = JSON.stringify({ model: einst.modell || "claude-sonnet-5-5", max_tokens: 32000, stream: true, messages: [{ role: "user", content: bausteine }] });
      const max = (Z.status && Z.status.maxAnfrage) || 4_300_000;
      if (body.length > max) throw new Error(`Das Material ist zu gross für den Server (${groesse(body.length)}, erlaubt sind etwa ${groesse(max)}). Lade weniger oder kleinere Dateien hoch, z. B. nur die wichtigen Seiten als PDF.`);

      Z.meldung = "Die KI liest das Material und erstellt die Aufgaben. Das dauert meist 1 bis 3 Minuten …"; neuZeichnen();
      const kopf = { "content-type": "application/json", "anthropic-version": "2023-06-01", "x-geraet": geraet() };
      if (einst.code.trim()) kopf["x-klassen-code"] = einst.code.trim();
      const antwort = await fetch(serverUrl() + "/api/anthropic/v1/messages", { method: "POST", headers: kopf, body, signal: ctrl.signal });
      if (!antwort.ok) {
        let text = ""; try { text = (await antwort.json()).error.message; } catch { /* kein JSON */ }
        if (antwort.status === 401) text = "Der Klassencode ist falsch.";
        throw new Error(text || `Der Server meldet Fehler ${antwort.status}.`);
      }
      const { text, stopp } = await streamLesen(antwort, n => {
        const el = document.getElementById("ki-fortschritt");
        if (el) el.textContent = `${n.toLocaleString("de-CH")} Zeichen erhalten`;
      });
      if (stopp === "max_tokens") throw new Error("Die Antwort wurde zu lang und ist abgeschnitten. Versuche es mit weniger Material oder weniger Übungen pro Kapitel.");
      let neu;
      try { neu = parseDatei(text); } catch { throw new Error("Die KI hat kein gültiges Material geliefert. Bitte nochmals versuchen."); }
      neu = aufraeumen(neu, M);
      const probleme = uebernehmen(neu, Z.modus);
      Z.meldung = probleme
        ? `Fertig. Die KI-Fassung ist im Editor, ${probleme} ${probleme === 1 ? "Stelle braucht" : "Stellen brauchen"} noch eine Korrektur (siehe «Prüfen»).`
        : "Fertig. Die KI-Fassung ist im Editor. Bitte Theorie, Übungen und Probetest durchsehen, dann «In App übernehmen».";
      Z.dateien = []; Z.text = "";
    } catch (e) {
      Z.fehler = e.name === "AbortError" ? "Abgebrochen." : (e.message === "Failed to fetch" ? "Der Server ist nicht erreichbar. Stimmt die Server-Adresse, und ist das Gerät online?" : e.message);
      Z.meldung = "";
    } finally {
      Z.laeuft = false; Z.abbruch = null; neuZeichnen();
    }
  }

  // ---------- Oberfläche (Reiter im Editor) ----------
  function reiter({ M, uebernehmen, neuZeichnen }) {
    if (!Z.status) statusLaden().then(neuZeichnen);
    const s = Z.status || {};

    const eingabe = h("input", { type: "file", multiple: true, hidden: true, accept: ".pdf,.docx,.doc,.txt,.md,.csv,image/*,application/pdf" });
    eingabe.addEventListener("change", () => { Z.dateien.push(...eingabe.files); eingabe.value = ""; Z.fehler = ""; neuZeichnen(); });
    const zone = h("div", { class: "ki-zone" },
      h("p", {}, h("strong", {}, "Material hierher ziehen"), " oder"),
      h("p", {}, h("label", { class: "btn" }, "Dateien wählen …", eingabe)),
      h("small", { class: "muted" }, "PDF, Bilder (z. B. Fotos von Arbeitsblättern), Word (.docx) oder Text. Mehrere Dateien sind möglich."));
    zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("ueber"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("ueber"));
    zone.addEventListener("drop", e => { e.preventDefault(); zone.classList.remove("ueber"); Z.dateien.push(...e.dataTransfer.files); Z.fehler = ""; neuZeichnen(); });

    const liste = Z.dateien.length ? h("ul", { class: "ki-liste" }, Z.dateien.map((d, i) =>
      h("li", {}, h("span", {}, `${d.name} · ${groesse(d.size)}`),
        h("button", { type: "button", class: "btn btn-ghost", "aria-label": `${d.name} entfernen`, onclick: () => { Z.dateien.splice(i, 1); neuZeichnen(); } }, "✕")))) : null;

    const textfeld = h("textarea", { rows: 4, id: "ki-text", placeholder: "Optional: Text direkt einfügen (z. B. aus einem Dokument kopiert)" });
    textfeld.value = Z.text; textfeld.addEventListener("input", () => { Z.text = textfeld.value; });
    const wunsch = h("textarea", { rows: 2, id: "ki-wunsch", placeholder: "Optional, z. B. «Schwerpunkt auf Fachbegriffen», «einfache Sprache», «mehr Zuordnungsaufgaben»" });
    wunsch.value = Z.wunsch; wunsch.addEventListener("input", () => { Z.wunsch = wunsch.value; });

    const zahl = (label, key, min, max) => {
      const el = h("input", { type: "number", min, max, step: 1, id: "ki-" + key });
      el.value = Z[key]; el.addEventListener("input", () => { Z[key] = Math.max(min, Math.min(max, Number(el.value) || min)); });
      return h("div", { class: "ed-feld" }, h("label", { for: "ki-" + key }, label), el);
    };
    const radio = (wert, text) => {
      const el = h("input", { type: "radio", name: "ki-modus", value: wert });
      el.checked = Z.modus === wert; el.addEventListener("change", () => { Z.modus = wert; neuZeichnen(); });
      return h("label", { class: "ed-check" }, el, " ", text);
    };

    const codeFeld = h("input", { type: "password", id: "ki-code", autocomplete: "off", placeholder: "Klassencode der Lernwerkstatt" });
    codeFeld.value = einst.code; codeFeld.addEventListener("change", () => { einst.code = codeFeld.value.trim(); sichernEinst(); });
    const serverFeld = h("input", { type: "url", id: "ki-server" });
    serverFeld.value = serverUrl(); serverFeld.addEventListener("change", () => { einst.server = serverFeld.value.trim() || STANDARD_SERVER; sichernEinst(); Z.status = null; neuZeichnen(); });
    const modellWahl = h("select", { id: "ki-modell" }, (s.modelle || []).map(m => h("option", { value: m }, m)));
    modellWahl.value = einst.modell; modellWahl.addEventListener("change", () => { einst.modell = modellWahl.value; sichernEinst(); });

    const serverInfo = !Z.status ? "Verbindung zum Server wird geprüft …"
      : s.fehler ? "⚠️ Server nicht erreichbar. Prüfe die Adresse unten."
      : !s.serverKi ? "⚠️ Auf dem Server ist die KI nicht eingerichtet."
      : "✓ Server erreichbar, KI bereit.";

    return [
      h("section", { class: "card stack" },
        h("h2", {}, "✨ Aus Material erstellen"),
        h("p", {}, "Lade dein Unterrichtsmaterial hoch. Die KI erstellt daraus Lernkarten, Übungen und einen Probetest. Danach kannst du alles in den anderen Reitern anpassen."),
        zone, liste,
        h("div", { class: "ed-feld" }, h("label", { for: "ki-text" }, "Text einfügen"), textfeld)),
      h("section", { class: "card stack" },
        h("h2", {}, "Einstellungen"),
        h("fieldset", { class: "ed-spiele" }, h("legend", {}, "Was soll passieren?"),
          radio("ersetzen", "Neues Thema erstellen (ersetzt Theorie, Übungen und Probetest)"),
          radio("hinzufuegen", `Neue Kapitel zum Thema «${M.titel || "ohne Titel"}» hinzufügen`)),
        h("div", { class: "ed-zwei" },
          zahl("Übungen pro Kapitel", "uebungen", 3, 12),
          Z.modus === "ersetzen" ? zahl("Punkte im Probetest", "punkte", 5, 40) : null,
          Z.modus === "ersetzen" ? zahl("Minuten für den Probetest", "minuten", 5, 90) : null),
        h("div", { class: "ed-feld" }, h("label", { for: "ki-wunsch" }, "Wünsche an die KI"), wunsch),
        h("p", { class: "muted" }, "Fach und Stufe kommen aus dem Reiter «Allgemein»: ", h("strong", {}, `${M.fach || "–"} · ${M.stufe || "–"}`))),
      h("section", { class: "card stack" },
        h("h2", {}, "KI-Zugang"),
        h("p", { class: s.fehler || (Z.status && !s.serverKi) ? "" : "muted" }, serverInfo),
        h("div", { class: "ed-zwei" },
          h("div", { class: "ed-feld" }, h("label", { for: "ki-code" }, "Klassencode"), codeFeld, h("small", { class: "muted" }, "Derselbe Code wie in der Lernwerkstatt. Er bleibt nur auf diesem Gerät gespeichert.")),
          (s.modelle || []).length ? h("div", { class: "ed-feld" }, h("label", { for: "ki-modell" }, "Modell"), modellWahl, h("small", { class: "muted" }, "Sonnet ist schnell und genügt meist. Opus ist gründlicher, aber langsamer und teurer.")) : null),
        h("details", {}, h("summary", {}, "Server-Adresse"),
          h("div", { class: "ed-feld" }, h("label", { for: "ki-server" }, "Adresse des Lernwerkstatt-Servers"), serverFeld)),
        h("p", { class: "muted" }, "Datenschutz: Das Material wird an Anthropic (USA) geschickt. Keine Namen oder anderen Personendaten von Schülerinnen und Schülern hochladen.")),
      h("div", { class: "row" },
        h("button", { type: "button", class: "btn btn-primary", disabled: Z.laeuft, onclick: () => erstellen(M, uebernehmen, neuZeichnen) }, Z.laeuft ? "KI arbeitet …" : "✨ Mit KI erstellen"),
        Z.laeuft ? h("button", { type: "button", class: "btn", onclick: () => Z.abbruch && Z.abbruch.abort() }, "Abbrechen") : null),
      Z.laeuft || Z.meldung ? h("p", { class: "ed-status" + (Z.laeuft ? "" : " ok"), role: "status" }, Z.meldung, Z.laeuft ? h("span", { id: "ki-fortschritt", class: "muted" }, "") : null) : null,
      Z.fehler ? h("div", { class: "hinweis-box", role: "alert" }, Z.fehler) : null
    ];
  }

  window.KiImport = { reiter, _test: { wordLesen, zipDatei, auftrag } };
})();
