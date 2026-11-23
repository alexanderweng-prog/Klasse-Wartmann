// Mini-Spiel «Globi-Flug»: Globi fliegt durchs Datennetz, sammelt Datenpakete und weicht Viren aus.
// Steuerung: gedrückt halten (Maus, Finger, Leertaste, Pfeil hoch) = steigen, loslassen = sinken.
(() => {
  "use strict";

  // Die Spielfläche passt sich der Bildschirmbreite an (Hochformat auf dem Handy)
  const SCHWERKRAFT = 950, SCHUB = 1900, MAX_V = 340;

  let aktiv = null;                 // laufendes Spiel (zum Abbrechen)

  function stopp() { if (aktiv) aktiv.beenden(true); }

  // Bild laden; bei Fehler: null (dann wird eine einfache Figur gezeichnet)
  function ladeBild(src) {
    return new Promise((resolve) => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function flug(container, { sekunden = 30, bild = "", leben = 3 } = {}) {
    stopp();
    return new Promise(async (fertig) => {
      const canvas = document.createElement("canvas");
      canvas.className = "spiel-canvas";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Spielfeld Globi-Flug. Gedrückt halten zum Steigen, loslassen zum Sinken.");
      canvas.tabIndex = 0;
      container.replaceChildren(canvas);
      const ctx = canvas.getContext("2d");
      const breite = container.clientWidth || 600;
      const B = Math.round(Math.max(320, Math.min(600, breite)));
      const H = B < 560 ? Math.round(B * 1.25) : Math.round(B * 2 / 3);
      const massstab = Math.max(0.75, B / 600);          // Tempo auf schmalen Bildschirmen etwas tiefer
      const SPIELER_X = Math.round(B * 0.18);
      canvas.style.aspectRatio = `${B} / ${H}`;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = B * dpr; canvas.height = H * dpr;
      ctx.scale(dpr, dpr);

      const figur = await ladeBild(bild);
      const figurH = 72;
      const figurB = figur ? figurH * (figur.naturalWidth / figur.naturalHeight) : 48;

      // ---------- Zustand ----------
      const s = {
        y: H / 2, vy: 0, halten: false,
        zeit: 0, rest: sekunden, pakete: 0, leben,
        unverwundbar: 0, countdown: 3,
        viren: [], paketeListe: [], funken: [],
        naechsterVirus: 1.8, naechstesPaket: 0.4,
        knoten: Array.from({ length: 26 }, () => ({ x: Math.random() * B, y: Math.random() * H, r: 1.5 + Math.random() * 2, tiefe: 0.3 + Math.random() * 0.7 })),
        vorbei: false
      };

      // ---------- Eingabe ----------
      const an = (e) => { if (e) e.preventDefault(); s.halten = true; };
      const aus = () => { s.halten = false; };
      const tasten = ["Space", "ArrowUp", "KeyW"];
      const keyDown = (e) => { if (tasten.includes(e.code)) { e.preventDefault(); s.halten = true; } };
      const keyUp = (e) => { if (tasten.includes(e.code)) s.halten = false; };
      canvas.addEventListener("pointerdown", an);
      window.addEventListener("pointerup", aus);
      canvas.addEventListener("pointercancel", aus);
      window.addEventListener("keydown", keyDown);
      window.addEventListener("keyup", keyUp);
      canvas.focus({ preventScroll: true });

      let rafId = 0, letzte = 0;
      const ergebnis = () => ({ pakete: s.pakete, leben: s.leben, zeitUm: s.rest <= 0 });
      aktiv = {
        beenden(abbruch) {
          if (s.vorbei) return;
          s.vorbei = true;
          cancelAnimationFrame(rafId);
          window.removeEventListener("pointerup", aus);
          window.removeEventListener("keydown", keyDown);
          window.removeEventListener("keyup", keyUp);
          aktiv = null;
          fertig({ ...ergebnis(), abgebrochen: !!abbruch });
        }
      };

      // ---------- Spiellogik ----------
      function update(dt) {
        if (s.countdown > 0) { s.countdown -= dt; return; }
        s.zeit += dt; s.rest = Math.max(0, sekunden - s.zeit);
        const tempo = (200 + s.zeit * 5) * massstab;

        s.vy += (s.halten ? -SCHUB + SCHWERKRAFT : SCHWERKRAFT) * dt;
        s.vy = Math.max(-MAX_V, Math.min(MAX_V, s.vy));
        s.y += s.vy * dt;
        const rand = figurH / 2 + 6;
        if (s.y < rand + 34) { s.y = rand + 34; s.vy = 0; }
        if (s.y > H - rand) { s.y = H - rand; s.vy = 0; }
        if (s.unverwundbar > 0) s.unverwundbar -= dt;

        // erzeugen
        s.naechsterVirus -= dt;
        if (s.naechsterVirus <= 0) {
          s.viren.push({ x: B + 40, y: 50 + Math.random() * (H - 90), r: 16 + Math.random() * 10, phase: Math.random() * 6, welle: Math.random() < 0.5 ? 0 : 25 + Math.random() * 30 });
          s.naechsterVirus = Math.max(0.6, 1.6 - s.zeit * 0.03) * (0.75 + Math.random() * 0.5);
        }
        s.naechstesPaket -= dt;
        if (s.naechstesPaket <= 0) {
          s.paketeListe.push({ x: B + 30, y: 50 + Math.random() * (H - 85), w: 0 });
          s.naechstesPaket = 0.55 + Math.random() * 0.5;
        }

        // bewegen
        for (const v of s.viren) { v.x -= tempo * dt; v.phase += dt * 3; }
        for (const p of s.paketeListe) { p.x -= tempo * dt; p.w += dt * 4; }
        for (const k of s.knoten) { k.x -= tempo * 0.25 * k.tiefe * dt; if (k.x < -10) { k.x = B + 10; k.y = Math.random() * H; } }
        for (const f of s.funken) { f.x += f.vx * dt; f.y += f.vy * dt; f.t -= dt; }
        s.viren = s.viren.filter(v => v.x > -50);
        s.paketeListe = s.paketeListe.filter(p => p.x > -40 && !p.weg);
        s.funken = s.funken.filter(f => f.t > 0);

        // Kollisionen (Kreis um Globi, etwas kleiner als das Bild)
        const gr = Math.min(figurB, figurH) * 0.38;
        for (const p of s.paketeListe) {
          if (Math.hypot(p.x - SPIELER_X, p.y - s.y) < gr + 14) {
            p.weg = true; s.pakete++;
            for (let i = 0; i < 6; i++) s.funken.push({ x: p.x, y: p.y, vx: (Math.random() - .5) * 220, vy: (Math.random() - .5) * 220, t: .4, farbe: "#f5b83d" });
          }
        }
        if (s.unverwundbar <= 0) {
          for (const v of s.viren) {
            const vy = v.y + Math.sin(v.phase) * v.welle;
            if (Math.hypot(v.x - SPIELER_X, vy - s.y) < gr + v.r * 0.85) {
              s.leben--; s.unverwundbar = 2; v.x = -100;
              for (let i = 0; i < 10; i++) s.funken.push({ x: SPIELER_X, y: s.y, vx: (Math.random() - .5) * 300, vy: (Math.random() - .5) * 300, t: .5, farbe: "#ef5350" });
              break;
            }
          }
        }
        if (s.leben <= 0 || s.rest <= 0) aktiv && aktiv.beenden(false);
      }

      // ---------- Zeichnen ----------
      function zeichneVirus(v) {
        const y = v.y + Math.sin(v.phase) * v.welle;
        ctx.save(); ctx.translate(v.x, y); ctx.rotate(v.phase * 0.3);
        ctx.fillStyle = "#c62828";
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          ctx.beginPath(); ctx.arc(Math.cos(a) * v.r * 1.15, Math.sin(a) * v.r * 1.15, v.r * 0.22, 0, Math.PI * 2); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(0, 0, v.r, 0, Math.PI * 2);
        ctx.fillStyle = "#e53935"; ctx.fill();
        ctx.fillStyle = "#ffcdd2";
        ctx.beginPath(); ctx.arc(-v.r * .35, -v.r * .2, v.r * .2, 0, Math.PI * 2); ctx.arc(v.r * .35, -v.r * .2, v.r * .2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      function zeichnePaket(p) {
        const sk = 1 + Math.sin(p.w) * 0.08;
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(sk, sk);
        ctx.fillStyle = "#f5b83d"; ctx.strokeStyle = "#b9850f"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.rect(-13, -11, 26, 22); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#3b2a05"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("01", 0, 1);
        ctx.restore();
      }
      function zeichneGlobi() {
        if (s.unverwundbar > 0 && Math.floor(s.unverwundbar * 10) % 2 === 0) return; // blinken
        ctx.save(); ctx.translate(SPIELER_X, s.y);
        // heller Schein, damit Globi auf dem dunklen Hintergrund gut sichtbar ist
        const schein = ctx.createRadialGradient(0, 0, 4, 0, 0, figurH * 0.75);
        schein.addColorStop(0, "rgba(255, 240, 190, .55)"); schein.addColorStop(1, "rgba(255, 240, 190, 0)");
        ctx.fillStyle = schein; ctx.beginPath(); ctx.arc(0, 0, figurH * 0.75, 0, Math.PI * 2); ctx.fill();
        ctx.rotate(Math.max(-0.35, Math.min(0.35, s.vy / 900)));
        if (figur) ctx.drawImage(figur, -figurB / 2, -figurH / 2, figurB, figurH);
        else {
          ctx.fillStyle = "#f5b83d"; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-7, -5, 6, 0, Math.PI * 2); ctx.arc(9, -5, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#1c2233"; ctx.beginPath(); ctx.arc(-6, -4, 3, 0, Math.PI * 2); ctx.arc(10, -4, 3, 0, Math.PI * 2); ctx.fill();
        }
        // Schubflamme beim Steigen
        if (s.halten && s.countdown <= 0) {
          ctx.fillStyle = "rgba(120, 200, 255, .8)";
          ctx.beginPath(); ctx.moveTo(-figurB / 2 + 4, figurH / 2 - 10); ctx.lineTo(-figurB / 2 - 14 - Math.random() * 8, figurH / 2 - 4); ctx.lineTo(-figurB / 2 + 4, figurH / 2); ctx.fill();
        }
        ctx.restore();
      }
      function zeichne() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#0d1838"); g.addColorStop(1, "#1a2f63");
        ctx.fillStyle = g; ctx.fillRect(0, 0, B, H);
        // Datennetz im Hintergrund
        ctx.strokeStyle = "rgba(120, 170, 255, .12)"; ctx.lineWidth = 1;
        for (let i = 0; i < s.knoten.length; i++) for (let j = i + 1; j < s.knoten.length; j++) {
          const a = s.knoten[i], b = s.knoten[j];
          if (Math.abs(a.x - b.x) < 110 && Math.abs(a.y - b.y) < 110) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        ctx.fillStyle = "rgba(150, 195, 255, .45)";
        for (const k of s.knoten) { ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2); ctx.fill(); }

        s.paketeListe.forEach(zeichnePaket);
        s.viren.forEach(zeichneVirus);
        for (const f of s.funken) { ctx.globalAlpha = Math.max(0, f.t * 2); ctx.fillStyle = f.farbe; ctx.fillRect(f.x - 2, f.y - 2, 4, 4); }
        ctx.globalAlpha = 1;
        zeichneGlobi();

        // Anzeige oben
        ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(0, 0, B, 34);
        ctx.font = "bold 17px system-ui, sans-serif"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#f5b83d"; ctx.textAlign = "left"; ctx.fillText(`Pakete: ${s.pakete}`, 12, 18);
        ctx.textAlign = "center"; ctx.fillStyle = "#ff8a80";
        ctx.fillText("♥".repeat(Math.max(0, s.leben)) + "♡".repeat(Math.max(0, leben - s.leben)), B / 2, 18);
        ctx.textAlign = "right"; ctx.fillStyle = s.rest <= 5 ? "#ff8a80" : "#ffffff";
        ctx.fillText(`${Math.ceil(s.rest)} s`, B - 12, 18);

        if (s.countdown > 0) {
          ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 34, B, H - 34);
          ctx.fillStyle = "#fff"; ctx.textAlign = "center";
          ctx.font = "bold 64px system-ui, sans-serif"; ctx.fillText(String(Math.ceil(s.countdown)), B / 2, H / 2 - 20);
          ctx.font = `${B < 450 ? 15 : 18}px system-ui, sans-serif`;
          ctx.fillText("Gedrückt halten = steigen", B / 2, H / 2 + 35);
          ctx.fillText("Loslassen = sinken", B / 2, H / 2 + 58);
          ctx.fillText("Pakete sammeln, Viren ausweichen!", B / 2, H / 2 + 86);
        }
      }

      function schleife(t) {
        if (s.vorbei) return;
        if (!canvas.isConnected) { aktiv && aktiv.beenden(true); return; }
        const dt = letzte ? Math.min(0.05, (t - letzte) / 1000) : 0;
        letzte = t;
        update(dt);
        zeichne();
        if (!s.vorbei) rafId = requestAnimationFrame(schleife);
      }
      rafId = requestAnimationFrame(schleife);
    });
  }

  window.LernSpiel = { flug, stopp, version: "5" };
})();
