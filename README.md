# Task Manager

Ein allgemeiner Aufgabenmanager mit:

- editierbaren Kategorien
- Aufgaben erstellen, bearbeiten, abhaken, löschen
- persistenter SQLite-Datenbank
- Statistik pro Kategorie
- Markdown-Export
- Markdown-Import

## Stack

- Node.js
- Express
- SQLite (`better-sqlite3`)
- statisches Frontend

## Start

```bash
npm install
npm start
```

Dann öffnen:

```bash
http://localhost:3000
```

## Datenbank

Die Aufgaben liegen in:

```bash
data/tasks.db
```

Damit kann später auch direkt auf die gespeicherten Aufgaben zugegriffen werden.

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
