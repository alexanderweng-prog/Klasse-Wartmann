/*
  LERNINHALT – diese Datei kannst du jederzeit austauschen.

  Regeln:
  - Alles nach "window.LERNINHALT =" muss gültiges JSON sein
    (doppelte Anführungszeichen, keine Kommas am Ende einer Liste).
  - Du kannst den Teil zwischen den geschweiften Klammern auch als
    eigene .json-Datei speichern und in der App unter
    «Lehrperson → Material laden» importieren.
  - Fragetypen: "auswahl", "mehrfach", "zuordnen", "offen"
    (Details in der README.md)
*/
window.LERNINHALT = {
  "titel": "Internet, Bewertungen und KI",
  "fach": "Medien und Informatik",
  "stufe": "7. Klasse",

  "maskottchen": {
    "name": "Globi",
    "bild": "bilder/maskottchen.png",
    "begruessung": "Hoi! Ich bin Globi, und das ist mein Hund Bläss. Zusammen machen wir dich fit für den Test über Internet, Bewertungen und KI.",
    "lob": ["Super gemacht!", "Genau richtig!", "Bravo, das sitzt!", "Stark! Weiter so!"],
    "trost": ["Fast! Lies die Erklärung nochmals.", "Kein Problem, aus Fehlern lernt man.", "Knapp daneben – probier's beim nächsten Mal."]
  },

  "lehrperson": {
    "salz": "d6b8465009e30f2a05cc6827",
    "pruefwert": "17a50590713a4473b8f59d1f106b395be6ec23c5fb85274d2ec23f1d9e5129db"
  },

  "begleiter": {
    "name": "Bläss",
    "bild": "",
    "zeigen": true
  },

  "spiel": {
    "fragenProRunde": 3,
    "sekunden": 30,
    "spiele": ["flug", "faenger", "jagd", "stadt"]
  },

  "kapitel": [
    {
      "id": "internet",
      "titel": "Internet",
      "icon": "🌐",
      "karten": [
        {
          "titel": "Was ist das Internet?",
          "text": "Das Internet ist ein riesiges Netz aus Millionen von Computern und Geräten, die miteinander verbunden sind. Wenn du eine Webseite öffnest, werden Daten in kleinen Paketen von Gerät zu Gerät geschickt, bis sie bei dir ankommen.",
          "merksatz": "Das Internet ist ein Netz aus vielen Netzen."
        },
        {
          "titel": "Server",
          "text": "Ein Server ist ein Computer, der Webseiten, Videos oder Dateien speichert. Wenn du eine Webseite aufrufst, schickt dein Gerät eine Anfrage an den Server. Der Server verschickt dann die Webseite an dich. Dein Gerät nennt man dabei «Client».",
          "merksatz": "Server = speichert Webseiten und verschickt sie auf Anfrage."
        },
        {
          "titel": "Router",
          "text": "Der Router ist das Gerät bei dir zu Hause (oft mit blinkenden Lämpchen). Er verbindet deine Geräte – Handy, Laptop, Spielkonsole – per Kabel oder WLAN mit dem Internet und leitet die Datenpakete in die richtige Richtung.",
          "merksatz": "Router = verbindet deine Geräte zu Hause mit dem Internet."
        },
        {
          "titel": "Provider",
          "text": "Ein Provider (Internetanbieter) ist eine Firma, die dir den Zugang zum Internet verkauft. Deine Familie bezahlt dafür jeden Monat ein Abo. Ohne Provider hätte dein Router keine Verbindung nach draussen.",
          "merksatz": "Provider = Firma, die dir den Internetzugang verkauft."
        },
        {
          "titel": "IP-Adresse",
          "text": "Jedes Gerät im Internet hat eine IP-Adresse, zum Beispiel 85.4.123.17. Sie funktioniert wie eine Postadresse: Nur so wissen die Datenpakete, zu welchem Gerät sie gehören. Ohne IP-Adresse würde die Webseite nie bei dir ankommen.",
          "merksatz": "IP-Adresse = Adresse eines Geräts, damit Daten das richtige Gerät finden."
        },
        {
          "titel": "Wie weiss eine Webseite, wo ich bin?",
          "text": "Webseiten sehen deine IP-Adresse. Es gibt Datenbanken, die IP-Adressen ungefähr einer Region oder Stadt zuordnen. Das nennt man Geolocation. Darum zeigt dir eine Pizzeria-Seite Restaurants in deiner Nähe, obwohl du keinen Ort eingegeben hast. Das ist meistens nur ungefähr genau. Viel genauer ist das GPS im Handy – das darf eine Seite aber nur nutzen, wenn du es erlaubst.",
          "merksatz": "Aus der IP-Adresse kann man ungefähr ablesen, wo du bist (Geolocation)."
        }
      ]
    },
    {
      "id": "bewertungen",
      "titel": "Online-Bewertungen",
      "icon": "⭐",
      "karten": [
        {
          "titel": "Wozu gibt es Bewertungen?",
          "text": "Auf vielen Seiten können Leute Restaurants, Hotels, Produkte oder Apps mit Sternen und Texten bewerten. Andere nutzen diese Bewertungen, um sich zu entscheiden. Darum sind Bewertungen wertvoll – und genau deshalb werden sie manchmal gefälscht.",
          "merksatz": "Bewertungen helfen bei Entscheidungen, sind aber nicht immer echt."
        },
        {
          "titel": "Wer schreibt falsche Bewertungen – und warum?",
          "text": "• Besitzerinnen und Besitzer schreiben gute Bewertungen über sich selbst, damit mehr Gäste kommen.\n• Die Konkurrenz schreibt schlechte Bewertungen, um andere schlecht zu machen.\n• Es gibt Firmen, die Bewertungen gegen Geld verkaufen.",
          "merksatz": "Wer von Bewertungen profitiert, hat einen Grund, sie zu fälschen."
        },
        {
          "titel": "Warnzeichen für gefälschte Bewertungen",
          "text": "Sei vorsichtig, wenn …\n• es nur sehr wenige Bewertungen gibt,\n• viele Bewertungen am selben Tag geschrieben wurden,\n• nur Sterne und kein Text vorhanden sind,\n• alle Bewertungen übertrieben begeistert klingen («Das Beste der Welt!!!»).",
          "merksatz": "Wenige, gleichzeitige Bewertungen ohne Text sind verdächtig."
        },
        {
          "titel": "So erkennst du vertrauenswürdige Bewertungen",
          "text": "Eher vertrauenswürdig sind Bewertungen, wenn …\n• es viele sind und sie über längere Zeit verteilt sind,\n• jemand eine persönliche Erfahrung mit konkreten Angaben beschreibt,\n• ein Text dabei ist, nicht nur Sterne,\n• sie aktuell sind,\n• man erkennt, wer sie geschrieben hat,\n• auch einmal Kritik vorkommt.",
          "merksatz": "Viele, verteilte und konkrete Bewertungen sind glaubwürdiger."
        },
        {
          "titel": "4.9 Sterne ist nicht immer besser als 4.2",
          "text": "Pizzeria Bella hat 4.9 Sterne aus 3 Bewertungen – alle am selben Tag. Pizzeria Roma hat 4.2 Sterne aus 85 Bewertungen über mehrere Jahre. Roma ist viel aussagekräftiger: Bei nur 3 Bewertungen reichen schon ein paar gefälschte, um den Durchschnitt zu bestimmen.",
          "merksatz": "Schau nicht nur auf die Sterne, sondern auch auf die Anzahl und das Datum."
        }
      ]
    },
    {
      "id": "ki",
      "titel": "Künstliche Intelligenz",
      "icon": "🤖",
      "karten": [
        {
          "titel": "Was ist Künstliche Intelligenz (KI)?",
          "text": "Künstliche Intelligenz bedeutet: Ein Computer löst Aufgaben, für die man sonst menschliches Denken braucht – zum Beispiel Sprache verstehen, Bilder erkennen oder Texte übersetzen. Eine KI wird nicht Schritt für Schritt programmiert, sondern lernt aus vielen Beispielen (Daten).",
          "merksatz": "KI lernt aus Daten, statt jede Regel einprogrammiert zu bekommen."
        },
        {
          "titel": "Schwache KI",
          "text": "Eine schwache KI ist auf eine bestimmte Aufgabe spezialisiert. Sie kann diese oft sehr gut, aber nichts anderes. Beispiele: Sprachassistent im Handy (Wecker stellen, Wetter ansagen), Übersetzungs-Apps, Gesichtserkennung beim Entsperren, Film-Vorschläge auf Streaming-Seiten. Alle KI, die es heute gibt, zählt man zur schwachen KI.",
          "merksatz": "Schwache KI = Spezialist für eine bestimmte Aufgabe."
        },
        {
          "titel": "Starke KI",
          "text": "Eine starke KI könnte in jedem Bereich lernen und denken wie ein Mensch – also nicht nur eine Aufgabe, sondern alles. So eine KI gibt es bisher nicht. Ob und wann es sie einmal geben wird, ist unter Fachleuten umstritten.",
          "merksatz": "Starke KI = denkt in allen Bereichen wie ein Mensch (gibt es bisher nicht)."
        },
        {
          "titel": "Überwachtes Lernen",
          "text": "Der Computer bekommt Beispiele zusammen mit der richtigen Lösung. Zum Beispiel 1000 Fotos, bei jedem steht «Hund» oder «Katze». Daraus lernt er, worauf es ankommt, und kann danach neue Fotos selbst einordnen. Wie in der Schule mit Lösungsblatt.",
          "merksatz": "Überwacht = Beispiele MIT Lösung."
        },
        {
          "titel": "Unüberwachtes Lernen",
          "text": "Der Computer bekommt Daten ohne Lösungen. Niemand sagt ihm, welche Gruppen es gibt. Er sucht selbst nach Ähnlichkeiten und bildet Gruppen. Beispiel: Ein Online-Shop sortiert Kundendaten in Gruppen von Leuten, die Ähnliches kaufen.",
          "merksatz": "Unüberwacht = Daten OHNE Lösung, der Computer findet selbst Gruppen."
        },
        {
          "titel": "Verstärkendes Lernen",
          "text": "Der Computer (oder Roboter) probiert etwas aus und bekommt eine Rückmeldung: Pluspunkte, wenn es gut war, Minuspunkte, wenn nicht. So wird er mit der Zeit immer besser. Beispiel: Ein Roboter lernt laufen und bekommt Pluspunkte, wenn er nicht umfällt. Wie beim Training: Was klappt, macht man wieder.",
          "merksatz": "Verstärkend = ausprobieren und Belohnung bekommen."
        }
      ]
    }
  ],

  "uebungen": [
    { "kapitel": "internet", "typ": "zuordnen",
      "frage": "Ordne jeden Begriff der passenden Beschreibung zu.",
      "paare": [
        { "links": "Server", "rechts": "Computer, der Webseiten speichert und auf Anfrage verschickt" },
        { "links": "Provider", "rechts": "Firma, die dir den Zugang zum Internet verkauft" },
        { "links": "Router", "rechts": "Gerät zu Hause, das deine Geräte mit dem Internet verbindet" }
      ],
      "erklaerung": "Server speichert, Provider verkauft den Zugang, Router verbindet zu Hause." },
    { "kapitel": "internet", "typ": "auswahl",
      "frage": "Wozu braucht ein Gerät im Internet eine IP-Adresse?",
      "optionen": ["Damit Daten das richtige Gerät finden", "Damit das Gerät schneller wird", "Damit man ein Passwort hat", "Damit der Akku länger hält"],
      "richtig": 0,
      "erklaerung": "Die IP-Adresse ist wie eine Postadresse: Sie sagt, wohin die Datenpakete müssen." },
    { "kapitel": "internet", "typ": "auswahl",
      "frage": "Eine Webseite zeigt dir Restaurants in deiner Nähe, obwohl du keinen Ort eingegeben hast. Woher weiss sie das ungefähr?",
      "optionen": ["Aus deiner IP-Adresse", "Aus deinem Namen", "Aus der Farbe deines Handys", "Sie rät einfach"],
      "richtig": 0,
      "erklaerung": "Datenbanken ordnen IP-Adressen ungefähr einer Region oder Stadt zu (Geolocation)." },
    { "kapitel": "internet", "typ": "auswahl",
      "frage": "Welches Gerät steht bei dir zu Hause und stellt das WLAN bereit?",
      "optionen": ["Server", "Router", "Provider", "Drucker"],
      "richtig": 1,
      "erklaerung": "Der Router verbindet deine Geräte per Kabel oder WLAN mit dem Internet." },
    { "kapitel": "internet", "typ": "auswahl",
      "frage": "Du rufst eine Webseite auf. Wo ist die Webseite gespeichert?",
      "optionen": ["Auf dem Router", "Auf einem Server", "Beim Provider im Vertrag", "In der IP-Adresse"],
      "richtig": 1,
      "erklaerung": "Webseiten liegen auf Servern. Dein Gerät schickt eine Anfrage, der Server schickt die Seite zurück." },
    { "kapitel": "internet", "typ": "mehrfach",
      "frage": "Welche Aussagen stimmen? (mehrere Antworten möglich)",
      "optionen": ["Daten werden in kleinen Paketen verschickt", "Jedes Gerät im Internet hat eine IP-Adresse", "Ein Provider ist ein Kabel", "Geolocation über die IP-Adresse ist auf den Meter genau"],
      "richtig": [0, 1],
      "erklaerung": "Ein Provider ist eine Firma. Geolocation über die IP-Adresse ist nur ungefähr (Region/Stadt)." },
    { "kapitel": "internet", "typ": "offen",
      "frage": "Erkläre in einem Satz, wozu man eine IP-Adresse braucht.",
      "musterloesung": "Damit Daten das richtige Gerät finden – wie eine Postadresse. (Auch richtig: damit man Geräte im Internet eindeutig erkennen kann.)",
      "punkte": 1 },

    { "kapitel": "bewertungen", "typ": "auswahl",
      "frage": "Welche Pizzeria hat die aussagekräftigsten Bewertungen?",
      "kontext": { "kopf": ["Pizzeria", "Sterne", "Bewertungen", "Auffälligkeiten"],
        "zeilen": [["Bella", "4.9", "3", "Alle am selben Tag, kein Text"], ["Roma", "4.2", "85", "Mit Texten, über mehrere Jahre"], ["Napoli", "–", "0", "Noch keine Bewertung"]] },
      "optionen": ["Bella", "Roma", "Napoli"],
      "richtig": 1,
      "erklaerung": "Roma: viele Bewertungen, über Jahre verteilt, mit Texten. Bella wirkt verdächtig, Napoli hat keine Infos." },
    { "kapitel": "bewertungen", "typ": "mehrfach",
      "frage": "Welche Merkmale sind Warnzeichen für gefälschte Bewertungen?",
      "optionen": ["Alle am selben Tag geschrieben", "Nur Sterne, kein Text", "Konkrete Beschreibung des Essens", "Sehr wenige Bewertungen", "Über mehrere Jahre verteilt"],
      "richtig": [0, 1, 3],
      "erklaerung": "Konkrete Beschreibungen und eine Verteilung über lange Zeit sprechen eher für echte Bewertungen." },
    { "kapitel": "bewertungen", "typ": "auswahl",
      "frage": "Wer hat ein Interesse daran, SCHLECHTE falsche Bewertungen über eine Pizzeria zu schreiben?",
      "optionen": ["Die Konkurrenz", "Die Besitzerin der Pizzeria", "Die Gäste, denen es geschmeckt hat", "Niemand"],
      "richtig": 0,
      "erklaerung": "Die Konkurrenz will die andere Pizzeria schlecht machen, damit die Gäste zu ihr kommen." },
    { "kapitel": "bewertungen", "typ": "auswahl",
      "frage": "Woran erkennst du am ehesten eine vertrauenswürdige Bewertung?",
      "optionen": ["Sie hat 5 Sterne", "Sie beschreibt eine persönliche Erfahrung mit konkreten Angaben", "Sie hat viele Ausrufezeichen", "Sie ist sehr kurz"],
      "richtig": 1,
      "erklaerung": "Konkrete, persönliche Angaben sind schwer zu fälschen und deshalb glaubwürdiger." },
    { "kapitel": "bewertungen", "typ": "zuordnen",
      "frage": "Wer könnte falsche Bewertungen schreiben? Ordne den Grund zu.",
      "paare": [
        { "links": "Besitzer der Pizzeria", "rechts": "will mehr Gäste" },
        { "links": "Konkurrenz", "rechts": "will die anderen schlecht machen" },
        { "links": "Bewertungsfirma", "rechts": "verdient Geld mit gekauften Bewertungen" }
      ],
      "erklaerung": "Wer von Bewertungen profitiert, hat einen Grund, sie zu fälschen." },
    { "kapitel": "bewertungen", "typ": "offen",
      "frage": "Nenne eine Person oder Gruppe, die ein Interesse an falschen Bewertungen haben könnte, und den Grund.",
      "musterloesung": "Z. B. die Besitzerin der Pizzeria (will mehr Gäste), die Konkurrenz (will schlecht machen) oder eine Firma, die Bewertungen verkauft. Wichtig: Person/Gruppe UND Grund.",
      "punkte": 1 },

    { "kapitel": "ki", "typ": "auswahl",
      "frage": "Der Sprachassistent im Handy stellt den Wecker und sagt das Wetter an. Was für eine KI ist das?",
      "optionen": ["Schwache KI", "Starke KI"],
      "richtig": 0,
      "erklaerung": "Er ist auf bestimmte Aufgaben spezialisiert – das ist schwache KI." },
    { "kapitel": "ki", "typ": "auswahl",
      "frage": "Ein Computer kann in jedem Bereich lernen und denken wie ein Mensch. Was für eine KI wäre das?",
      "optionen": ["Schwache KI", "Starke KI"],
      "richtig": 1,
      "erklaerung": "Das wäre starke KI. So eine KI gibt es bisher nicht." },
    { "kapitel": "ki", "typ": "zuordnen",
      "frage": "Ordne jedem Beispiel die passende Lernart zu.",
      "paare": [
        { "links": "1000 Fotos, bei jedem steht «Hund» oder «Katze»", "rechts": "Überwachtes Lernen" },
        { "links": "Kundendaten in Gruppen sortieren, ohne dass jemand die Gruppen vorgibt", "rechts": "Unüberwachtes Lernen" },
        { "links": "Roboter probiert Bewegungen und bekommt Pluspunkte, wenn er nicht umfällt", "rechts": "Verstärkendes Lernen" }
      ],
      "erklaerung": "Mit Lösung = überwacht, ohne Lösung = unüberwacht, mit Belohnung = verstärkend." },
    { "kapitel": "ki", "typ": "auswahl",
      "frage": "Eine KI lernt ein Videospiel, indem sie es tausendmal spielt und für jeden Punkt belohnt wird. Welche Lernart ist das?",
      "optionen": ["Überwachtes Lernen", "Unüberwachtes Lernen", "Verstärkendes Lernen"],
      "richtig": 2,
      "erklaerung": "Ausprobieren und Belohnung bekommen = verstärkendes Lernen." },
    { "kapitel": "ki", "typ": "auswahl",
      "frage": "Ein E-Mail-Programm lernt aus tausenden Mails, die als «Spam» oder «kein Spam» markiert sind. Welche Lernart ist das?",
      "optionen": ["Überwachtes Lernen", "Unüberwachtes Lernen", "Verstärkendes Lernen"],
      "richtig": 0,
      "erklaerung": "Jede Mail hat die richtige Lösung dabei – also überwachtes Lernen." },
    { "kapitel": "ki", "typ": "auswahl",
      "frage": "Eine Musik-App teilt Songs selbstständig in Gruppen ein, die ähnlich klingen. Niemand hat die Gruppen vorgegeben. Welche Lernart ist das?",
      "optionen": ["Überwachtes Lernen", "Unüberwachtes Lernen", "Verstärkendes Lernen"],
      "richtig": 1,
      "erklaerung": "Keine Lösungen vorgegeben, der Computer findet selbst Gruppen = unüberwachtes Lernen." },
    { "kapitel": "ki", "typ": "mehrfach",
      "frage": "Welche Beispiele sind schwache KI?",
      "optionen": ["Übersetzungs-App", "Gesichtserkennung beim Handy-Entsperren", "Film-Vorschläge beim Streaming", "Ein Computer, der alles kann wie ein Mensch"],
      "richtig": [0, 1, 2],
      "erklaerung": "Die ersten drei sind Spezialisten für eine Aufgabe. Ein Alleskönner wäre starke KI." }
  ],

  "probetest": {
    "titel": "Probetest: Internet, Bewertungen und KI",
    "minuten": 15,
    "hinweis": "Wie im echten Test: 15 Minuten, 15 Punkte. Bei offenen Fragen schreibst du deine Antwort, vergleichst sie danach mit der Lösung und gibst dir ehrlich Punkte.",
    "notenschluessel": [
      { "punkte": 15, "note": 6.0 }, { "punkte": 14, "note": 5.75 }, { "punkte": 13, "note": 5.25 }, { "punkte": 12, "note": 5.0 },
      { "punkte": 11, "note": 4.75 }, { "punkte": 10, "note": 4.25 }, { "punkte": 9, "note": 4.0 }, { "punkte": 8, "note": 3.75 },
      { "punkte": 7, "note": 3.25 }, { "punkte": 6, "note": 3.0 }, { "punkte": 5, "note": 2.75 }, { "punkte": 4, "note": 2.25 },
      { "punkte": 3, "note": 2.0 }, { "punkte": 2, "note": 1.75 }, { "punkte": 1, "note": 1.25 }, { "punkte": 0, "note": 1.0 }
    ],
    "fragen": [
      { "abschnitt": "Aufgabe 1 · Internet", "typ": "zuordnen", "punkte": 3,
        "frage": "1.1 Ordne jeden Begriff der passenden Beschreibung zu.",
        "paare": [
          { "links": "Router", "rechts": "Ein Gerät zu Hause, das deine Geräte mit dem Internet verbindet." },
          { "links": "Provider", "rechts": "Eine Firma, die dir den Zugang zum Internet verkauft." },
          { "links": "Server", "rechts": "Ein Computer, der Webseiten speichert und sie auf Anfrage verschickt." }
        ] },
      { "abschnitt": "Aufgabe 1 · Internet", "typ": "offen", "punkte": 1,
        "frage": "1.2 Jedes Gerät im Internet hat eine IP-Adresse. Erkläre in einem Satz, wozu man sie braucht.",
        "musterloesung": "Damit Daten das richtige Gerät finden (wie eine Postadresse). Auch: damit man Geräte im Internet eindeutig erkennen kann." },
      { "abschnitt": "Aufgabe 1 · Internet", "typ": "offen", "punkte": 1,
        "frage": "1.3 Die Webseite einer Pizzeria zeigt Anna sofort Pizzerias in ihrer Nähe, obwohl sie keinen Ort eingegeben hat. Erkläre, wie die Seite ungefähr weiss, wo Anna ist.",
        "musterloesung": "Aus Annas IP-Adresse. Eine Datenbank ordnet IP-Adressen einer Region oder Stadt zu (Geolocation)." },
      { "abschnitt": "Aufgabe 2 · Online-Bewertungen", "typ": "offen", "punkte": 3,
        "frage": "2.1 Jonas will heute Abend Pizza essen gehen. Welche Pizzeria wählst du? Begründe mit zwei Argumenten aus der Tabelle.",
        "kontext": { "kopf": ["Pizzeria", "Sterne", "Bewertungen", "Auffälligkeiten"],
          "zeilen": [["Bella", "4.9", "3", "Alle am selben Tag geschrieben, kein Text"], ["Roma", "4.2", "85", "Mit Texten, verteilt über mehrere Jahre"], ["Napoli", "–", "0", "Noch keine Bewertung"]] },
        "musterloesung": "Wahl: Roma (1 P, wenn die Wahl zu den Argumenten passt). Argumente (je 1 P): viele Bewertungen (85); über Jahre verteilt; Texte vorhanden. Bella wirkt verdächtig (nur 3 Bewertungen, alle am selben Tag, ohne Text). Auch Napoli ist möglich, wenn die Begründung stimmt." },
      { "abschnitt": "Aufgabe 2 · Online-Bewertungen", "typ": "offen", "punkte": 1,
        "frage": "2.2 Wer könnte ein Interesse daran haben, falsche Bewertungen zu schreiben? Nenne eine Person oder Gruppe und den Grund.",
        "musterloesung": "Z. B. die Besitzerin der Pizzeria (will mehr Gäste), die Konkurrenz (will schlecht machen), eine Firma, die Bewertungen verkauft. Person/Gruppe UND Grund nötig." },
      { "abschnitt": "Aufgabe 2 · Online-Bewertungen", "typ": "offen", "punkte": 1,
        "frage": "2.3 Nenne ein Merkmal, an dem du eine vertrauenswürdige Bewertung erkennst.",
        "musterloesung": "Z. B. persönliche Erfahrung beschrieben; konkrete Angaben; Text statt nur Sterne; viele Bewertungen über längere Zeit; aktuell; Verfasser bekannt." },
      { "abschnitt": "Aufgabe 3 · Künstliche Intelligenz", "typ": "auswahl", "punkte": 1,
        "frage": "3.1a Der Sprachassistent im Handy stellt den Wecker und sagt das Wetter an.",
        "optionen": ["schwache KI", "starke KI"], "richtig": 0 },
      { "abschnitt": "Aufgabe 3 · Künstliche Intelligenz", "typ": "auswahl", "punkte": 1,
        "frage": "3.1b Ein Computer kann in jedem Bereich lernen und denken wie ein Mensch.",
        "optionen": ["schwache KI", "starke KI"], "richtig": 1 },
      { "abschnitt": "Aufgabe 3 · Künstliche Intelligenz", "typ": "zuordnen", "punkte": 3,
        "frage": "3.2 Ordne jedem Beispiel die passende Lernart zu.",
        "paare": [
          { "links": "Ein Computer bekommt 1000 Fotos. Bei jedem steht «Hund» oder «Katze».", "rechts": "Überwachtes Lernen" },
          { "links": "Ein Computer sortiert Kundendaten in Gruppen. Niemand sagt ihm vorher, wie die Gruppen heissen.", "rechts": "Unüberwachtes Lernen" },
          { "links": "Ein Roboter probiert Bewegungen aus und bekommt Pluspunkte, wenn er nicht umfällt.", "rechts": "Verstärkendes Lernen" }
        ] }
    ]
  }
};
