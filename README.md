# Atlante del PNRR

Dove e come sono stati spesi i fondi del PNRR: una scheda per Italia, regione, provincia e comune, collegate fra loro, con mappa dei comuni, imbuto di avanzamento (finanziato → gara aggiudicata → lavori avviati → concluso → pagato), per missione, per natura, chi realizza, qualità dei dati e elenco dei progetti di ogni comune.

Dati: [Italia Domani, Catalogo Open Data](https://www.italiadomani.gov.it/content/sogei-ng/it/it/catalogo-open-data.html) (CC-BY 4.0), estrazione del 13/06/2026. Confini dei comuni: ISTAT, tramite il repository ANNCSU. Popolazione: ISTAT, 1/1/2026; per i temi giovani, salute, PA digitale e acqua anche ISTAT 1/1/2024 (singole età: residenti 0-24 e 65 e più) e 1/1/2022 per il confronto dei giovani. Reddito imponibile medio per contribuente: MEF, dichiarazioni dei redditi 2023, diffuso da ISTAT (`MEF_REDDITIIRPEF_COM`). Aree interne: ISTAT/SNAI 2020, SITUAS report 75 (`AREE_INT_2020`). Popolazione 2011 e 2024: ISTAT demo, RCS «Popolazione residente per cittadinanza». NEET 15-29 anni: Eurostat `edat_lfse_22`, 2024 (regionale).

## Pagine
- `index.html`: mappa e schede (Italia, regione, provincia, comune).
- `statistiche.html`: grafici sull'insieme dei dati.
- Temi: `data/giovani.json` (euro per giovane 0-24), `data/sanita.json` (Missione 6 «Salute» per comune, provincia e regione, con la quota regionale non attribuibile ai comuni) `data/pa_digitale.json` (Missione 1.1 «PA digitale», sei gruppi di misure) e `data/acqua.json` (Missione 2.4 «Tutela del territorio e della risorsa idrica», cinque gruppi, con la quota di soldi che ha un comune come soggetto attuatore).
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
python3 scrpits/sanita.py      # data/sanita.json (PNRR per la salute: Missione 6, richiede dati/pnrr.duckdb)
python3 scrpits/pa_digitale.py # data/pa_digitale.json (PNRR per la PA digitale: Missione 1.1, richiede dati/pnrr.duckdb)
python3 scrpits/acqua.py       # data/acqua.json (PNRR per l’acqua e il dissesto: Missione 2.4, richiede dati/pnrr.duckdb)
python3 scrpits/neet.py        # dati/geo/neet_2024.json (Eurostat, NEET regionale)
python3 scrpits/contesto.py    # data/contesto.json (reddito, aree interne, NEET)
```
Il sito è statico: serve un server che supporti le richieste HTTP Range (GitHub Pages sì; `python3 -m http.server` no) per il file `data/geo/comuni.pmtiles`.

Il metodo e i limiti sono nella finestra «Metodo e limiti» del sito e in `docs/PIANO.md`.
