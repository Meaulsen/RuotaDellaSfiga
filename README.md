# Chi ha tempo, fa

I lavori di casa divisi in due. È una pagina web come un'altra: si apre in
qualsiasi browser moderno, su computer, tablet o telefono. Se vuoi, si installa
come app e si apre a tutto schermo, con la sua icona. Tiene il conto delle firme
settimana per settimana, funziona anche senza rete e — se accendi la casa
condivisa — mostra gli stessi dati su tutti i dispositivi che colleghi.

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

## 2. Aprirla, e volendo installarla

L'indirizzo si apre e basta, in Chrome, Safari, Firefox o Edge. Per averla come
app vera, con l'icona e senza barra degli indirizzi:

- **iPhone e iPad** — pulsante **Condividi** (il quadrato con la freccia) →
  **«Aggiungi a Home»**. Da iOS 16.4 in poi funziona sia da Safari sia da Chrome
  (dove Condividi sta nel menù **···** in basso a destra).
- **Android** — menù **⋮** → **«Installa app»** / «Aggiungi a schermata Home».
- **Computer** — in Chrome o Edge compare l'icona **Installa** in fondo alla
  barra degli indirizzi; su Safari per Mac, *File → Aggiungi al Dock*. Oppure
  lascia perdere e tieniti un segnalibro: cambia solo la cornice.

## 3. Come si usa

- **Scrivete i vostri nomi** nelle due schede in alto: l'iniziale diventa la firma.
  Se avete acceso la casa condivisa i nomi si scelgono quando la si crea, e dopo
  restano quelli (le schede diventano non modificabili).
- **Scegliete chi sta segnando** toccando (o cliccando) la sua scheda: è quella con
  la cornice colorata. L'iniziale compare anche dentro il tasto tratteggiato di
  ogni lavoro, così si vede sempre per chi vale il colpo.
- **Il tasto tratteggiato** accanto a un lavoro lo firma. Ogni volta è una firma:
  sotto al nome del lavoro compare *quante volte l'avete fatto su quante ne
  servirebbero* in una settimana.
- **Per togliere una firma** basta toccarla; compare «Annulla» in fondo allo schermo
  per qualche secondo.
- Il **bilancio** si aggiorna da solo e dice chi offre il caffè.
- Le frecce **‹ ›** in alto spostano la settimana: le settimane vecchie restano lì,
  ogni lunedì si riparte da zero senza dover cancellare niente.
- **«Un lavoro che qui non c'è»** aggiunge i vostri lavori; la **×** li toglie.
- Le note della settimana e i nomi si salvano da soli.

## 4. Accendere la casa condivisa (Firebase)

Finché `config.js` è vuoto, i dati restano nel browser che apre l'app — quindi
ogni dispositivo, e perfino ogni browser dello stesso computer, ha la sua copia — e
la scheda «Su più dispositivi» non compare nemmeno. Per farli parlare servono
cinque minuti di clic su Firebase: il piano gratuito basta e avanza.

1. Vai su **https://console.firebase.google.com** e crea un progetto
   (il nome è a piacere; Google Analytics non serve).
2. Nel menù a sinistra: **Build → Realtime Database → Crea database**.
   Scegli la regione più vicina (per l'Italia va bene *europe-west1*) e parti in
   **modalità bloccata**: le regole giuste le mettiamo al passo 3.
3. Apri la scheda **Regole**, incolla tutto il contenuto del file
   [`database.rules.json`](database.rules.json) di questo repository e **Pubblica**.
4. Torna su **Panoramica progetto**, tocca l'icona **`</>`** (app Web), registra
   l'app (nome a piacere, *non* serve Firebase Hosting) e copia i valori di
   `firebaseConfig`.
5. Incolla `apiKey`, `authDomain`, `databaseURL` e `projectId` dentro
   [`config.js`](config.js) e fai commit. Se `databaseURL` non compare fra i valori,
   lo trovi nella pagina del Realtime Database: è del tipo
   `https://<progetto>-default-rtdb.europe-west1.firebasedatabase.app`.

Poi, dall'app: in fondo compare la scheda **«Su più dispositivi»** →
**Attiva la casa condivisa**. L'app chiede come si chiama la casa e i nomi di chi
ci abita: **è l'unico momento in cui si scelgono i nomi**, dopo restano quelli su
tutti i dispositivi. Fatto questo, **Manda il link all'altro dispositivo**: chi lo
riceve lo apre e conferma, e da quel momento vedete gli stessi dati. In alternativa,
**«Ho già un codice»** e si incolla il codice della casa.

Il nome della casa compare in alto, sopra al titolo, e serve a capire al volo dove
si è finiti — comodo se un domani create una seconda casa, o se qualcuno si collega
al posto sbagliato.

Cosa aspettarsi:
- Le modifiche compaiono sugli altri dispositivi in un attimo, senza ricaricare niente.
- Senza rete si continua a segnare: la scheda dice quante modifiche sono in attesa
  e le manda da sola appena la rete torna, anche se nel frattempo hai chiuso l'app.
- Chi entra in una casa **adotta i dati di quella casa**: quelli che aveva vengono
  sostituiti (l'app lo chiede prima di procedere). Quindi conviene creare la casa
  dal dispositivo che ha già i dati buoni.
- Per cambiare i nomi bisogna **Scollega** e creare una casa nuova: i nomi fanno
  parte della casa, non del dispositivo.
- **Chi ha il codice della casa può leggere e scrivere quei dati.** Il codice è
  lungo e casuale e non è elencabile da fuori, ma trattalo come una password: è
  una lista di lavori di casa, non il conto in banca. Per cambiare, *Scollega* e
  riattiva: nasce una casa nuova con un codice nuovo.

I valori in `config.js` sono pubblici per costruzione (finiscono nel codice della
pagina): a proteggere i dati sono le regole del passo 3, non quei valori.

## 5. Cambiare i lavori di partenza

L'elenco è la costante `GRUPPI` in cima a `app.js`: ogni riga è
`["codice", "Nome del lavoro", volte_a_settimana]`. Il *codice* è quello con cui le
firme vengono salvate, quindi conviene non cambiarlo per i lavori già in uso.

Dopo un aggiornamento il browser potrebbe mostrare ancora la versione vecchia,
perché l'app tiene una copia locale: cambia `VERSION` in `sw.js` (per esempio da
`v3` a `v4`) e fai commit — al primo avvio con rete l'app si aggiorna.

## Dove funziona

Qualsiasi browser aggiornato degli ultimi anni: Chrome, Safari, Firefox, Edge, su
computer come su telefono. Serve JavaScript acceso. Se il browser è molto vecchio
può mancare qualche rifinitura grafica (l'alone colorato attorno a chi sta
segnando), ma l'app resta usabile. L'installazione con icona richiede iOS 16.4+
sugli iPhone e iPad quando si usa un browser diverso da Safari.

## Cosa c'è dentro

| File | A cosa serve |
| --- | --- |
| `index.html` | la pagina: struttura e stile |
| `app.js` | l'app: elenco lavori, firme, settimane, bilancio |
| `nube.js` | l'unico pezzo che parla con Firebase |
| `config.js` | i valori del tuo progetto Firebase (vuoti = niente sincronizzazione) |
| `database.rules.json` | le regole da incollare nella console Firebase |
| `sw.js` | service worker: fa funzionare l'app anche senza rete |
| `vendor/` | Firebase SDK, tenuto qui dentro invece che preso da Google a ogni avvio |
| `icons/` | icona dell'app (180/192/512 px, versione mascherabile e SVG) |
| `fonts/` | Fraunces e Inter self-ospitati, così i caratteri si vedono anche offline |
| `prove/` | prove automatiche, utili solo se si mette mano al codice |
| `.nojekyll` | dice a GitHub Pages di pubblicare i file così come sono |

I caratteri Fraunces e Inter sono di Google Fonts, con licenza SIL Open Font
License 1.1. L'SDK di Firebase è di Google, licenza Apache 2.0.
