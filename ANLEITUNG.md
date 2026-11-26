# Dispo – Material-Disposition

Eigenständige Web-App zum Einplanen von Aufträgen mit live Materialabgleich.
Fehlendes oder unzureichendes Material wird sofort als Fehlermeldung angezeigt.

## Ausführen

```
bun install
bun run dev
```

Die App läuft dann auf http://localhost:8080.

Andere Möglichkeit: `npm install` und `npm run dev`.

Unter Windows PowerShell kann die App auch so gestartet werden:

```
npm.cmd start
```

Die TSX-Dateien nicht direkt mit `node` starten. Sie werden vom Vite-Dev-Server
verarbeitet.

## Wo was liegt

| Datei                                 | Inhalt                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `src/data/dispo-data.ts`              | Aufträge (aus auftraege.json) und Lagerbestand (aus inventar.csv)           |
| `src/lib/dispo.ts`                    | Rechenlogik: Materialbedarf je Auftrag, Bestand prüfen, Fehlmenge berechnen |
| `src/components/dispo/DispoBoard.tsx` | Oberfläche: Auftragsliste, Tagesplan, Fehlermeldungen, Bestandsbalken       |
| `src/routes/index.tsx`                | Seite "/"                                                                   |
| `src/styles.css`                      | Farben und Design-Variablen                                                 |
| `data/`                               | Die Original-Dateien auftraege.json und inventar.csv                        |

## Materialprüfung

Beim «Einplanen» eines Auftrags wird der Bedarf aller benötigten Artikel gegen
den noch freien Bestand gerechnet. Reicht ein Artikel nicht, erscheint eine
rote Meldung mit der genauen Fehlmenge (z. B. «Patchkabel: 2 Stück zu wenig»)
und der Auftrag wird nicht eingeplant.

## Tagesplan prüfen

In der Übersicht startet «Prüfung starten» einen Prüflauf für Mitarbeiter,
Materialbestand, Kartenkoordinaten der Route und Arbeitszeit. Im Bereich
«Mitarbeiter» wird der aktuelle Tagesplan einer von drei Demo-Personen
(Anna Keller, Luca Meier oder Nina Huber) zugeteilt und deren heutige
Verfügbarkeit gesetzt. Der Mitarbeiter-Button in der Kopfzeile öffnet diese
Zuweisung.
Fehler werden rot mit Erklärung angezeigt; ungefähre Kartenkoordinaten erscheinen
als Hinweis.

Ein Mitarbeiter darf pro Tag höchstens 9 Stunden eingeplant werden. Dabei zählen
Auftragsdauer und geschätzte 15 Minuten Fahrzeit zwischen den Einsätzen. Die
Grenze wird beim manuellen und automatischen Einplanen berücksichtigt.

Die Materialübersicht erstellt automatisch eine Bestellliste aus dem Bedarf aller
geplanten und offenen Aufträge. Sie summiert Fehlmengen je Artikel und schlägt
zusätzlich einen Mindestbestand von 1 Stück oder 20 % des Lagerbestands vor.
Die Liste enthält Bestellmengen und betroffene Aufträge und kann kopiert werden.

## Test

```
bun run test
```
