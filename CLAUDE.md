# Metal Gear — gioco 2D run-and-gun

Gioco d'azione 2D a scorrimento laterale (HTML5 canvas, JavaScript puro, nessuna dipendenza).
Un soldatino si muove avanti/indietro/su/giù in una fascia di terreno, salta, spara e lancia granate.
6 livelli (5 con boss + finale con il mega boss OMEGA GEAR), 12 armi (anche combinate), 11 tipi di nemici, 4 difficoltà.

## Dove sta
- Solo in locale: `~/Desktop/Apps/metalGear`. Non è (ancora) un repository git e non è online.

## Come si prova
- Basta aprire `index.html` nel browser (funziona anche da file://, niente server).
- Oppure: `python3 -m http.server 8000` nella cartella e aprire http://localhost:8000.
- In console del browser `G` è lo stato del gioco (utile per prove: `startRun(4)`, `G.player.inv = 999`).

## Struttura
- `index.html` — pagina e caricamento degli script (in ordine).
- `js/core.js` — costanti, salvataggi (localStorage `metalgear_*`), input (tastiera, mouse, touch, gamepad), audio sintetizzato e musiche.
- `js/backgrounds.js` — paesaggi procedurali a parallasse (giungla, deserto, città, artico, vulcano, nucleo).
- `js/weapons.js` — armi del giocatore (`WEAPONS`, ordine in `WORDER`).
- `js/enemies.js` — nemici (`ETYPES`): comportamento e disegno.
- `js/bosses.js` — boss (`BOSSES`) e mega boss `omega`.
- `js/levels.js` — livelli (zone, ondate, casse con armi) e tabella difficoltà `DIFFS`.
- `js/game.js` — ciclo di gioco, collisioni, HUD, menu e schermate.

## Regole di lavoro
- Versioni e novità nel `LEGGIMI.md`.
- Commit solo su richiesta (serve prima `git init` e un remoto).
- «g» = commit e push (vedi istruzioni generali); oggi la cartella non è un repository.
- Dopo modifiche: `for f in js/*.js; do node --check $f; done` e una prova nel browser.

## In sospeso
- Nessuna pubblicazione online decisa.
- "Metal Gear" è un marchio registrato Konami: se il gioco va pubblicato, va rinominato.
