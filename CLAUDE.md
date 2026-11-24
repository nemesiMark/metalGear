# Metal Gear — gioco 2D run-and-gun

Gioco d'azione 2D a scorrimento laterale (HTML5 canvas, JavaScript puro, nessuna dipendenza).
Un soldatino si muove avanti/indietro/su/giù in una fascia di terreno, salta, spara e lancia granate.
6 livelli (5 con boss + finale con il mega boss OMEGA GEAR), 12 armi (anche combinate), 11 tipi di nemici, 4 difficoltà.

## Dove sta
- Cartella: `~/Desktop/Apps/metalGear`.
- Repository: https://github.com/nemesiMark/metalGear (ramo `main`). Online con GitHub Pages: https://nemesimark.github.io/metalGear/

## Come si prova
- Basta aprire `index.html` nel browser (funziona anche da file://, niente server).
- Oppure: `python3 -m http.server 8000` nella cartella e aprire http://localhost:8000.
- In console del browser `G` è lo stato del gioco (utile per prove: `startRun(4)`, `G.player.inv = 999`).

## Struttura
- `index.html` — pagina e caricamento degli script (in ordine: fonts, core, fx, backgrounds, weapons, enemies, bosses, levels, game).
- `js/fonts.js` — caratteri incorporati in base64 (Black Ops One per i titoli, Teko per l'interfaccia; licenza SIL OFL).
- `js/core.js` — costanti, salvataggi (localStorage `metalgear_*`), input (tastiera, mouse, touch, gamepad), audio sintetizzato e musiche.
- `js/fx.js` — motore grafico: colori (`tone`, `rgba`), sprite di bagliore/fuoco/fumo in cache, `FX` (luce ambiente dei livelli bui, bagliori additivi, vignettatura, grana), primitive "a inchiostro" (`ink`, `seg`, `circ`), `ease`.
- `js/backgrounds.js` — paesaggi procedurali a parallasse (giungla, deserto, città, artico, vulcano, nucleo), con luci `FX.glow`/`FX.light`.
- `js/weapons.js` — armi del giocatore (`WEAPONS`, ordine in `WORDER`).
- `js/enemies.js` — nemici (`ETYPES`): comportamento e disegno (`drawSoldier` per i soldati).
- `js/bosses.js` — boss (`BOSSES`) e mega boss `omega`.
- `js/levels.js` — livelli (zone, ondate, casse con armi) e tabella difficoltà `DIFFS`.
- `js/game.js` — ciclo di gioco e collisioni; la sezione `RENDER` (fino a `loop`) è solo grafica: `LOOK` (luce e colori per livello), HUD, menu e schermate.
- Ogni fotogramma: `FX.begin` → disegno del mondo → `FX.compose` (luci + bagliori) → `FX.post` (tinta, vignettatura) → HUD.
- La grafica sta solo nelle funzioni `draw`/`render`: modificandola non si tocca il comportamento del gioco.


## App installabile (PWA)
- `manifest.webmanifest`, `sw.js` (copia dei file per l'uso senza rete; cache `nemesi-metalgear-N`: **alzare `VERSIONE` in `sw.js` e aggiornare `FILE` quando si aggiungono o rinominano file**), `icone/` (`icona.svg` → PNG 180/192/512 a tutto quadrato), `installa.js` (uguale nelle quattro app di Nemesi Web: registra `sw.js` e con `?installa` nell'indirizzo mostra il riquadro per installare). Nel manifest `id` dev'essere `"/metalGear/"` (con `"./"` diventa la radice di nemesimark.github.io per tutte le app: Chrome le scambia per la stessa app e installarne una sovrascrive l'altra).
- Il portfolio Nemesi Web porta a `…/?installa` con il link «Installa».

## Regole di lavoro
- Versioni e novità nel `LEGGIMI.md`.
- Commit solo su richiesta.
- «g» = commit e push su GitHub (prima: `node --check` su tutti i file in `js/`).
- Dopo modifiche: `for f in js/*.js; do node --check $f; done` e una prova nel browser.

## In sospeso
- "Metal Gear" è un marchio registrato Konami e il gioco è online con questo nome (GitHub Pages): conviene rinominarlo.
