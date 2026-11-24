# METAL GEAR — Operazione Omega

Gioco d'azione 2D. Apri `index.html` nel browser e gioca.

## Comandi
| Azione | Tastiera |
|---|---|
| Muoversi (avanti, indietro, su, giù) | Frecce o W A S D |
| Sparare (tieni premuto) | J oppure X |
| Saltare (schiva proiettili bassi, onde d'urto, lava) | K, Z o Spazio |
| Granata | L oppure C |
| Cambiare arma | Q / E oppure 1-9 |
| Pausa | P oppure Esc |
| Audio | M |

Tenendo premuto FUOCO mentre arretri, il soldato continua a sparare nella stessa direzione.
Funziona anche con il gamepad e sul telefono (comandi touch sullo schermo).

## Difficoltà
Principiante · Normale · Difficile · Estremo. Cambiano vita, danni, velocità, cadenza di fuoco e numero dei nemici, quanti sono élite (aura rossa, il doppio della vita) e se mirano in anticipo o arrivano alle spalle. Sul livello Estremo il mega boss è quasi imbattibile.

## Livelli e boss
1. Giungla di fuoco — **Rinoceronte** (carro armato)
2. Deserto dei miraggi — **Scorpione d'acciaio**
3. Città fantasma — **Avvoltoio** (elicottero)
4. Avamposto glaciale — **Titano di ghiaccio**
5. Fortezza vulcanica — **Idra di magma**
6. Il Nucleo Omega — **OMEGA GEAR**, mega boss in 3 fasi (scudo con generatori, rigenerazione, cannone Omega)

## Armi
Pistola → Fucile a pompa → Mitra → Lanciafiamme → Laser → Lanciarazzi → **Devastatore** (mitra + razzi) → Sciame al plasma (a ricerca) → Fulmine a catena → **Prisma** (laser triplo) → **Tempesta** (fucile + fulmine) → **OMEGA** (laser + razzi + plasma).
Le armi si trovano nelle casse con la **W**. Se prendi un'arma che hai già, si potenzia (fino a ★★★).

## Nemici
Recluta, Razziatore (veloce e debole), Corazzato (lento e fortissimo), Cecchino (mira laser), Drone kamikaze, Granatiere, Scudiero (para i colpi davanti: aggiralo o usa esplosivi/laser), Torretta, Spettro (ninja che si teletrasporta), Medico (cura gli altri: abbattilo per primo), Mastino cibernetico.

## Versioni
- **2.2** (24/11/2026) — corretta l'installazione come app: nel manifest `"id": "./"` valeva la radice di nemesimark.github.io, uguale per tutte le app di Nemesi Web, e installare Radente prendeva il posto di Metal Gear. Ora `"id": "/metalGear/"`.
- **2.1** (24/11/2026) — si installa come app (computer, iPhone, Android): icona, schermo intero in orizzontale, funziona anche senza rete (`sw.js`). Aperto con `?installa` (link «Installa» del portfolio Nemesi Web) mostra come installarlo (`installa.js`).
- **2.0** (22/11/2026) — grafica rifatta da capo; il gioco (comandi, armi, nemici, boss, difficoltà) è rimasto identico.
  - Protagonista, nemici e boss ridisegnati: contorni a inchiostro, ombreggiature, animazioni più morbide (corsa, salto, rinculo, capelli e bandana al vento); i boss hanno cingoli che girano, zampe articolate, rotori, cristalli, colli di magma, scudo esagonale.
  - Luci vere: spari, laser, razzi, esplosioni, lava, lampioni, insegne al neon e fulmini illuminano la scena; i livelli notturni sono bui e si accendono con le loro luci; bagliori morbidi su tutto ciò che brilla.
  - Esplosioni con palla di fuoco, onda d'urto, fumo denso, scintille, detriti e bruciature a terra; lampi alla bocca delle armi, bossoli che rimbalzano, ombre morbide sotto tutti.
  - Paesaggi più profondi: foschia sulle montagne, sole e luna che brillano, lucciole, braci, pioggia con lampi.
  - Nuovo HUD (ritratto, barre a segmenti, arma con stelle, mappa del livello, barra del boss), menu, schermate e caratteri da videogioco (Black Ops One e Teko, inclusi nel gioco: funzionano anche senza internet).
  - Scossa dello schermo più morbida, colori e vignettatura diversi per ogni livello; se il dispositivo fatica, la qualità si abbassa da sola per restare fluido.
- **1.1** (21/11/2026) — corretto il blocco delle zone (un nemico poteva restare fuori dallo schermo e impedire di andare avanti, es. livello 3); risoluzione interna limitata a 1920×1080 per restare fluido sugli schermi grandi; eventuali errori mostrati in basso sullo schermo.
- **1.0** (21/11/2026) — prima versione completa: 6 livelli, 6 boss, 12 armi, 11 nemici, 4 difficoltà, musica e suoni sintetizzati, salvataggio record e livelli sbloccati, touch e gamepad.
