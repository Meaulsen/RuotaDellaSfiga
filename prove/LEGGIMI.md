# Prove

Prove automatiche dell'app, da lanciare solo se ci si mette mano.
Servono [Playwright](https://playwright.dev) e un server statico sulla cartella
del progetto:

```bash
npx http-server -p 8099 -c-1 ..
```

## `locale.js` — l'app da sola

L'app senza sincronizzazione: firme, conteggi, annulla, settimane, riavvio,
funzionamento senza rete e migrazione dei dati salvati dalla versione precedente.

```bash
node locale.js
```

## `due-dispositivi-veri.js` — due dispositivi sull'emulatore Firebase

La prova buona: usa l'SDK vero e l'emulatore ufficiale del Realtime Database,
con le regole di `database.rules.json`. Serve Java.

```bash
firebase emulators:start --only database          # oppure, senza firebase-tools:
java -jar ~/.cache/firebase/emulators/firebase-database-emulator-*.jar --host 127.0.0.1 --port 9000

# carica le regole nell'emulatore (namespace "prova")
curl -X PUT -H "Authorization: Bearer owner" --data-binary @../database.rules.json \
  "http://127.0.0.1:9000/.settings/rules.json?ns=prova"

node due-dispositivi-veri.js
```

Verifica che le regole accettino quello che l'app scrive, che le modifiche
passino da un dispositivo all'altro, e che una firma fatta senza rete sopravviva
alla chiusura dell'app e parta da sola quando la rete torna.

## `due-dispositivi.js` — la stessa cosa senza Java

Ripiego per quando l'emulatore non è disponibile: sostituisce al volo `config.js`
e i file di Firebase con delle finte controparti che parlano con
`finto-firebase.js`. Prova la logica dell'app, non i server di Google.

```bash
node finto-firebase.js    # in un terminale a parte
node due-dispositivi.js
```

## Le regole, da sole

Con l'emulatore acceso si può controllare che accetti solo quello che deve:

```bash
CASA=abcdefghij0123456789
curl -X PUT --data-binary '"Ludo"' "http://127.0.0.1:9000/case/$CASA/nomi/a.json?ns=prova"   # passa
curl -X PUT --data-binary '"Ludo"' "http://127.0.0.1:9000/case/corta/nomi/a.json?ns=prova"   # respinta
curl "http://127.0.0.1:9000/case.json?ns=prova"                                              # 401: non si elencano le case
```
