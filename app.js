/* Cartellone dei lavori di casa.
   I dati vivono in due posti: la memoria del browser (così l'app parte
   subito e funziona senza rete) e, se la sincronizzazione è accesa, il ramo
   della vostra casa su Firebase. Ogni modifica viene scritta prima in locale
   e poi spedita: se la rete manca resta in coda e parte appena torna. */

import * as nube from "./nube.js";

/* ── I lavori. L'ultimo numero è quante volte andrebbe fatto in una settimana:
      è la vecchia colonna "ogni quanto", che qui serve a mostrare a che punto
      siete. Il codice fra virgolette è quello con cui si salvano le firme:
      non cambiatelo per i lavori già in uso. ─────────────────────────────── */
const GRUPPI = [
  { nome: "Cucina & pasti", tinta: "", lavori: [
    ["piatti",        "Lavare i piatti / caricare la lavastoviglie", 7],
    ["svuotare",      "Svuotare la lavastoviglie",                   7],
    ["fornelli",      "Pulire piano e fornelli",                     3],
    ["cena",          "Cucinare la cena",                            7],
    ["tavola",        "Apparecchiare / sparecchiare",                7]
  ]},
  { nome: "Pulizie di casa", tinta: "b", lavori: [
    ["aspirapolvere", "Passare l'aspirapolvere",                     2],
    ["pavimenti",     "Lavare i pavimenti",                          1],
    ["spolverare",    "Spolverare",                                  1],
    ["bagno",         "Pulire il bagno",                             1]
  ]},
  { nome: "Bucato", tinta: "", lavori: [
    ["lavatrice",     "Fare la lavatrice",                           3],
    ["stendere",      "Stendere il bucato",                          3],
    ["piegare",       "Piegare, riporre e stirare",                  2]
  ]},
  { nome: "Fuori & varie", tinta: "b", lavori: [
    ["spesa",         "Fare la spesa",                               2],
    ["rifiuti",       "Rifiuti e differenziata",                     7],
    ["piante",        "Innaffiare le piante",                        2],
    ["lenzuola",      "Cambio lenzuola / asciugamani",               1]
  ]}
];

const QUANDO = { 7: "ogni giorno", 3: "2–3 volte a settimana",
                 2: "2 volte a settimana", 1: "1 volta a settimana" };
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio",
              "agosto","settembre","ottobre","novembre","dicembre"];
const MESI_BREVI = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
const CHIAVE = "cartellone:v2";
const CHIAVE_VECCHIA = "cartellone:v1";

/* ── Settimane, da lunedì a domenica ─────────────────────────────────────── */
function lunedi(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function idSettimana(d) {
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) +
         "-" + ("0" + d.getDate()).slice(-2);
}
const piuGiorni = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
function etichettaSettimana(lun) {
  const dom = piuGiorni(lun, 6);
  return lun.getMonth() === dom.getMonth()
    ? lun.getDate() + " – " + dom.getDate() + " " + MESI[dom.getMonth()]
    : lun.getDate() + " " + MESI_BREVI[lun.getMonth()] + " – " +
      dom.getDate() + " " + MESI_BREVI[dom.getMonth()];
}

/* ── Piccoli aiuti ───────────────────────────────────────────────────────── */
function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function codice(n) {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  const b = new Uint8Array(n);
  (window.crypto || {}).getRandomValues
    ? window.crypto.getRandomValues(b)
    : b.forEach((_, i) => { b[i] = Math.floor(Math.random() * 256); });
  return Array.from(b, (x) => a[x % a.length]).join("");
}
/* scrive/cancella dentro un oggetto seguendo un percorso "a/b/c" */
function applica(oggetto, percorso, valore) {
  const parti = percorso.split("/");
  let nodo = oggetto;
  for (let i = 0; i < parti.length - 1; i++) {
    if (typeof nodo[parti[i]] !== "object" || nodo[parti[i]] === null) nodo[parti[i]] = {};
    nodo = nodo[parti[i]];
  }
  const ultima = parti[parti.length - 1];
  if (valore === null || valore === undefined) delete nodo[ultima];
  else nodo[ultima] = valore;
}

/* ── Lo stato ────────────────────────────────────────────────────────────── */
const stato = {
  attivo: "a",   // chi sta segnando: vale solo su questo dispositivo
  casa: null,    // codice della casa condivisa, se accesa
  coda: {},      // scritture non ancora spedite: percorso -> valore (null = cancella)
  dati: { nome: "", nomi: { a: "", b: "" }, extra: {}, settimane: {} }
};

function leggiMemoria() {
  try {
    const nuovo = JSON.parse(localStorage.getItem(CHIAVE) || "null");
    if (nuovo) {
      stato.attivo = nuovo.attivo === "b" ? "b" : "a";
      stato.casa = nuovo.casa || null;
      stato.coda = nuovo.coda || {};
      stato.dati = Object.assign(stato.dati, nuovo.dati || {});
      return;
    }
    const vecchio = JSON.parse(localStorage.getItem(CHIAVE_VECCHIA) || "null");
    if (vecchio) migra(vecchio);
  } catch (e) {}
}

/* Porta avanti i dati della versione precedente, dove le firme erano
   semplici elenchi di lettere ("a","b") invece di righe con un codice. */
function migra(v) {
  stato.attivo = v.attivo === "b" ? "b" : "a";
  stato.dati.nomi = v.nomi || { a: "", b: "" };
  (v.extra || []).forEach((l) => {
    stato.dati.extra[l.id] = { nome: l.nome, obiettivo: l.obiettivo };
  });
  Object.keys(v.settimane || {}).forEach((sett) => {
    const s = v.settimane[sett];
    const firme = {};
    Object.keys(s.firme || {}).forEach((lavoro) => {
      (s.firme[lavoro] || []).forEach((chi, i) => {
        firme[codice(12)] = { l: lavoro, c: chi, t: Date.now() - (1000 * i) };
      });
    });
    stato.dati.settimane[sett] = { nota: s.nota || "", firme: firme };
  });
}

function salva() {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify({
      attivo: stato.attivo, casa: stato.casa, coda: stato.coda, dati: stato.dati
    }));
  } catch (e) {}
}

/* ── Scritture: prima qui, poi (se c'è) nella casa condivisa ─────────────── */
let collegamento = null;   // { spedisci, chiudi } quando la sincronizzazione è accesa
let collegati = false;

function scrivi(percorso, valore) {
  applica(stato.dati, percorso, valore);
  if (stato.casa) stato.coda[percorso] = valore === undefined ? null : valore;
  salva();
  spedisci();
}

let spedizioneInCorso = false;
function spedisci() {
  if (!collegamento || spedizioneInCorso) return;
  const percorsi = Object.keys(stato.coda);
  if (!percorsi.length) return;
  const lotto = {};
  percorsi.forEach((p) => { lotto[p] = stato.coda[p]; });
  spedizioneInCorso = true;
  collegamento.spedisci(lotto).then(() => {
    percorsi.forEach((p) => {
      // se nel frattempo lo stesso percorso è cambiato di nuovo, lascialo in coda
      if (stato.coda[p] === lotto[p]) delete stato.coda[p];
    });
    salva();
  }).catch(() => {
    /* resta in coda: riproveremo al prossimo cambio o al prossimo collegamento */
  }).then(() => {
    spedizioneInCorso = false;
    disegnaSync();   // la scritta "in attesa / collegato" deve seguire la coda
    if (Object.keys(stato.coda).length && collegati) setTimeout(spedisci, 1500);
  });
}

/* ── Le settimane e le firme ─────────────────────────────────────────────── */
let lunCorrente = lunedi(new Date());
let lunVisto = lunCorrente;

const scheda = (k) => stato.dati.settimane[k] || { nota: "", firme: {} };
const settimana = () => scheda(idSettimana(lunVisto));

/* elenco ordinato delle firme di un lavoro: [[codice, {l,c,t}], …] */
function firmeDi(k, lavoro) {
  const firme = scheda(k).firme || {};
  return Object.keys(firme)
    .filter((id) => firme[id] && firme[id].l === lavoro)
    .map((id) => [id, firme[id]])
    .sort((x, y) => (x[1].t || 0) - (y[1].t || 0));
}

const nome = (p) => (stato.dati.nomi[p] || "").trim() || (p === "a" ? "Persona 1" : "Persona 2");
const iniziale = (p) => {
  const n = (stato.dati.nomi[p] || "").trim();
  return n ? n[0].toUpperCase() : (p === "a" ? "1" : "2");
};

function elenco() {
  const gruppi = GRUPPI.map((g) => ({
    nome: g.nome, tinta: g.tinta,
    lavori: g.lavori.map((l) => ({ id: l[0], nome: l[1], obiettivo: l[2], mio: false }))
  }));
  const miei = Object.keys(stato.dati.extra || {});
  if (miei.length) {
    gruppi.push({ nome: "I vostri lavori", tinta: "", lavori: miei.map((id) => ({
      id: id, nome: stato.dati.extra[id].nome,
      obiettivo: stato.dati.extra[id].obiettivo, mio: true
    }))});
  }
  return gruppi;
}

/* ── Disegno ─────────────────────────────────────────────────────────────── */
const $ = (s) => document.querySelector(s);
const lista = $("#lista");

function disegnaSettimana() {
  $("#wlabel").textContent = etichettaSettimana(lunVisto);
  const diff = Math.round((lunVisto - lunCorrente) / 604800000);
  $("#wsub").textContent =
    diff === 0 ? "questa settimana" :
    diff === -1 ? "settimana scorsa" :
    diff === 1 ? "settimana prossima" :
    diff < 0 ? Math.abs(diff) + " settimane fa" : "fra " + diff + " settimane";
  $("#today").hidden = diff === 0;
  const nota = $("#note");
  if (document.activeElement !== nota) nota.value = settimana().nota || "";
}

function disegnaLavori() {
  const k = idSettimana(lunVisto);
  const segno = (stato.dati.nomi[stato.attivo] || "").trim() ? iniziale(stato.attivo) : "+";
  lista.innerHTML = elenco().map((g) => {
    const righe = g.lavori.map((l) => {
      const f = firmeDi(k, l.id);
      const fatto = f.length >= l.obiettivo;
      const sigle = f.map(([id, v]) =>
        '<button class="sig' + (v.c === "b" ? " b" : "") + '" type="button" data-firma="' + id +
        '" aria-label="Togli la firma di ' + esc(nome(v.c)) + '"><span>' +
        esc(iniziale(v.c)) + "</span></button>").join("");
      return '<div class="task' + (fatto ? " done" : "") + '">' +
               '<div class="t-main"><div class="t-name">' + esc(l.nome) + "</div>" +
                 '<div class="t-meta">' + (fatto ? "✓ " : "") + "<b>" + f.length + "</b> di " +
                 l.obiettivo + " · " + QUANDO[l.obiettivo] + "</div></div>" +
               '<div class="slots">' + sigle +
                 '<button class="addsig ' + stato.attivo + '" type="button" data-add="' + l.id +
                 '" aria-label="Segna che l\'ha fatto ' + esc(nome(stato.attivo)) + '">' +
                 esc(segno) + "</button></div>" +
               (l.mio ? '<button class="del" type="button" data-del="' + l.id +
                        '" aria-label="Togli questo lavoro">&times;</button>' : "") +
             "</div>";
    }).join("");
    return '<section class="group"><span class="group-tag ' + g.tinta + '">' + esc(g.nome) +
           '</span><div class="card">' + righe + "</div></section>";
  }).join("");
}

function disegnaBilancio() {
  const firme = settimana().firme || {};
  const conta = { a: 0, b: 0 };
  Object.keys(firme).forEach((id) => {
    if (firme[id] && conta[firme[id].c] !== undefined) conta[firme[id].c]++;
  });

  ["a", "b"].forEach((p) => {
    const card = document.querySelector('.person[data-p="' + p + '"]');
    card.dataset.on = stato.attivo === p ? "1" : "0";
    card.querySelector(".pick").setAttribute("aria-pressed", stato.attivo === p ? "true" : "false");
    card.querySelector(".badge").textContent = iniziale(p);
    card.querySelector(".n").textContent = conta[p];
    card.querySelector(".pcount small").textContent = conta[p] === 1 ? "firma" : "firme";
    const input = card.querySelector(".pname");
    if (document.activeElement !== input) input.value = stato.dati.nomi[p] || "";
    // i nomi appartengono alla casa: si scelgono quando la si crea
    input.readOnly = !!stato.casa;
    input.placeholder = stato.casa ? "" : "Nome";
  });

  const d = conta.a - conta.b;
  $("#verdict").innerHTML =
    (!conta.a && !conta.b) ? "Settimana ancora tutta da fare." :
    d === 0 ? "Pari e patta: <b>" + conta.a + "</b> a testa. Bravi." :
    "<b>" + esc(nome(d > 0 ? "a" : "b")) + "</b> è avanti di " + Math.abs(d) +
    " · il caffè lo offre <b>" + esc(nome(d > 0 ? "b" : "a")) + "</b> ☕";
}

/* la testata: se la casa condivisa è accesa il titolo grande diventa il nome
   della casa («Casa» + nome) e il motto scivola piccolo lì di fianco; senza
   casa resta il motto in grande, come prima.
   Le case create prima che i nomi esistessero non ne hanno uno: lì vale il
   ripiego «Casa nostra». */
function disegnaCasa() {
  const titolo = $("#titolo"), motto = $("#motto-top");
  const n = stato.casa ? (stato.dati.nome || "").trim() : "";
  if (stato.casa) {
    // se il nome comincia già con «Casa» non la ripetiamo
    const etichetta = n.replace(/^casa\s+/i, "").trim() || "nostra";
    // niente sottolineatura sul nome: se è lungo viene tagliato, e la riga
    // colorata resterebbe appesa dopo i puntini
    titolo.textContent = "Casa " + etichetta;
    titolo.title = "Casa " + etichetta;
  } else {
    titolo.innerHTML = 'Chi ha <span class="h1-swash">tempo</span>, fa';
    titolo.removeAttribute("title");
  }
  motto.hidden = !stato.casa;
}

function disegnaSync() {
  const card = $("#sync");
  if (!nube.configurata() && !stato.casa) { card.hidden = true; return; }
  card.hidden = false;
  $("#sync-off").hidden = !!stato.casa;
  $("#sync-on").hidden = !stato.casa;
  if (stato.casa) {
    $("#casa-titolo").textContent = stato.dati.nome || "La vostra casa";
    $("#codice").textContent = stato.casa;
    const inCoda = Object.keys(stato.coda).length;
    $("#dot").dataset.stato = collegati ? "on" : "off";
    $("#stato-testo").textContent = collegati
      ? (inCoda ? "collegato · sto mandando " + inCoda + " modifiche" : "collegato: vedete gli stessi dati")
      : (inCoda ? "senza rete · " + inCoda + " modifiche in attesa" : "senza rete · riprovo da solo");
  }
}

function disegna() { disegnaCasa(); disegnaSettimana(); disegnaLavori(); disegnaBilancio(); disegnaSync(); }

/* ── Avviso in fondo, con "Annulla" ──────────────────────────────────────── */
const toast = $("#toast"), toastMsg = $("#toast-msg"), toastUndo = $("#toast-undo");
let annulla = null, timerToast;
function avvisa(testo, ripristina) {
  toastMsg.textContent = testo;
  annulla = ripristina || null;
  toastUndo.hidden = !annulla;
  toast.classList.add("on");
  clearTimeout(timerToast);
  timerToast = setTimeout(chiudiToast, 5000);
}
function chiudiToast() { toast.classList.remove("on"); annulla = null; }
toastUndo.addEventListener("click", () => { if (annulla) annulla(); chiudiToast(); });

/* ── Tocchi sull'elenco ──────────────────────────────────────────────────── */
lista.addEventListener("click", (ev) => {
  const k = idSettimana(lunVisto);

  const add = ev.target.closest("[data-add]");
  if (add) {
    const id = codice(12);
    scrivi("settimane/" + k + "/firme/" + id,
           { l: add.dataset.add, c: stato.attivo, t: Date.now() });
    disegnaLavori(); disegnaBilancio(); disegnaSync();
    return;
  }

  const sig = ev.target.closest("[data-firma]");
  if (sig) {
    const id = sig.dataset.firma;
    const percorso = "settimane/" + k + "/firme/" + id;
    const prima = (scheda(k).firme || {})[id];
    scrivi(percorso, null);
    disegnaLavori(); disegnaBilancio(); disegnaSync();
    avvisa("Firma tolta", () => {
      scrivi(percorso, prima);
      disegnaLavori(); disegnaBilancio(); disegnaSync();
    });
    return;
  }

  const del = ev.target.closest("[data-del]");
  if (del) {
    const id = del.dataset.del;
    const prima = stato.dati.extra[id];
    if (!prima) return;
    scrivi("extra/" + id, null);
    disegnaLavori(); disegnaSync();
    avvisa("«" + prima.nome + "» tolto", () => {
      scrivi("extra/" + id, prima);
      disegnaLavori(); disegnaSync();
    });
  }
});

/* ── Chi sta segnando, e i nomi ──────────────────────────────────────────── */
const attesaNome = {};
document.querySelectorAll(".person").forEach((card) => {
  const p = card.dataset.p;
  const input = card.querySelector(".pname");
  input.value = stato.dati.nomi[p] || "";
  card.addEventListener("click", (ev) => {
    if (ev.target === input) return;
    stato.attivo = p; salva(); disegnaLavori(); disegnaBilancio();
  });
  input.addEventListener("input", () => {
    // aspetta un attimo prima di spedire, così non si scrive a ogni lettera
    stato.dati.nomi[p] = input.value;
    salva(); disegnaLavori(); disegnaBilancio();
    clearTimeout(attesaNome[p]);
    attesaNome[p] = setTimeout(() => { scrivi("nomi/" + p, input.value); disegnaSync(); }, 500);
  });
});

/* ── Settimana avanti e indietro ─────────────────────────────────────────── */
$("#prev").addEventListener("click", () => { lunVisto = piuGiorni(lunVisto, -7); disegna(); });
$("#next").addEventListener("click", () => { lunVisto = piuGiorni(lunVisto, 7); disegna(); });
$("#today").addEventListener("click", () => { lunVisto = lunCorrente; disegna(); });

/* ── Note della settimana ────────────────────────────────────────────────── */
const nota = $("#note");
let attesaNota;
nota.addEventListener("input", () => {
  const k = idSettimana(lunVisto);
  applica(stato.dati, "settimane/" + k + "/nota", nota.value);
  salva();
  clearTimeout(attesaNota);
  attesaNota = setTimeout(() => { scrivi("settimane/" + k + "/nota", nota.value); disegnaSync(); }, 700);
});

/* ── Aggiungere un lavoro vostro ─────────────────────────────────────────── */
$("#addform").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const campo = $("#newname");
  const testo = campo.value.trim();
  if (!testo) { campo.focus(); return; }
  scrivi("extra/mio-" + codice(8), { nome: testo, obiettivo: +$("#newfreq").value });
  campo.value = ""; campo.blur();
  disegnaLavori(); disegnaSync();
  avvisa("«" + testo + "» aggiunto");
});

/* ── Azzerare la settimana ───────────────────────────────────────────────── */
$("#reset").addEventListener("click", () => {
  const k = idSettimana(lunVisto);
  const prima = scheda(k).firme || {};
  if (!Object.keys(prima).length) { avvisa("Questa settimana è già vuota"); return; }
  scrivi("settimane/" + k + "/firme", null);
  disegna();
  avvisa("Settimana azzerata", () => { scrivi("settimane/" + k + "/firme", prima); disegna(); });
});

/* ── La casa condivisa ───────────────────────────────────────────────────── */
async function accendi() {
  if (!stato.casa || !nube.configurata() || collegamento) return;
  try {
    collegamento = await nube.collega(stato.casa, {
      onDati: (remoto) => {
        // quello che c'è nella casa vince, tranne le modifiche ancora in coda
        stato.dati = Object.assign({ nome: "", nomi: { a: "", b: "" }, extra: {}, settimane: {} }, remoto);
        Object.keys(stato.coda).forEach((p) => applica(stato.dati, p, stato.coda[p]));
        salva(); disegna();
      },
      onStato: (ok) => { collegati = ok; if (ok) spedisci(); disegnaSync(); }
    });
    spedisci();
  } catch (e) {
    console.error("Casa condivisa: collegamento non riuscito", e);
    collegati = false;
    disegnaSync();
    avvisa("Non riesco a collegarmi alla casa");
  }
}

function spegni() {
  if (collegamento) { collegamento.chiudi(); collegamento = null; }
  collegati = false;
}

$("#crea").addEventListener("click", () => {
  $("#sync-scelte").hidden = true;
  $("#nuova").hidden = false;
  $("#gestore-a").value = stato.dati.nomi.a || "";
  $("#gestore-b").value = stato.dati.nomi.b || "";
  $("#casa-nome").focus();
});

$("#annulla-crea").addEventListener("click", () => {
  $("#nuova").hidden = true;
  $("#sync-scelte").hidden = false;
});

$("#nuova").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const casa = $("#casa-nome").value.trim();
  const a = $("#gestore-a").value.trim();
  const b = $("#gestore-b").value.trim();
  const manca = !casa ? $("#casa-nome") : !a ? $("#gestore-a") : !b ? $("#gestore-b") : null;
  if (manca) {
    manca.focus();
    avvisa("Servono il nome della casa e quelli di tutti e due");
    return;
  }

  stato.dati.nome = casa;
  stato.dati.nomi = { a: a, b: b };
  stato.casa = codice(20);

  // la casa nasce con quello che c'è già in questo browser
  stato.coda = { "nome": casa, "nomi/a": a, "nomi/b": b };
  Object.keys(stato.dati.extra).forEach((id) => { stato.coda["extra/" + id] = stato.dati.extra[id]; });
  Object.keys(stato.dati.settimane).forEach((k) => {
    const s = stato.dati.settimane[k];
    if (s.nota) stato.coda["settimane/" + k + "/nota"] = s.nota;
    Object.keys(s.firme || {}).forEach((id) => {
      stato.coda["settimane/" + k + "/firme/" + id] = s.firme[id];
    });
  });

  $("#nuova").hidden = true;
  $("#sync-scelte").hidden = false;
  salva(); disegna(); accendi();
  avvisa("«" + casa + "» è pronta: manda il link all'altro dispositivo");
});

$("#entra").addEventListener("click", () => { entra(window.prompt("Incolla qui il codice della casa")); });

function entra(cod) {
  const pulito = String(cod || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (pulito.length < 16) { if (cod !== null) avvisa("Codice non valido"); return; }
  if (pulito === stato.casa) return;
  if (!window.confirm("Ti collego a questa casa. I dati che hai qui verranno " +
                      "sostituiti da quelli della casa. Vado?")) return;
  spegni();
  stato.casa = pulito;
  stato.coda = {};
  salva(); disegnaSync(); accendi();
}

$("#copia").addEventListener("click", async () => {
  const link = location.origin + location.pathname + "?casa=" + stato.casa;
  try {
    if (navigator.share) { await navigator.share({ title: "Chi ha tempo, fa", url: link }); return; }
    await navigator.clipboard.writeText(link);
    avvisa("Link copiato: aprilo sull'altro dispositivo");
  } catch (e) { window.prompt("Copia questo link e aprilo sull'altro dispositivo:", link); }
});

$("#scollega").addEventListener("click", () => {
  if (!window.confirm("Questo dispositivo smette di sincronizzarsi. I dati restano qui. Vado?")) return;
  spegni();
  stato.casa = null; stato.coda = {};
  salva(); disegna();
  avvisa("Scollegato");
});

/* ── Suggerimento "Aggiungi a Home" ──────────────────────────────────────── */
const installata = window.matchMedia("(display-mode: standalone)").matches ||
                   window.navigator.standalone === true;
// "Aggiungi a Home" ha senso dove c'è una schermata Home: sul computer no
const aTocco = /iPad|iPhone|iPod|Android/.test(navigator.userAgent) ||
               window.matchMedia("(pointer: coarse)").matches;
let nascosto = false;
try { nascosto = localStorage.getItem("cartellone:install-hint") === "off"; } catch (e) {}
if (!installata && !nascosto && aTocco) document.body.classList.add("show-install");
$(".install .close").addEventListener("click", () => {
  document.body.classList.remove("show-install");
  try { localStorage.setItem("cartellone:install-hint", "off"); } catch (e) {}
});

/* ── Copia locale, per funzionare anche senza rete ───────────────────────── */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
}

/* ── Via ─────────────────────────────────────────────────────────────────── */
leggiMemoria();
disegna();

nube.prepara().then(() => {
  disegnaSync();
  const invito = new URLSearchParams(location.search).get("casa");
  if (invito) {
    history.replaceState(null, "", location.pathname);
    if (invito !== stato.casa) { entra(invito); return; }
  }
  accendi();
});

// se l'app è rimasta aperta oltre la mezzanotte di domenica, la
// settimana "corrente" va aggiornata
setInterval(() => {
  const ora = lunedi(new Date());
  if (idSettimana(ora) !== idSettimana(lunCorrente)) {
    const eraOggi = idSettimana(lunVisto) === idSettimana(lunCorrente);
    lunCorrente = ora;
    if (eraOggi) lunVisto = ora;
    disegna();
  }
}, 60000);
