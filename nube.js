/* nube.js — il pezzo che parla con Firebase Realtime Database.
   Tutto il resto dell'app non sa niente di Firebase: chiede solo di
   "spedire delle scritture" e di essere avvisata quando arrivano novità.

   Ogni casa è un ramo a sé: /case/<codice>. Chi ha il codice vede quella
   casa e nessun'altra (le regole in database.rules.json impediscono di
   elencare le case o di indovinarne una corta). */

/* config.js lo carichiamo a parte e con le pinze: è il file che si tocca a mano,
   e un errore di battitura lì dentro deve spegnere la sincronizzazione, non l'app. */
let firebaseConfig = null;

export async function prepara() {
  try {
    const m = await import("./config.js");
    firebaseConfig = m.firebaseConfig || null;
  } catch (e) {
    console.error("config.js non è leggibile: la casa condivisa resta spenta", e);
    firebaseConfig = null;
  }
}

export function configurata() {
  return !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.databaseURL);
}

/* Apre il collegamento a una casa.
   onDati(oggetto)   → arriva ogni volta che qualcosa cambia, da qui o da un altro dispositivo
   onStato(booleano) → true quando siamo davvero collegati
   Restituisce { spedisci(scritture), chiudi() }. */
export async function collega(casa, { onDati, onStato }) {
  const [{ initializeApp, getApps }, rtdb] = await Promise.all([
    import("./vendor/firebase-app.js"),
    import("./vendor/firebase-database.js")
  ]);
  const { getDatabase, ref, onValue, update } = rtdb;

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const radice = ref(db, "case/" + casa);

  const stacca = [];
  stacca.push(onValue(ref(db, ".info/connected"), (s) => onStato(s.val() === true)));
  stacca.push(onValue(radice, (s) => onDati(s.val() || {}),
    (err) => { onStato(false, err && err.message); }));

  return {
    /* scritture: { "percorso/nel/ramo": valore, ... } — valore null cancella */
    spedisci(scritture) { return update(radice, scritture); },
    chiudi() { stacca.forEach((f) => { try { f(); } catch (e) {} }); }
  };
}
