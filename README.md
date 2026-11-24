# Atlante del PNRR

Dove e come sono stati spesi i fondi del PNRR: una scheda per Italia, regione, provincia e comune, collegate fra loro, con mappa dei comuni, imbuto di avanzamento (finanziato → gara aggiudicata → lavori avviati → concluso → pagato), per missione, per natura, chi realizza, qualità dei dati e elenco dei progetti di ogni comune.

Dati: [Italia Domani, Catalogo Open Data](https://www.italiadomani.gov.it/content/sogei-ng/it/it/catalogo-open-data.html) (CC-BY 4.0), estrazione del 13/06/2026. Confini dei comuni: ISTAT, tramite il repository ANNCSU. Popolazione: ISTAT, 1/1/2026; per il tema giovani anche ISTAT 1/1/2024 e 1/1/2022 (singole età). Reddito imponibile medio per contribuente: MEF, dichiarazioni dei redditi 2023, diffuso da ISTAT (`MEF_REDDITIIRPEF_COM`). Aree interne: ISTAT/SNAI 2020, SITUAS report 75 (`AREE_INT_2020`). NEET 15-29 anni: Eurostat `edat_lfse_22`, 2024 (regionale).

## Pagine
- `index.html`: mappa e schede (Italia, regione, provincia, comune).
- `statistiche.html`: grafici sull'insieme dei dati.
- `relazione.html` (nel menu «Cosa dicono i dati»): lettura dei dati in parole semplici, con mappe e grafici interattivi. Le cifre vengono da `data/*.json` e si ricontrollano con `python3 scrpits/relazione_numeri.py`. I numeri che non stanno nei JSON (divario tra dotazione e progetti) sono in `data/verifiche.json`, con la fonte.

Per provare in locale le mappe serve un server che gestisca le richieste «Range» (i PMTiles): `python3 -m http.server` non basta.

## Rigenerare i dati
```
python3 -m venv scrpits/.venv && scrpits/.venv/bin/pip install duckdb openpyxl
python3 scrpits/catalogo_elenco.py dati/catalogo.json     # elenco dataset
python3 scrpits/catalogo_scarica.py                       # CSV (circa 2 GB, in dati/, fuori dal repository)
scrpits/.venv/bin/python -I scrpits/ingestione.py         # CSV -> dati/pnrr.duckdb con controllo righe
scrpits/.venv/bin/python -I scrpits/audit_chiavi.py       # genera anagrafica comuni e controlla le chiavi
scrpits/.venv/bin/python -I scrpits/modello.py            # progetto, quote territoriali, stadi
scrpits/.venv/bin/python -I scrpits/verifica_dati.py      # invarianti e quadratura (docs/QUADRATURA.md)
scrpits/.venv/bin/python -I scrpits/esporta_json.py && python3 scrpits/bbox.py
python3 scrpits/giovani.py      # data/giovani.json (PNRR per giovane, richiede dati/pnrr.duckdb)
python3 scrpits/neet.py        # dati/geo/neet_2024.json (Eurostat, NEET regionale)
python3 scrpits/contesto.py    # data/contesto.json (reddito, aree interne, NEET)
```
Il sito è statico: serve un server che supporti le richieste HTTP Range (GitHub Pages sì; `python3 -m http.server` no) per il file `data/geo/comuni.pmtiles`.

Il metodo e i limiti sono nella finestra «Metodo e limiti» del sito e in `docs/PIANO.md`.
