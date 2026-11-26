// Mini-Spiele für die Lernapp. Alle Geschicklichkeitsspiele laufen auf dem gleichen Grundgerüst:
// Spielfeld (Canvas), Eingabe, Countdown, Anzeige (Punkte, Leben, Zeit) und Ende nach Zeit oder ohne Leben.
//   flug     – Globi-Flug: gedrückt halten = steigen, Pakete sammeln, Viren ausweichen
//   faenger  – Bewertungs-Fänger: echte Bewertungen (Sterne) fangen, gefälschte meiden
//   jagd     – Viren-Jagd: Viren auf den Bildschirmen antippen, Datenpakete nicht
(() => {
  "use strict";

  let aktiv = null; // laufendes Spiel (zum Abbrechen)
  function stopp() { if (aktiv) aktiv.beenden(true); }

  function ladeBild(src) {
    return new Promise((resolve) => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // ---------- Zeichen-Hilfen, die mehrere Spiele nutzen ----------
  function zeichneVirus(ctx, x, y, r, drehung) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(drehung || 0);
    ctx.fillStyle = "#c62828";
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15, r * 0.22, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = "#e53935"; ctx.fill();
    ctx.fillStyle = "#ffcdd2";
    ctx.beginPath(); ctx.arc(-r * .35, -r * .2, r * .2, 0, Math.PI * 2); ctx.arc(r * .35, -r * .2, r * .2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function zeichnePaket(ctx, x, y, gr) {
    const w = 26 * gr, hh = 22 * gr;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#f5b83d"; ctx.strokeStyle = "#b9850f"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(-w / 2, -hh / 2, w, hh); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3b2a05"; ctx.font = `bold ${Math.round(11 * gr)}px system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("01", 0, 1);
    ctx.restore();
  }
  function zeichneStern(ctx, x, y, r, drehung) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(drehung || 0);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = "#ffd54f"; ctx.fill(); ctx.strokeStyle = "#c79a00"; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  function zeichneFake(ctx, x, y, gr) {
    const w = 52 * gr, hh = 30 * gr;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.08);
    ctx.fillStyle = "#d32f2f"; ctx.strokeStyle = "#7f0000"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(-w / 2, -hh / 2, w, hh); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(14 * gr)}px system-ui, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("FAKE", 0, 1);
    ctx.restore();
  }

  // ---------- Grundgerüst ----------
  // opt: { sekunden, leben, bild, titel, einheit, anleitung: [Zeilen] }
  // erstelle(env) -> { update(dt), zeichne() }
  function starte(container, opt, erstelle) {
    stopp();
    const { sekunden = 30, leben = 3, bild = "", begleiter = "", titel = "Spiel", einheit = "Punkte", anleitung = [] } = opt;
    return new Promise(async (fertig) => {
      const canvas = document.createElement("canvas");
      canvas.className = "spiel-canvas";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `Spielfeld ${titel}. ${anleitung.join(". ")}`);
      canvas.tabIndex = 0;
      container.replaceChildren(canvas);
      const ctx = canvas.getContext("2d");

      // Spielfläche passt sich an: breit auf Computer/Tablet, hoch auf dem Handy
      const breite = container.clientWidth || 600;
      const B = Math.round(Math.max(320, Math.min(600, breite)));
      const H = B < 560 ? Math.round(B * 1.25) : Math.round(B * 2 / 3);
      canvas.style.aspectRatio = `${B} / ${H}`;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = B * dpr; canvas.height = H * dpr;
      ctx.scale(dpr, dpr);

      const figur = await ladeBild(bild);
      const figurH = 72;
      const figurB = figur ? figurH * (figur.naturalWidth / figur.naturalHeight) : 48;
      const hund = await ladeBild(begleiter);
      const hundH = 44;
      const hundB = hund ? hundH * (hund.naturalWidth / hund.naturalHeight) : 0;

      const s = { zeit: 0, rest: sekunden, punkte: 0, leben, unverwundbar: 0, countdown: 3, funken: [], blitz: 0, vorbei: false };

      // Eingabe: gedrückt halten, Zeigerposition, Klicks, Tasten
      const e = { halten: false, zeigerX: null, zeigerY: null, klicks: [], tasten: new Set() };
      const welt = (ev) => {
        const r = canvas.getBoundingClientRect();
        return { x: (ev.clientX - r.left) * B / r.width, y: (ev.clientY - r.top) * H / r.height };
      };
      const down = (ev) => {
        ev.preventDefault();
        e.halten = true;
        const p = welt(ev); e.zeigerX = p.x; e.zeigerY = p.y;
        if (s.countdown <= 0) e.klicks.push(p);
      };
      const move = (ev) => {
        if (ev.pointerType === "mouse" || e.halten) { const p = welt(ev); e.zeigerX = p.x; e.zeigerY = p.y; }
      };
      const up = () => { e.halten = false; };
      const spielTasten = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyD"];
      const keyDown = (ev) => {
        const ziffer = /^Digit[1-9]$|^Numpad[1-9]$/.test(ev.code);
        if (!spielTasten.includes(ev.code) && !ziffer) return;
        ev.preventDefault();
        if (ev.code === "Space" || ev.code === "ArrowUp" || ev.code === "KeyW") e.halten = true;
        if (ziffer && !ev.repeat && s.countdown <= 0) e.klicks.push({ taste: Number(ev.code.slice(-1)) });
        e.tasten.add(ev.code);
        if (ev.code.startsWith("Arrow") || ev.code === "KeyA" || ev.code === "KeyD") e.zeigerX = null; // Tastatur übernimmt
      };
      const keyUp = (ev) => {
        e.tasten.delete(ev.code);
        if (ev.code === "Space" || ev.code === "ArrowUp" || ev.code === "KeyW") e.halten = false;
      };
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);
      window.addEventListener("keydown", keyDown);
      window.addEventListener("keyup", keyUp);
      canvas.focus({ preventScroll: true });

      let rafId = 0, letzte = 0;
      aktiv = {
        beenden(abbruch) {
          if (s.vorbei) return;
          s.vorbei = true;
          cancelAnimationFrame(rafId);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("keydown", keyDown);
          window.removeEventListener("keyup", keyUp);
          aktiv = null;
          fertig({ punkte: s.punkte, leben: s.leben, zeitUm: s.rest <= 0, abgebrochen: !!abbruch });
        }
      };

      const env = {
        ctx, B, H, s, e, figur, figurB, figurH, hund, hundB, hundH,
        massstab: Math.max(0.75, B / 600),
        funken(x, y, farbe, n = 8, kraft = 240) {
          for (let i = 0; i < n; i++) s.funken.push({ x, y, vx: (Math.random() - .5) * kraft, vy: (Math.random() - .5) * kraft, t: .45, farbe });
        },
        treffer(x, y, dauer = 1.5) {
          if (s.unverwundbar > 0) return false;
          s.leben--; s.unverwundbar = dauer; s.blitz = 0.25;
          env.funken(x, y, "#ef5350", 12, 300);
          return true;
        },
        zeichneFigur(x, y, drehung = 0) {
          if (s.unverwundbar > 0 && Math.floor(s.unverwundbar * 10) % 2 === 0) return; // blinken nach Treffer
          ctx.save(); ctx.translate(x, y);
          const schein = ctx.createRadialGradient(0, 0, 4, 0, 0, figurH * 0.75);
          schein.addColorStop(0, "rgba(255, 240, 190, .55)"); schein.addColorStop(1, "rgba(255, 240, 190, 0)");
          ctx.fillStyle = schein; ctx.beginPath(); ctx.arc(0, 0, figurH * 0.75, 0, Math.PI * 2); ctx.fill();
          ctx.rotate(drehung);
          if (figur) ctx.drawImage(figur, -figurB / 2, -figurH / 2, figurB, figurH);
          else {
            ctx.fillStyle = "#f5b83d"; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-7, -5, 6, 0, Math.PI * 2); ctx.arc(9, -5, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#1c2233"; ctx.beginPath(); ctx.arc(-6, -4, 3, 0, Math.PI * 2); ctx.arc(10, -4, 3, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        },
        zeichneHund(x, y, drehung = 0, spiegeln = false) {
          if (!hund) return;
          ctx.save(); ctx.translate(x, y); ctx.rotate(drehung);
          if (spiegeln) ctx.scale(-1, 1);
          ctx.drawImage(hund, -hundB / 2, -hundH / 2, hundB, hundH);
          ctx.restore();
        }
      };
      const spiel = erstelle(env);

      function zeichneRahmen() {
        for (const f of s.funken) { ctx.globalAlpha = Math.max(0, f.t * 2); ctx.fillStyle = f.farbe; ctx.fillRect(f.x - 2, f.y - 2, 4, 4); }
        ctx.globalAlpha = 1;
        if (s.blitz > 0) { ctx.fillStyle = `rgba(229, 57, 53, ${s.blitz})`; ctx.fillRect(0, 0, B, H); }
        // Anzeige oben
        ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(0, 0, B, 34);
        ctx.font = "bold 17px system-ui, sans-serif"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#f5b83d"; ctx.textAlign = "left"; ctx.fillText(`${einheit}: ${s.punkte}`, 12, 18);
        ctx.textAlign = "center"; ctx.fillStyle = "#ff8a80";
        ctx.fillText("♥".repeat(Math.max(0, s.leben)) + "♡".repeat(Math.max(0, leben - s.leben)), B / 2 + (B < 400 ? 20 : 0), 18);
        ctx.textAlign = "right"; ctx.fillStyle = s.rest <= 5 ? "#ff8a80" : "#ffffff";
        ctx.fillText(`${Math.ceil(s.rest)} s`, B - 12, 18);
        if (s.countdown > 0) {
          ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(0, 34, B, H - 34);
          ctx.fillStyle = "#fff"; ctx.textAlign = "center";
          ctx.font = "bold 64px system-ui, sans-serif"; ctx.fillText(String(Math.ceil(s.countdown)), B / 2, H / 2 - 30);
          ctx.font = `${B < 450 ? 15 : 18}px system-ui, sans-serif`;
          anleitung.forEach((z, i) => ctx.fillText(z, B / 2, H / 2 + 30 + i * 25));
        }
      }

      function schleife(t) {
        if (s.vorbei) return;
        if (!canvas.isConnected) { aktiv && aktiv.beenden(true); return; }
        const dt = letzte ? Math.min(0.05, (t - letzte) / 1000) : 0;
        letzte = t;
        if (s.countdown > 0) s.countdown -= dt;
        else {
          s.zeit += dt; s.rest = Math.max(0, sekunden - s.zeit);
          if (s.unverwundbar > 0) s.unverwundbar -= dt;
          if (s.blitz > 0) s.blitz = Math.max(0, s.blitz - dt);
          for (const f of s.funken) { f.x += f.vx * dt; f.y += f.vy * dt; f.t -= dt; }
          s.funken = s.funken.filter(f => f.t > 0);
          spiel.update(dt);
          e.klicks.length = 0;
        }
        spiel.zeichne();
        zeichneRahmen();
        if (s.leben <= 0 || s.rest <= 0) { aktiv && aktiv.beenden(false); return; }
        rafId = requestAnimationFrame(schleife);
      }
      rafId = requestAnimationFrame(schleife);
    });
  }

  // ---------- Spiel 1: Globi-Flug ----------
  // Stufen: Leicht / Mittel (bisheriges Spiel) / Schwer
  const FLUG_STUFEN = {
    leicht: { start: 2.4, abstand: 2.2, abstandMin: 0.95, abbau: 0.025, tempo: 170, beschl: 3, rMin: 13, rVar: 8, welle: 0.3, schutz: 2.5 },
    mittel: { start: 1.8, abstand: 1.6, abstandMin: 0.6, abbau: 0.03, tempo: 200, beschl: 5, rMin: 16, rVar: 10, welle: 0.5, schutz: 2 },
    schwer: { start: 1.2, abstand: 1.15, abstandMin: 0.42, abbau: 0.03, tempo: 245, beschl: 7, rMin: 18, rVar: 11, welle: 0.75, schutz: 1.5 }
  };
  const FAENGER_STUFEN = {
    leicht: { fake: 0.18, fakeMax: 0.3, fakeAnstieg: 0.004, abstand: 0.8, abstandMin: 0.5, abbau: 0.008, fall: 105, beschl: 3 },
    mittel: { fake: 0.28, fakeMax: 0.45, fakeAnstieg: 0.006, abstand: 0.7, abstandMin: 0.35, abbau: 0.01, fall: 130, beschl: 5 },
    schwer: { fake: 0.38, fakeMax: 0.55, fakeAnstieg: 0.006, abstand: 0.55, abstandMin: 0.28, abbau: 0.01, fall: 170, beschl: 7 }
  };

  function flug(container, opt = {}) {
    const st = FLUG_STUFEN[opt.stufe] || FLUG_STUFEN.mittel;
    return starte(container, {
      ...opt, titel: "Globi-Flug", einheit: "Pakete",
      anleitung: ["Gedrückt halten = steigen", "Loslassen = sinken", "Pakete sammeln, Viren ausweichen!"]
    }, (env) => {
      const { ctx, B, H, s, e, figurB, figurH, massstab } = env;
      const SCHWERKRAFT = 950, SCHUB = 1900, MAX_V = 340;
      const X = Math.round(B * 0.18);
      const z = {
        y: H / 2, vy: 0, hundY: H / 2 + 20, viren: [], pakete: [], naechsterVirus: st.start, naechstesPaket: 0.4,
        knoten: Array.from({ length: 26 }, () => ({ x: Math.random() * B, y: Math.random() * H, r: 1.5 + Math.random() * 2, tiefe: 0.3 + Math.random() * 0.7 }))
      };
      return {
        update(dt) {
          const tempo = (st.tempo + s.zeit * st.beschl) * massstab;
          z.vy += (e.halten ? -SCHUB + SCHWERKRAFT : SCHWERKRAFT) * dt;
          z.vy = Math.max(-MAX_V, Math.min(MAX_V, z.vy));
          z.y += z.vy * dt;
          const rand = figurH / 2 + 6;
          if (z.y < rand + 34) { z.y = rand + 34; z.vy = 0; }
          if (z.y > H - rand) { z.y = H - rand; z.vy = 0; }
          z.hundY += (z.y + 18 - z.hundY) * Math.min(1, dt * 4); // Hund folgt mit Verzögerung

          z.naechsterVirus -= dt;
          if (z.naechsterVirus <= 0) {
            z.viren.push({ x: B + 40, y: 50 + Math.random() * (H - 90), r: st.rMin + Math.random() * st.rVar, phase: Math.random() * 6, welle: Math.random() < st.welle ? 25 + Math.random() * 30 : 0 });
            z.naechsterVirus = Math.max(st.abstandMin, st.abstand - s.zeit * st.abbau) * (0.75 + Math.random() * 0.5);
          }
          z.naechstesPaket -= dt;
          if (z.naechstesPaket <= 0) {
            z.pakete.push({ x: B + 30, y: 50 + Math.random() * (H - 85), w: 0 });
            z.naechstesPaket = 0.55 + Math.random() * 0.5;
          }
          for (const v of z.viren) { v.x -= tempo * dt; v.phase += dt * 3; }
          for (const p of z.pakete) { p.x -= tempo * dt; p.w += dt * 4; }
          for (const k of z.knoten) { k.x -= tempo * 0.25 * k.tiefe * dt; if (k.x < -10) { k.x = B + 10; k.y = Math.random() * H; } }

          const gr = Math.min(figurB, figurH) * 0.38;
          for (const p of z.pakete) {
            if (Math.hypot(p.x - X, p.y - z.y) < gr + 14) { p.weg = true; s.punkte++; env.funken(p.x, p.y, "#f5b83d", 6, 220); }
          }
          for (const v of z.viren) {
            const vy = v.y + Math.sin(v.phase) * v.welle;
            if (Math.hypot(v.x - X, vy - z.y) < gr + v.r * 0.85 && env.treffer(X, z.y, st.schutz)) { v.x = -100; break; }
          }
          z.viren = z.viren.filter(v => v.x > -50);
          z.pakete = z.pakete.filter(p => p.x > -40 && !p.weg);
        },
        zeichne() {
          const g = ctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, "#0d1838"); g.addColorStop(1, "#1a2f63");
          ctx.fillStyle = g; ctx.fillRect(0, 0, B, H);
          ctx.strokeStyle = "rgba(120, 170, 255, .12)"; ctx.lineWidth = 1;
          for (let i = 0; i < z.knoten.length; i++) for (let j = i + 1; j < z.knoten.length; j++) {
            const a = z.knoten[i], b = z.knoten[j];
            if (Math.abs(a.x - b.x) < 110 && Math.abs(a.y - b.y) < 110) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          }
          ctx.fillStyle = "rgba(150, 195, 255, .45)";
          for (const k of z.knoten) { ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2); ctx.fill(); }
          for (const p of z.pakete) zeichnePaket(ctx, p.x, p.y, 1 + Math.sin(p.w) * 0.08);
          for (const v of z.viren) zeichneVirus(ctx, v.x, v.y + Math.sin(v.phase) * v.welle, v.r, v.phase * 0.3);
          env.zeichneHund(X - figurB / 2 - env.hundB / 2 - 4, z.hundY + Math.sin(s.zeit * 8) * 3, Math.sin(s.zeit * 4) * 0.1);
          env.zeichneFigur(X, z.y, Math.max(-0.35, Math.min(0.35, z.vy / 900)));
          if (e.halten && s.countdown <= 0 && !(s.unverwundbar > 0 && Math.floor(s.unverwundbar * 10) % 2 === 0)) {
            ctx.fillStyle = "rgba(120, 200, 255, .8)";
            ctx.beginPath(); ctx.moveTo(X - figurB / 2 + 4, z.y + figurH / 2 - 10); ctx.lineTo(X - figurB / 2 - 14 - Math.random() * 8, z.y + figurH / 2 - 4); ctx.lineTo(X - figurB / 2 + 4, z.y + figurH / 2); ctx.fill();
          }
        }
      };
    });
  }

  // ---------- Spiel 2: Bewertungs-Fänger ----------
  function faenger(container, opt = {}) {
    const st = FAENGER_STUFEN[opt.stufe] || FAENGER_STUFEN.mittel;
    return starte(container, {
      ...opt, titel: "Bewertungs-Fänger", einheit: "Sterne",
      anleitung: ["Globi mit Maus, Finger oder ← → bewegen", "Echte Bewertungen (★) fangen", "«FAKE»-Bewertungen ausweichen!"]
    }, (env) => {
      const { ctx, B, H, s, e, figurB, figurH, massstab } = env;
      const Y = H - figurH / 2 - 8;
      const z = { x: B / 2, hundX: B / 2 - 60, hundRechts: true, dinge: [], naechstes: 0.3, hintergrund: Array.from({ length: 40 }, () => ({ x: Math.random() * B, y: Math.random() * H, r: Math.random() * 1.6 + .4 })) };
      return {
        update(dt) {
          // Bewegung: Zeiger (Maus/Finger) oder Tasten
          const tempo = 460 * massstab;
          if (e.tasten.has("ArrowLeft") || e.tasten.has("KeyA")) z.x -= tempo * dt;
          else if (e.tasten.has("ArrowRight") || e.tasten.has("KeyD")) z.x += tempo * dt;
          else if (e.zeigerX !== null) z.x += (e.zeigerX - z.x) * Math.min(1, dt * 14);
          z.x = Math.max(figurB / 2, Math.min(B - figurB / 2, z.x));
          // Hund bleibt an Globis Seite (links, ausser am linken Rand)
          const ziel = z.x - figurB / 2 - env.hundB / 2 > 0 ? z.x - figurB / 2 - env.hundB / 2 + 6 : z.x + figurB / 2 + env.hundB / 2 - 6;
          const alt = z.hundX;
          z.hundX += (ziel - z.hundX) * Math.min(1, dt * 6);
          if (Math.abs(z.hundX - alt) > 0.3) z.hundRechts = z.hundX > alt;

          z.naechstes -= dt;
          if (z.naechstes <= 0) {
            const fake = Math.random() < Math.min(st.fakeMax, st.fake + s.zeit * st.fakeAnstieg);
            z.dinge.push({ x: 30 + Math.random() * (B - 60), y: 20, vy: (st.fall + s.zeit * st.beschl + Math.random() * 60) * massstab, fake, dreh: Math.random() * 6 });
            z.naechstes = Math.max(st.abstandMin, st.abstand - s.zeit * st.abbau) * (0.7 + Math.random() * 0.6);
          }
          for (const d of z.dinge) { d.y += d.vy * dt; d.dreh += dt * 2; }
          const fangB = figurB * 0.5 + 16;
          for (const d of z.dinge) {
            if (d.y > Y - figurH * 0.45 && d.y < Y + figurH * 0.2 && Math.abs(d.x - z.x) < fangB) {
              d.weg = true;
              if (d.fake) env.treffer(d.x, d.y, 1);
              else { s.punkte++; env.funken(d.x, d.y, "#ffd54f", 8, 240); }
            }
          }
          z.dinge = z.dinge.filter(d => !d.weg && d.y < H + 30);
        },
        zeichne() {
          const g = ctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, "#1b1035"); g.addColorStop(1, "#3a1d5c");
          ctx.fillStyle = g; ctx.fillRect(0, 0, B, H);
          ctx.fillStyle = "rgba(255,255,255,.35)";
          for (const p of z.hintergrund) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(0, H - 10, B, 10);
          for (const d of z.dinge) d.fake ? zeichneFake(ctx, d.x, d.y, 1) : zeichneStern(ctx, d.x, d.y, 17, Math.sin(d.dreh) * 0.3);
          env.zeichneHund(z.hundX, H - env.hundH / 2 - 8 - Math.abs(Math.sin(s.zeit * 10)) * 3, 0, !z.hundRechts);
          env.zeichneFigur(z.x, Y, 0);
        }
      };
    });
  }

  // ---------- Spiel 3: Viren-Jagd ----------
  const JAGD_STUFEN = {
    leicht: { sp: 3, ze: 3, dauer: 2.0, dauerMin: 1.3, dauerAbbau: 0.015, abstand: 1.0, abstandMin: 0.6, abstandAbbau: 0.008, paket: 0.15 },
    mittel: { sp: 3, ze: 3, dauer: 1.5, dauerMin: 0.75, dauerAbbau: 0.02, abstand: 0.8, abstandMin: 0.35, abstandAbbau: 0.012, paket: 0.25 },
    schwer: { sp: 4, ze: 4, dauer: 1.15, dauerMin: 0.55, dauerAbbau: 0.02, abstand: 0.6, abstandMin: 0.28, abstandAbbau: 0.01, paket: 0.33 }
  };
  function jagd(container, opt = {}) {
    const st = JAGD_STUFEN[opt.stufe] || JAGD_STUFEN.mittel;
    const tastatur = st.sp * st.ze <= 9;
    return starte(container, {
      ...opt, titel: "Viren-Jagd", einheit: "Viren",
      anleitung: [tastatur ? "Viren schnell antippen (oder Taste 1–9)" : "Viren schnell antippen", "Datenpakete NICHT antippen!", "Jeder Virus zählt."]
    }, (env) => {
      const { ctx, B, H, s, e } = env;
      const SP = st.sp, ZE = st.ze, oben = 50, rand = SP > 3 ? 9 : 12;
      const feldB = (B - rand * (SP + 1)) / SP;
      const feldH = (H - oben - rand * (ZE + 1)) / ZE;
      const felder = [];
      for (let r = 0; r < ZE; r++) for (let c = 0; c < SP; c++)
        felder.push({ x: rand + c * (feldB + rand), y: oben + rand + r * (feldH + rand), inhalt: null, rot: 0, gruen: 0 });
      const z = { naechstes: 0.4 };
      const mitte = (f) => ({ x: f.x + feldB / 2, y: f.y + feldH * 0.45 });

      function tippe(f) {
        if (!f || !f.inhalt) return;
        const m = mitte(f);
        if (f.inhalt.art === "virus") { s.punkte++; f.gruen = 0.3; env.funken(m.x, m.y, "#81c784", 10, 260); }
        else { f.rot = 0.4; env.treffer(m.x, m.y, 0.3); }
        f.inhalt = null;
      }
      return {
        update(dt) {
          for (const k of e.klicks) {
            if (k.taste) { if (tastatur) tippe(felder[k.taste - 1]); }
            else tippe(felder.find(f => k.x >= f.x && k.x <= f.x + feldB && k.y >= f.y && k.y <= f.y + feldH));
          }
          for (const f of felder) {
            if (f.rot > 0) f.rot -= dt;
            if (f.gruen > 0) f.gruen -= dt;
            if (f.inhalt) { f.inhalt.t -= dt; f.inhalt.auf = Math.min(1, f.inhalt.auf + dt * 8); if (f.inhalt.t <= 0) f.inhalt = null; }
          }
          z.naechstes -= dt;
          if (z.naechstes <= 0) {
            const frei = felder.filter(f => !f.inhalt);
            if (frei.length) {
              const f = frei[Math.floor(Math.random() * frei.length)];
              const dauer = Math.max(st.dauerMin, st.dauer - s.zeit * st.dauerAbbau);
              f.inhalt = { art: Math.random() < st.paket ? "paket" : "virus", t: dauer, dauer, auf: 0, dreh: Math.random() * 6 };
            }
            z.naechstes = Math.max(st.abstandMin, st.abstand - s.zeit * st.abstandAbbau) * (0.7 + Math.random() * 0.6);
          }
        },
        zeichne() {
          ctx.fillStyle = "#14263f"; ctx.fillRect(0, 0, B, H);
          felder.forEach((f, i) => {
            // Bildschirm mit Rahmen und Fuss
            ctx.fillStyle = "#3d4f6b"; ctx.fillRect(f.x + feldB * 0.42, f.y + feldH * 0.86, feldB * 0.16, feldH * 0.1);
            ctx.fillStyle = "#c9d3e3"; ctx.fillRect(f.x, f.y, feldB, feldH * 0.88);
            ctx.fillStyle = f.rot > 0 ? "#7a1f1f" : f.gruen > 0 ? "#1f5a33" : "#0b1424";
            ctx.fillRect(f.x + 5, f.y + 5, feldB - 10, feldH * 0.88 - 10);
            ctx.fillStyle = "#6f86a8"; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
            if (tastatur) ctx.fillText(String(i + 1), f.x + 9, f.y + 8);
            if (f.inhalt) {
              const m = mitte(f), gr = Math.min(feldB, feldH) / 90 * f.inhalt.auf;
              if (f.inhalt.art === "virus") zeichneVirus(ctx, m.x, m.y, 22 * gr, f.inhalt.dreh += 0.02);
              else zeichnePaket(ctx, m.x, m.y, 1.5 * gr);
              // Restzeit-Balken
              ctx.fillStyle = f.inhalt.art === "virus" ? "#81c784" : "#f5b83d";
              ctx.fillRect(f.x + 8, f.y + feldH * 0.88 - 12, (feldB - 16) * Math.max(0, f.inhalt.t / f.inhalt.dauer), 4);
            }
          });
        }
      };
    });
  }

  window.LernSpiel = { flug, faenger, jagd, stopp, version: "9" };
})();
