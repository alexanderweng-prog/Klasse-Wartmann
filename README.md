# Lernapp MuI mit Maskottchen

Lernapp für Medien und Informatik (7. Klasse). Aktuelles Thema: **Internet, Online-Bewertungen und KI**
(entspricht dem Test «Internet, Bewertungen und KI», 15 Punkte).

## Starten

`index.html` doppelklicken, die App läuft im Browser. Es braucht weder Internet noch Installation.
Zum Verteilen an die Klasse den ganzen Ordner weitergeben oder z. B. über GitHub Pages veröffentlichen.

Funktionen:
- **Theorie lernen**: Lernkarten pro Kapitel, jeweils mit Merksatz. Die App merkt sich, welche Karten gelernt sind.
- **Üben**: Fragen pro Kapitel oder gemischt, mit sofortiger Rückmeldung und Erklärung.
- **Probetest**: wie der echte Test, mit Timer, Selbstbewertung der offenen Fragen und Note nach dem Notenschlüssel.
- **Lernen & Spielen**: Jede richtige Antwort lädt Energie. Ist sie voll (Standard: 3 richtige Antworten), gibt es eine Spielrunde.
  Falsch beantwortete Fragen kommen kurz danach nochmals. Offene Fragen sind ausgeschlossen, weil sie sich selbst bewerten lassen.
  Zu Beginn wählen die Schüler/innen eines von vier Spielen:
  - 🚀 **Globi-Flug** (Geschicklichkeit): gedrückt halten = steigen, Pakete sammeln, Viren ausweichen
  - ⭐ **Bewertungs-Fänger** (Geschicklichkeit): echte Bewertungen (Sterne) fangen, «FAKE» meiden; Maus/Finger oder ← →
  - 🦠 **Viren-Jagd** (Reaktion): Viren auf den Bildschirmen antippen, Datenpakete nicht; Tastatur 1–9 möglich
  - 🏗️ **Globis Stadt** (ruhig, ohne Zeitdruck): jede richtige Antwort = 1 Münze, damit Gebäude bauen; die Stadt bleibt gespeichert

  Im Editor unter «Allgemein» stellst du ein: Antworten pro Runde, Rundendauer und welche Spiele zur Auswahl stehen.

Der Lernfortschritt wird nur im Browser des jeweiligen Geräts gespeichert.

## Material austauschen

Alle Inhalte stehen in **`inhalt/thema.js`**. Die übrigen Dateien bleiben unverändert.

### Mit dem Editor (empfohlen)

In der App auf **Lehrperson → Editor öffnen** klicken. Der Editor hat vier Reiter:

- **Allgemein:** Titel, Fach und Stufe des Themas sowie das Maskottchen (Name, Bild, Sprüche). Ein Bild kannst du direkt auswählen; es wird verkleinert und ins Material eingebettet.
- **Theorie:** Kapitel mit Lernkarten (Titel, Text, Merksatz)
- **Übungen:** Fragen je Kapitel. Bei Auswahlfragen markierst du die richtige Antwort per Klick.
- **Probetest:** Zeit, Fragen mit Punkten und Notenschlüssel (Formel oder eigene Tabelle)

Danach:
- **In App übernehmen:** Der Editor prüft das Material auf Fehler und lädt die App mit dem neuen Material neu. Das gilt nur für diesen Browser.
- **thema.js herunterladen:** Damit ersetzt du `inhalt/thema.js`. So bekommen alle Geräte das neue Material.
- **JSON herunterladen / Datei öffnen:** Material sichern, weitergeben oder später weiterbearbeiten

Der Editor sichert laufend einen Entwurf im Browser. Schliesst du ihn versehentlich, kannst du beim nächsten Öffnen dort weiterfahren.

### Ohne Editor

**Variante A (für alle):** `inhalt/thema.js` durch eine neue Datei mit gleichem Aufbau ersetzen.

**Variante B (nur in diesem Browser):** In der App auf **Lehrperson → Material laden** klicken und eine `.json`- oder `.js`-Datei
wählen. Die App prüft die Datei und zeigt Fehler an.
Mit «Aktuelles Material als Vorlage herunterladen» bekommst du eine JSON-Vorlage zum Bearbeiten.
Mit «Standardmaterial wiederherstellen» wird wieder `inhalt/thema.js` verwendet.

### Aufbau

```
titel, fach, stufe
maskottchen: name, bild, begruessung, lob[], trost[]
spiel:      fragenProRunde, sekunden, spiele[]   (optional; Standard 3, 30, alle Spiele)
kapitel[]:  id, titel, icon, karten[]: { titel, text, merksatz }
uebungen[]: { kapitel: <id>, typ, frage, ... , erklaerung }
probetest:  titel, minuten, hinweis, notenschluessel[], fragen[]
```

Fragetypen:

| typ | Felder | Bewertung |
|---|---|---|
| `auswahl` | `optionen[]`, `richtig` (Index, ab 0) | automatisch |
| `mehrfach` | `optionen[]`, `richtig[]` (Liste von Indizes) | automatisch, alle richtig nötig |
| `zuordnen` | `paare[]: { links, rechts }` | automatisch, Teilpunkte |
| `offen` | `musterloesung`, `punkte` | Selbstbewertung nach Ansicht der Lösung |

Optional bei jeder Frage: `punkte`, `abschnitt` (Überschrift im Probetest) und `kontext`
(Text oder Tabelle `{ "kopf": [...], "zeilen": [[...], ...] }`).

Fehlt der `notenschluessel`, rechnet die App mit Note = 1 + 5 × Punkte ÷ Maximum, gerundet auf Viertelnoten.

Wichtig: Nach `window.LERNINHALT =` muss gültiges JSON stehen, also doppelte Anführungszeichen und kein Komma nach
dem letzten Eintrag einer Liste.

## Maskottchen-Bild

Lege ein Bild als `bilder/maskottchen.png` ab, idealerweise quadratisch mit transparentem Hintergrund.
Ein anderer Dateiname geht auch, dann `maskottchen.bild` in `inhalt/thema.js` anpassen.
Ohne Bild zeigt die App eine neutrale Platzhalter-Figur.

Hinweis: Globi ist eine urheberrechtlich geschützte Figur. Verwende nur Bilder, für die ihr Nutzungsrechte habt.
