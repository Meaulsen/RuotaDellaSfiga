# Cartellone lavori di casa

Il cartellone «Chi ha tempo, fa» come **web app**: si apre a tutto schermo dall'icona
sulla schermata Home dell'iPhone, funziona anche senza rete e si può ancora stampare
su un A4 da appendere al frigo.

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

Compare l'icona con la lista dorata. Toccandola il cartellone si apre a tutto schermo,
senza barra degli indirizzi e senza pulsanti del browser.

> Da Chrome per iPhone il pulsante Condividi è nel menù **···** in basso a destra.
> Su Android il pulsante è **«Installa app»** / «Aggiungi a schermata Home».

## 3. Aggiornare il cartellone

Modifica `index.html` (i lavori sono le righe `<tr class="task">`) e fai commit.
Il sito si aggiorna da solo dopo qualche decina di secondi.

L'app tiene una copia locale delle pagine per funzionare offline: se dopo un
aggiornamento il telefono mostra ancora la versione vecchia, cambia `VERSION`
in `sw.js` (per esempio da `v1` a `v2`) e fai commit — al primo avvio con rete
l'app scarica la versione nuova.

## Cosa c'è dentro

| File | A cosa serve |
| --- | --- |
| `index.html` | il cartellone: unica pagina, stile e testi |
| `manifest.webmanifest` | nome, icona, colori e apertura a tutto schermo |
| `sw.js` | service worker: fa funzionare l'app anche senza rete |
| `icons/` | icona per la Home (180/192/512 px, versione mascherabile e SVG) |
| `fonts/` | Fraunces e Inter self-ospitati, così i caratteri si vedono anche offline |
| `.nojekyll` | dice a GitHub Pages di pubblicare i file così come sono |

I caratteri Fraunces e Inter sono di Google Fonts, distribuiti con licenza
SIL Open Font License 1.1.
