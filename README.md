# Dispo-Pilot

Ein lokaler Web-Pilot zur Tagesdisposition von Serviceaufträgen. Er verbindet
Auftragsplanung, Materialbedarf, eine einfache Tagesroute und Prüfhinweise in
einer Oberfläche. Die Beispieldaten beziehen sich auf fiktive Aufträge und
Mitarbeitende.

## Zweck und Grenze

### Was der Pilot leistet

- Aufträge für einen Tagesplan einplanen und entfernen.
- Den Materialbedarf geplanter und offener Aufträge mit dem Beispiel-Lagerbestand
  vergleichen und Fehlmengen melden.
- Bei knappen Beständen eine Bestellmenge bis zum Mindestbestand vorschlagen.
- Einen Tagesplan einer von drei fiktiven Personen (Anna Keller, Luca Meier oder
  Nina Huber) zuordnen und deren Verfügbarkeit markieren.
- Arbeitszeit, Material, Mitarbeiterverfügbarkeit und Kartenkoordinaten prüfen.
- Einsätze auf einer Karte anzeigen und die Reihenfolge nach geografischer Nähe
  sortieren.
- Den aktuellen Plan, die Mitarbeiterauswahl/-verfügbarkeit und das Farbthema im
  lokalen Browser speichern.

### Was der Pilot ausdrücklich nicht leistet

- Keine Anmeldung, Rollen, gemeinsame Datenbank oder Synchronisation zwischen
  Geräten und Benutzern.
- Keine Anbindung an ein ERP, Lager-, Einkaufs- oder Personalverwaltungssystem.
- Keine echte Bestellung: Die Bestellliste ist ein Vorschlag zum Kopieren.
- Keine produktiven Mitarbeiterdaten oder individuelle Zuweisung verschiedener
  Aufträge an mehrere Mitarbeiter. Der Tagesplan wird als Ganzes einer Demo-Person
  zugeordnet.
- Keine verbindliche Verkehrsauskunft oder garantierte Routenoptimierung. Die
  Sortierung nutzt geografische Nähe; die Kartenroute hängt von einem externen
  Routendienst ab.
- Keine automatische Live-Aktualisierung der Dateien unter `data/`. Die Anwendung
  verwendet derzeit die TypeScript-Datensätze unter `src/data/`.

Der Pilot dient zum Ausprobieren des Ablaufs und der Prüfregeln. Vor einem
produktiven Einsatz müssen reale Datenquellen, Benutzerrechte, Zuständigkeiten und
die fachliche Richtigkeit der Stammdaten geklärt werden.

## Voraussetzungen und Start

- Node.js (aktuelle LTS-Version empfohlen) und npm
- Netzwerkzugriff für Installation und Karten-/Routendienste

Im Projektverzeichnis:

```sh
npm ci
npm run dev
```

Die vom Dev-Server ausgegebene lokale Adresse öffnen; üblicherweise ist das
`http://localhost:8080`. Unter Windows PowerShell können die Befehle mit
`npm.cmd ci` und `npm.cmd run dev` gestartet werden.

Nicht `node src/routes/index.tsx` ausführen: Node startet die TSX-Dateien nicht
direkt. Vite verarbeitet TypeScript und JSX.

Es ist keine `.env`-Datei erforderlich. Die Beispielanwendung verwendet keine
benutzerspezifischen Umgebungsvariablen.

## Beispieldaten und Konfiguration

Die Stammdaten liegen derzeit als TypeScript-Konstanten in
`src/data/dispo-data.ts`. Die Dateien `data/auftraege.json` und
`data/inventar.csv` sind Referenz-/Quelldateien; Änderungen dort allein ändern
die Laufzeitdaten der Anwendung nicht.

Ein Auftrag muss zum `Order`-Typ passen. Beispiel für einen Eintrag in `ORDERS`:

```ts
{
  id: "A-110",
  client: "Beispielbetrieb",
  town: "Aarau",
  street: "Musterstrasse 1",
  title: "Netzwerkanschluss prüfen",
  minutes: 60,
  tasks: ["Anschluss prüfen", "Verbindung testen"],
  items: [{ sku: "NET-01", label: "Patchkabel", qty: 2 }],
}
```

Jede verwendete Material-SKU sollte auch im `INVENTORY`-Array vorhanden sein,
zum Beispiel:

```ts
{ sku: "NET-01", label: "Patchkabel", stock: 8 }
```

Für einen neuen Einsatzort zusätzlich `ORDER_GEO` in
`src/data/dispo-geo.ts` ergänzen:

```ts
"A-110": { lat: 47.392, lng: 8.044, approx: true }
```

`approx: true` kennzeichnet eine ungefähre Koordinate. Nach Änderungen an den
TypeScript-Datensätzen die App neu laden und die Planung prüfen.

## Konkreter Benutzerweg

1. `/` öffnen. Die Übersicht zeigt Tagesplan, Materialstatus und Prüfbereich.
2. Unter **Aufträge** einen Auftrag auswählen und **Einplanen**. Reicht das
   Material nicht, wird der Grund mit fehlender Menge angezeigt.
3. Unter **Mitarbeiter** eine Demo-Person auswählen und ihre heutige
   Verfügbarkeit festlegen. Diese Auswahl gilt für den gesamten Tagesplan.
4. In der **Übersicht** **Prüfung starten** wählen. Ergebnisse werden als
   bestanden, Fehler, Hinweis oder noch offen mit Erklärung dargestellt.
5. Unter **Lager** Bestand und Bestellvorschläge prüfen. Die Bestellliste enthält
   Fehl-/Knappstatus, Menge und betroffene Aufträge; **Liste kopieren** kopiert
   sie in die Zwischenablage.
6. Unter **Einsätze** die Tagesroute aufrufen. Bei mehreren Einsätzen kann die
   Reihenfolge über die Routenfunktion sortiert werden.

## Prüfen und bauen

```sh
npm test
npm run lint
npm run build
```

Unter Windows PowerShell: `npm.cmd test`, `npm.cmd run lint` und
`npm.cmd run build`.

Optional kann die Standalone-Version gebaut werden:

```sh
npm run build:standalone
```

Das Ergebnis liegt laut Build-Skript unter `dist-standalone/`. Nach Änderungen an
Code oder Daten muss es neu gebaut werden.

## Datenfluss und wichtige Ordner

1. `src/routes/index.tsx` bindet die Hauptseite `/` ein.
2. `src/components/dispo/DispoBoardV2.tsx` liest die Aufträge und den Bestand,
   verwaltet die Ansichten und den Tagesplan und speichert lokale Einstellungen
   im Browser-`localStorage`.
3. `src/lib/dispo.ts` summiert Materialbedarf, prüft Fehlmengen und berechnet die
   Bestellvorschläge.
4. `src/lib/daily-plan-check.ts` prüft Mitarbeiterverfügbarkeit, Material,
   Kartenkoordinaten und Arbeitszeit.
5. `src/components/dispo/RouteMap.tsx` rendert die Karte und fragt für die
   Straßenroute den externen OSRM-Dienst ab.

| Pfad                     | Zweck                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| `src/routes/`            | App-Routen, einschließlich `/` und `/v2`                           |
| `src/components/dispo/`  | Dispositionsoberfläche und Routenkarte                             |
| `src/data/dispo-data.ts` | Laufzeitdaten für Aufträge und Materialbestand                     |
| `src/data/dispo-geo.ts`  | Betriebshof und Einsatzkoordinaten                                 |
| `src/lib/`               | Dispositions- und Prüfregeln                                       |
| `src/test/`              | Vitest-Tests                                                       |
| `data/`                  | JSON-/CSV-Referenzdaten, derzeit nicht direkt zur Laufzeit geladen |
| `dist-standalone/`       | Ausgabe der optionalen Standalone-Version                          |

Der Plan wird im Browser unter `dispo-v2-plan`, Mitarbeiterauswahl und
Verfügbarkeit unter `dispo-v2-employee` und das Farbthema unter `dispo-v2-theme`
gespeichert. Das ist keine gemeinsame oder serverseitige Speicherung; ein anderer
Browser oder ein gelöschter Website-Speicher hat einen anderen/leeren Stand.

## Fachregeln und Entscheidungen

- Der Beispiel-Arbeitstag beginnt um 07:30 Uhr; die Planung ist auf höchstens
  9 Stunden begrenzt.
- Für die Arbeitszeitprüfung zählen Auftragsdauer plus geschätzte 15 Minuten
  Fahrtzeit zwischen aufeinanderfolgenden Einsätzen.
- Materialbedarf wird über alle geplanten und offenen Aufträge je SKU summiert.
- Die Bestellschwelle ist mindestens 1 Stück oder 20 % des Lagerbestands
  (aufgerundet). Die Bestellmenge füllt den prognostizierten Bestand nach geplantem
  und offenem Bedarf bis zu dieser Schwelle auf.
- Die Kartenroute verwendet externe Kartendaten und einen externen Routendienst.
  Sind diese nicht erreichbar, werden die Orte ersatzweise mit Luftlinien
  verbunden.
- Die Auftrags-, Lager- und Personendaten sind Demonstrationsdaten. Die App
  validiert sie nicht gegen ein produktives Quellsystem.

## Bekannte Einschränkungen und nächste Schritte

- `npm run lint` meldet derzeit umfangreiche Prettier-Zeilenumbruchfehler in der
  älteren, nicht aktiven `src/components/dispo/DispoBoard.tsx`. Die neuen
  Dispositions-/Prüfdateien können gezielt mit ESLint geprüft werden; die alte
  Datei wurde dafür nicht automatisch umformatiert.
- Ohne Internetverbindung sind externe Kartenkacheln und die Straßenroute
  möglicherweise nicht verfügbar; die Disposition und Materialprüfung bleiben
  lokal nutzbar.
- Als nächste Schritte bieten sich ein geprüfter Import der CSV-/JSON-Daten,
  dauerhafte gemeinsame Speicherung mit Anmeldung sowie echte Mitarbeiter- und
  Auftragszuweisungen an.

**Zuständigkeit:** Im Repository ist derzeit keine verantwortliche Person oder
Kontaktadresse dokumentiert. Vor einer produktiven Nutzung bitte Projektverantwortliche
und Supportkontakt hier ergänzen.
