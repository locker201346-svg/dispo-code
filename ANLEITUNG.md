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

## Wo was liegt

| Datei | Inhalt |
|---|---|
| `src/data/dispo-data.ts` | Aufträge (aus auftraege.json) und Lagerbestand (aus inventar.csv) |
| `src/lib/dispo.ts` | Rechenlogik: Materialbedarf je Auftrag, Bestand prüfen, Fehlmenge berechnen |
| `src/components/dispo/DispoBoard.tsx` | Oberfläche: Auftragsliste, Tagesplan, Fehlermeldungen, Bestandsbalken |
| `src/routes/index.tsx` | Seite "/" |
| `src/styles.css` | Farben und Design-Variablen |
| `data/` | Die Original-Dateien auftraege.json und inventar.csv |

## Materialprüfung

Beim «Einplanen» eines Auftrags wird der Bedarf aller benötigten Artikel gegen
den noch freien Bestand gerechnet. Reicht ein Artikel nicht, erscheint eine
rote Meldung mit der genauen Fehlmenge (z. B. «Patchkabel: 2 Stück zu wenig»)
und der Auftrag wird nicht eingeplant.

## Test

```
bun run test
```
