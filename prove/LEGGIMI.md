# Prove

Prove automatiche dell'app, da lanciare solo se ci si mette mano. Servono
[Playwright](https://playwright.dev) e un server statico sulla cartella del progetto.

```bash
npx http-server -p 8099 -c-1 ..     # il sito
node finto-firebase.js              # un finto Firebase in memoria, sulla porta 8098
node locale.js                      # l'app senza sincronizzazione, e la migrazione dei dati vecchi
node due-telefoni.js                # due telefoni sulla stessa casa: firme, coda offline, riallineamento
```

`due-telefoni.js` sostituisce al volo `config.js` e i file di Firebase con delle
finte controparti che parlano con `finto-firebase.js`: prova la logica di
sincronizzazione dell'app, non i server di Google.
