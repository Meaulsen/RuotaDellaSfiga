/* Come due-dispositivi.js, ma contro l'emulatore vero di Firebase (jar ufficiale)
   con l'SDK vero: qui si prova anche il protocollo, la riconnessione e le regole. */
const { chromium, devices } = require('playwright');
const SITO = 'http://127.0.0.1:8099/';
const CONFIG = `export const firebaseConfig = {
  apiKey: "finta-per-l-emulatore", authDomain: "prova.firebaseapp.com",
  databaseURL: "http://127.0.0.1:9000?ns=prova", projectId: "prova" };`;

async function dispositivo(b, nome) {
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('!! ' + nome + ':', e.message));
  p.on('console', m => { const t = m.text();
    if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource|WebSocket/.test(t))
      console.log('!! ' + nome + ' console:', t); });
  p.on('dialog', d => d.accept());
  await ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: CONFIG }));
  return { ctx, p };
}
const attesa = (ms) => new Promise(r => setTimeout(r, ms));
async function finoA(fn, quanto = 10000, passo = 250) {
  const fine = Date.now() + quanto;
  while (Date.now() < fine) { try { if (await fn()) return true; } catch (e) {} await attesa(passo); }
  return false;
}
const firme = (p, l) => p.locator('.task', { has: p.locator('[data-add="'+l+'"]') }).locator('.sig').count();
const conta = (p, c) => p.evaluate((x) => document.querySelector('.person[data-p="'+x+'"] .n').textContent, c);

(async () => {
  const b = await chromium.launch();
  const A = await dispositivo(b, 'A'), B = await dispositivo(b, 'B');
  let ok = true;
  const v = (t, c) => { console.log((c ? '  ok  ' : '  NO  ') + t); if (!c) ok = false; };

  await A.p.goto(SITO, { waitUntil: 'load' });
  v('la scheda della casa compare quando config.js è pieno',
    await finoA(async () => !(await A.p.evaluate(() => document.getElementById('sync').hidden))));

  await A.p.fill('.person[data-p="a"] .pname', 'Ludo');
  await A.p.fill('.person[data-p="b"] .pname', 'Sara');
  await A.p.click('[data-add="piatti"]');
  await A.p.click('#crea');
  v('si collega davvero al database', await finoA(async () =>
    (await A.p.textContent('#stato-testo')).includes('vedete gli stessi dati')));
  const casa = (await A.p.textContent('#codice')).trim();
  console.log('  codice casa:', casa);

  v('le regole accettano quello che scrive l\'app', await finoA(async () => {
    const r = await fetch('http://127.0.0.1:9000/case/' + casa + '.json?ns=prova').then(r => r.json());
    return r && r.nomi && r.nomi.a === 'Ludo' && r.settimane;
  }));

  await B.p.goto(SITO + '?casa=' + casa, { waitUntil: 'load' });
  v('B entra col link e vede i dati di A', await finoA(async () =>
    (await B.p.inputValue('.person[data-p="a"] .pname')) === 'Ludo' && await firme(B.p, 'piatti') === 1));

  await B.p.click('.person[data-p="b"] .pick');
  await B.p.click('[data-add="cena"]');
  v('A vede subito la firma di B', await finoA(async () => await firme(A.p, 'cena') === 1));
  v('i conteggi si allineano', await finoA(async () => await conta(A.p, 'b') === '1'));

  // ── il caso che l'SDK da solo non copre: senza rete, e app chiusa e riaperta
  await A.ctx.setOffline(true);
  v('A si accorge di essere senza rete', await finoA(async () =>
    (await A.p.textContent('#stato-testo')).includes('senza rete')));
  await A.p.click('[data-add="bagno"]');
  v('e risulta in attesa', await finoA(async () =>
    (await A.p.textContent('#stato-testo')).includes('in attesa')));
  v('B intanto non la vede', await firme(B.p, 'bagno') === 0);

  // A "chiude l'app" mentre è ancora senza rete, e la riapre più tardi con la rete:
  // è il caso che l'SDK da solo non copre, e per cui l'app tiene la sua coda.
  const memoria = await A.ctx.storageState();
  await A.ctx.close();
  A.ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block', storageState: memoria });
  A.p = await A.ctx.newPage();
  A.p.on('dialog', d => d.accept());
  await A.ctx.route('**/config.js', r => r.fulfill({ contentType: 'text/javascript', body: CONFIG }));
  await A.p.goto(SITO, { waitUntil: 'load' });
  v('riaperta l\'app, la firma fatta senza rete è ancora lì',
    await finoA(async () => await firme(A.p, 'bagno') === 1));
  v('tornata la rete, la firma arriva a B', await finoA(async () => await firme(B.p, 'bagno') === 1, 20000));
  v('e la coda di A si svuota', await finoA(async () =>
    (await A.p.textContent('#stato-testo')).includes('vedete gli stessi dati'), 20000));

  await B.p.click('.task:has([data-add="piatti"]) .sig >> nth=0');
  v('anche togliere una firma si propaga', await finoA(async () => await firme(A.p, 'piatti') === 0));

  await B.p.fill('#newname', 'Portare fuori Bobi');
  await B.p.click('#addform button[type="submit"]');
  v('un lavoro aggiunto da B compare da A', await finoA(async () =>
    (await A.p.textContent('#lista')).includes('Portare fuori Bobi')));

  console.log(ok ? '\nTUTTO A POSTO (SDK e regole veri)' : '\nQUALCOSA NON VA');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
