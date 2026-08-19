# Chi ha tempo, fa

I lavori di casa divisi in due, come **web app**: si apre a tutto schermo dall'icona
sulla schermata Home dell'iPhone, tiene il conto delle firme settimana per settimana
e funziona anche senza rete. Tutto resta sul telefono: non c'è nessun server.

## 1. Pubblicare il sito (una volta sola)

Su GitHub, in questo repository:

1. **Settings** → **Pages** (menù di sinistra).
2. In *Build and deployment* → *Source* scegli **Deploy from a branch**.
3. *Branch*: **`claude/web-app-home-screen-icon-p0sr17`** (è già il branch
   predefinito del repository), cartella **/ (root)**. Salva.
4. Dopo un paio di minuti il sito è online a:

   **https://meaulsen.github.io/RuotaDellaSfiga/**

Se la pagina dà 404, aspetta ancora un minuto e ricarica: la prima pubblicazione è lenta.

> Se un domani rinomini il branch (per esempio in `main`), ricordati di rimettere
> il nome giusto in *Settings → Pages*.

## 2. Mettere l'icona sulla Home dell'iPhone

1. Apri **https://meaulsen.github.io/RuotaDellaSfiga/** (va bene sia Safari sia Chrome,
   da iOS 16.4 in poi funzionano tutti e due).
2. Tocca il pulsante **Condividi** (il quadrato con la freccia verso l'alto).
3. Scegli **«Aggiungi a Home»** e conferma.

Toccando l'icona l'app si apre a tutto schermo, senza barra degli indirizzi.

> Da Chrome per iPhone il pulsante Condividi è nel menù **···** in basso a destra.
> Su Android il pulsante è **«Installa app»** / «Aggiungi a schermata Home».

## 3. Come si usa

- **Scrivete i vostri nomi** nelle due schede in alto: l'iniziale diventa la firma.
- **Toccate la scheda** di chi sta per segnare: è quella con la cornice colorata.
  L'iniziale compare anche dentro il tasto tratteggiato di ogni lavoro, così si vede
  sempre per chi vale il tocco.
- **Tocca il tasto tratteggiato** accanto a un lavoro per firmarlo. Ogni tocco è una
  firma: sotto al nome del lavoro compare *quante volte l'avete fatto su quante ne
  servirebbero* in una settimana.
- **Per togliere una firma** basta toccarla; compare «Annulla» in fondo allo schermo
  per qualche secondo.
- Il **bilancio** si aggiorna da solo e dice chi offre il caffè.
- Le frecce **‹ ›** in alto spostano la settimana: le settimane vecchie restano lì,
  ogni lunedì si riparte da zero senza dover cancellare niente.
- **«Un lavoro che qui non c'è»** aggiunge i vostri lavori; la **×** li toglie.
- Le note della settimana e i nomi si salvano da soli.

Tutto è salvato nella memoria del browser (`localStorage`), quindi ogni telefono ha la
sua copia: i due telefoni non si sincronizzano fra loro.

## 4. Cambiare i lavori di partenza

L'elenco è la costante `GRUPPI` in fondo a `index.html`: ogni riga è
`["codice", "Nome del lavoro", volte_a_settimana]`. Il *codice* è quello con cui le
firme vengono salvate, quindi conviene non cambiarlo per i lavori già in uso.

Dopo un aggiornamento il telefono potrebbe mostrare ancora la versione vecchia,
perché l'app tiene una copia locale: cambia `VERSION` in `sw.js` (per esempio da
`v2` a `v3`) e fai commit — al primo avvio con rete l'app si aggiorna.

## Cosa c'è dentro

| File | A cosa serve |
| --- | --- |
| `index.html` | tutta l'app: elenco lavori, stile e logica |
| `manifest.webmanifest` | nome, icona, colori e apertura a tutto schermo |
| `sw.js` | service worker: fa funzionare l'app anche senza rete |
| `icons/` | icona per la Home (180/192/512 px, versione mascherabile e SVG) |
| `fonts/` | Fraunces e Inter self-ospitati, così i caratteri si vedono anche offline |
| `.nojekyll` | dice a GitHub Pages di pubblicare i file così come sono |

I caratteri Fraunces e Inter sono di Google Fonts, distribuiti con licenza
SIL Open Font License 1.1.
