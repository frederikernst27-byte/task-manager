# Task Manager

Ein allgemeiner Aufgabenmanager mit:

- editierbaren Kategorien
- Aufgaben erstellen, bearbeiten, abhaken, löschen
- Statistik pro Kategorie
- Markdown-Export
- Markdown-Import
- Speicherung per `localStorage`

## Deployment

Diese Version ist komplett statisch und daher sehr einfach auf Vercel, GitHub Pages oder Netlify deploybar.

Wichtig:

- Für Vercel wird nur `public/index.html` ausgeliefert.
- Es wird **kein Node-Server** und **keine Datenbank** für diese Version benötigt.
- Speicherung bleibt bewusst bei `localStorage`.

## Hinweis

Die Daten werden im Browser gespeichert. Das heißt:

- sie bleiben für denselben Browser/dasselbe Gerät erhalten
- sie synchronisieren sich nicht automatisch zwischen verschiedenen Geräten

## Markdown Export

Exportiert alle Aufgaben nach Kategorien sortiert.

## Markdown Import

Erwartetes Format zum Beispiel:

```md
## Arbeit
- [ ] Ticket prüfen
- [x] Mail beantworten — Done

## Privat
- [ ] Einkaufen
```
