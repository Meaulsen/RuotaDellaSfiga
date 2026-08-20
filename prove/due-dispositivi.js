/* Due dispositivi separati (contesti distinti, memoria distinta) contro il finto
   Firebase, per verificare che la sincronizzazione faccia quello che promette. */
const { chromium, devices } = require('playwright');
const SITO = 'http://127.0.0.1:8099/';
const FINTO = 'http://127.0.0.1:8098';

const MOCK_APP = `
export function initializeApp(c){ return { c }; }
export function getApps(){ return []; }
`;
const MOCK_DB = `
const BASE = ${JSON.stringify(FINTO)};
let cbConnesso = null, connesso = false;
function segnala(v){ if (v !== connesso) { connesso = v; if (cbConnesso) cbConnesso({ val: () => connesso }); } }
export function getDatabase(){ return {}; }
export function ref(db, path){ return { path }; }
export function onValue(r, cb, err){
  if (r.path === ".info/connected") { cbConnesso = cb; cb({ val: () => connesso }); return () => { cbConnesso = null; }; }
  let vivo = true;
  const giro = async () => {
    if (!vivo) return;
    try {
      const res = await fetch(BASE + "/db?path=" + encodeURIComponent(r.path));
      const j = await res.json();
      segnala(true);
      cb({ val: () => j });
    } catch(e) { segnala(false); }
    if (vivo) setTimeout(giro, 200);
  };
  giro();
  return () => { vivo = false; };
}
export function update(r, patch){
  return fetch(BASE + "/update", { method:"POST", headers:{"content-type":"application/json"},
    body: JSON.stringify({ path: r.path, patch }) })
    .then(res => { if(!res.ok) throw new Error("ko"); segnala(true); },
          e => { segnala(false); throw e; });
}
`;
const MOCK_CONFIG = `export const firebaseConfig = { apiKey:"finta", authDomain:"x", databaseURL:"http://finto", projectId:"prova" };`;

async function dispositivo(browser, nome) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('!! ' + nome + ' errore:', e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) console.log('!! ' + nome + ' console:', m.text()); });
  p.on('dialog', d => d.accept());
  await ctx.route('**/vendor/firebase-app.js', r => r.fulfill({ contentType:'text/javascript', body: MOCK_APP }));
  await ctx.route('**/vendor/firebase-database.js', r => r.fulfill({ contentType:'text/javascript', body: MOCK_DB }));
  await ctx.route('**/config.js', r => r.fulfill({ contentType:'text/javascript', body: MOCK_CONFIG }));
  return { ctx, p, nome };
}
const attesa = (ms) => new Promise(r => setTimeout(r, ms));
async function finoA(fn, quanto = 6000, passo = 200) {
  const fine = Date.now() + quanto;
  while (Date.now() < fine) { if (await fn()) return true; await attesa(passo); }
  return false;
}
const conta = (p, chi) => p.evaluate((c) => document.querySelector('.person[data-p="'+c+'"] .n').textContent, chi);
const firme = (p, lavoro) => p.locator('.task', { has: p.locator('[data-add="'+lavoro+'"]') }).locator('.sig').count();

(async () => {
  const b = await chromium.launch();
  const A = await dispositivo(b, 'A'), B = await dispositivo(b, 'B');
  let ok = true;
  const verifica = (t, cond) => { console.log((cond ? '  ok  ' : '  NO  ') + t); if (!cond) ok = false; };

  // ── A: parte da solo, mette i nomi e firma
  await A.p.goto(SITO, { waitUntil: 'load' });
  await A.p.fill('.person[data-p="a"] .pname', 'Ludo');
  await A.p.fill('.person[data-p="b"] .pname', 'Sara');
  await A.p.click('[data-add="piatti"]');
  await A.p.click('[data-add="piatti"]');
  verifica('A ha 2 firme prima di attivare', await conta(A.p, 'a') === '2');

  // ── A: attiva la casa condivisa
  await A.p.click('#crea');
  await finoA(async () => (await A.p.textContent('#codice')).length >= 20);
  const casa = (await A.p.textContent('#codice')).trim();
  console.log('  codice casa:', casa);
  verifica('il codice è lungo abbastanza', casa.length === 20);
  const caricato = await finoA(async () => {
    const r = await fetch(FINTO + '/tutto').then(r => r.json());
    return r.case && r.case[casa] && r.case[casa].nomi && r.case[casa].nomi.a === 'Ludo';
  });
  verifica('i dati di A finiscono nella casa', caricato);

  // ── B: entra con il link
  await B.p.goto(SITO + '?casa=' + casa, { waitUntil: 'load' });
  verifica('B vede i nomi di A', await finoA(async () =>
    (await B.p.inputValue('.person[data-p="a"] .pname')) === 'Ludo'));
  verifica('B vede le 2 firme di A', await finoA(async () => await firme(B.p, 'piatti') === 2));

  // ── B firma: A lo deve vedere
  await B.p.click('.person[data-p="b"] .pick');
  await B.p.click('[data-add="cena"]');
  verifica('A vede la firma fatta da B', await finoA(async () => await firme(A.p, 'cena') === 1));
  verifica('il conteggio di Sara arriva ad A', await finoA(async () => await conta(A.p, 'b') === '1'));

  // ── un lavoro aggiunto da B compare da A
  await B.p.fill('#newname', 'Portare fuori Bobi');
  await B.p.click('#addform button[type="submit"]');
  verifica('A vede il lavoro aggiunto da B', await finoA(async () =>
    (await A.p.textContent('#lista')).includes('Portare fuori Bobi')));

  // ── A senza rete: firma lo stesso, la modifica resta in coda
  await A.ctx.setOffline(true);
  await A.p.click('[data-add="bagno"]');
  verifica('A segna anche senza rete', await firme(A.p, 'bagno') === 1);
  verifica('A dice che ha modifiche in attesa', await finoA(async () =>
    (await A.p.textContent('#stato-testo')).includes('in attesa')));
  verifica('B non la vede ancora', await firme(B.p, 'bagno') === 0);

  // ── torna la rete: la coda parte da sola
  await A.ctx.setOffline(false);
  verifica('quando torna la rete B vede la firma', await finoA(async () => await firme(B.p, 'bagno') === 1, 12000));
  verifica('la coda di A si svuota', await finoA(async () =>
    (await A.p.textContent('#stato-testo')).includes('vedete gli stessi dati'), 12000));

  // ── togliere una firma si propaga
  await B.p.click('.task:has([data-add="piatti"]) .sig >> nth=0');
  verifica('A vede la firma tolta da B', await finoA(async () => await firme(A.p, 'piatti') === 1));

  // ── A riavvia l'app: deve ritrovare tutto
  await A.p.reload({ waitUntil: 'load' });
  verifica('dopo il riavvio A è ancora nella casa', await finoA(async () =>
    (await A.p.textContent('#codice')).trim() === casa));
  verifica('dopo il riavvio A ha ancora i dati', await finoA(async () => await firme(A.p, 'cena') === 1));

  console.log(ok ? '\nTUTTO A POSTO' : '\nQUALCOSA NON VA');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
