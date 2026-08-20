/* L'app senza sincronizzazione: deve funzionare esattamente come prima. */
const { chromium, devices } = require('playwright');
const SITO = 'http://127.0.0.1:8099/';
(async () => {
  const b = await chromium.launch();
  let ok = true;
  const v = (t, c) => { console.log((c ? '  ok  ' : '  NO  ') + t); if (!c) ok = false; };
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  // config.js nel repository ora è pieno: qui vogliamo provare il caso opposto,
  // cioè l'app senza sincronizzazione, quindi lo sostituiamo con uno vuoto
  const CONFIG_VUOTO = 'export const firebaseConfig = { apiKey: "", authDomain: "", databaseURL: "", projectId: "" };';
  await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: CONFIG_VUOTO }));
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const scaricati = [];
  p.on('request', r => scaricati.push(r.url()));

  await p.goto(SITO, { waitUntil: 'load' });
  v('la scheda della casa condivisa resta nascosta', await p.evaluate(() => document.getElementById('sync').hidden));
  v('Firebase non viene nemmeno scaricato', !scaricati.some(u => u.includes('vendor/firebase')));

  await p.fill('.person[data-p="a"] .pname', 'Ludo');
  await p.fill('.person[data-p="b"] .pname', 'Sara');
  await p.click('[data-add="piatti"]'); await p.click('[data-add="piatti"]');
  await p.click('.person[data-p="b"] .pick');
  await p.click('[data-add="bagno"]');
  v('conta le firme di Ludo', await p.textContent('.person[data-p="a"] .n') === '2');
  v('conta le firme di Sara', await p.textContent('.person[data-p="b"] .n') === '1');
  v('il verdetto nomina chi offre il caffè', (await p.textContent('#verdict')).includes('Sara'));
  v('il lavoro raggiunto è segnato come fatto',
    await p.evaluate(() => document.querySelector('.task:has([data-add="bagno"])').classList.contains('done')));

  // lavoro personalizzato, con caratteri da mettere al sicuro
  await p.fill('#newname', 'Portare fuori <b>Bobi</b>');
  await p.click('#addform button[type="submit"]');
  v('il testo dell\'utente non diventa HTML',
    await p.evaluate(() => document.querySelector('#lista').innerHTML.includes('&lt;b&gt;Bobi')));

  await p.fill('#note', 'Chiamare l\'idraulico');

  // togli e annulla
  await p.click('.task:has([data-add="piatti"]) .sig >> nth=0');
  const dopoTolta = await p.locator('.task:has([data-add="piatti"]) .sig').count();
  await p.click('#toast-undo');
  const dopoAnnulla = await p.locator('.task:has([data-add="piatti"]) .sig').count();
  v('togliere una firma e annullare', dopoTolta === 1 && dopoAnnulla === 2);

  // settimane
  await p.click('#prev');
  v('la settimana prima è vuota', await p.locator('.sig').count() === 0);
  await p.click('#today');
  v('tornando a oggi le firme ci sono', await p.locator('.sig').count() === 3);

  // riavvio
  await p.reload({ waitUntil: 'load' });
  v('dopo il riavvio: nome', await p.inputValue('.person[data-p="a"] .pname') === 'Ludo');
  v('dopo il riavvio: firme', await p.textContent('.person[data-p="a"] .n') === '2');
  v('dopo il riavvio: nota', (await p.inputValue('#note')) === "Chiamare l'idraulico");

  // offline
  await p.evaluate(() => navigator.serviceWorker.ready);
  await new Promise(r => setTimeout(r, 800));
  await ctx.setOffline(true);
  await p.reload({ waitUntil: 'load' });
  v('funziona senza rete', await p.locator('.task').count() === 17 &&
     await p.textContent('.person[data-p="a"] .n') === '2');
  await ctx.setOffline(false);

  // migrazione dalla versione precedente
  const ctx2 = await b.newContext({ ...devices['iPhone 13'] });
  await ctx2.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: CONFIG_VUOTO }));
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errs.push('migrazione: ' + e.message));
  await p2.goto(SITO, { waitUntil: 'load' });
  await p2.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('cartellone:v1', JSON.stringify({
      nomi: { a: 'Vecchio', b: 'Altro' }, attivo: 'b',
      extra: [{ id: 'mio-1', nome: 'Lavare la macchina', obiettivo: 2 }],
      settimane: { [new Date().toISOString().slice(0,10)]: { firme: {}, nota: 'nota vecchia' } }
    }));
  });
  // la settimana giusta va calcolata come fa l'app (lunedì)
  await p2.evaluate(() => {
    const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const k = d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2);
    const v1 = JSON.parse(localStorage.getItem('cartellone:v1'));
    v1.settimane = { [k]: { firme: { piatti: ['a','b','a'] }, nota: 'nota vecchia' } };
    localStorage.setItem('cartellone:v1', JSON.stringify(v1));
  });
  await p2.reload({ waitUntil: 'load' });
  v('migrazione: nomi', await p2.inputValue('.person[data-p="a"] .pname') === 'Vecchio');
  v('migrazione: firme', await p2.locator('.task:has([data-add="piatti"]) .sig').count() === 3);
  v('migrazione: conteggi', await p2.textContent('.person[data-p="a"] .n') === '2' &&
                            await p2.textContent('.person[data-p="b"] .n') === '1');
  v('migrazione: lavoro aggiunto', (await p2.textContent('#lista')).includes('Lavare la macchina'));
  v('migrazione: nota', (await p2.inputValue('#note')) === 'nota vecchia');

  console.log('errori:', errs.length ? errs : 'nessuno');
  if (errs.length) ok = false;
  console.log(ok ? '\nTUTTO A POSTO' : '\nQUALCOSA NON VA');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
