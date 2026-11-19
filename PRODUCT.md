# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Cittadini, giornalisti locali, amministratori e tecnici comunali, ricercatori. Il caso principale è il telefono, da un link condiviso o dalla pagina PalermoHub (`atlante_pnrr.html`, in iframe). Lavoro: capire quanto PNRR è arrivato a un territorio e a che punto sono i lavori. (Dedotto dal repository e dal brief; da confermare.)

## Product Purpose
Atlante statico dei 291.398 progetti PNRR (Italia Domani, estrazione 13/06/2026): scheda per Italia, regione, provincia, comune, mappa dei comuni, statistiche, relazione. Successo: trovare il proprio comune e leggere finanziamento e stato lavori in pochi tocchi.

## Positioning
Dati ufficiali aperti letti a livello di singolo comune, con avvisi su ritardi e progetti a rischio, di OpenDataSicilia / PalermoHub.

## Operating Context
Sito statico su GitHub Pages (`palermohub.github.io/atlante_pnrr/`), incorporato in `atlante_pnrr.html` tra intestazione e piede PalermoHub. PMTiles con richieste Range; router a hash (`#/r/…`, `#/p/…`, `#/c/…`).

## Capabilities and Constraints
Nessun framework né build: HTML/CSS/JS statici, MapLibre da CDN. Nessun font remoto da CDN. Link con hash già condivisi da non rompere. Funzioni da conservare: filtri cliccabili per missione/stadio/natura, tabelle ordinabili, legende interattive, Info, Condividi, temi.

## Brand Commitments
Credito «OpenDataSicilia»; logo ad anello a sette missioni (`img/logo-pnrr.svg`). Blu PNRR come accento. Font Titillium Web autoospitato (scelta confermata).

## Evidence on Hand
Dati in `data/*.json` e `data/geo/comuni.pmtiles`; documenti in `docs/`. Nessun test utente disponibile.

## Product Principles
Prima il dato, poi i controlli. Cerca, non scorrere. Niente si perde. Compatibile con l'incorporamento. Veloce.

## Accessibility & Inclusion
WCAG AA, tastiera, target ≥ 44 px, `prefers-reduced-motion`, alto contrasto, nessuno zoom bloccato.
