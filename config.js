/* Configurazione di Firebase.
   Finché è vuota l'app funziona lo stesso, ma i dati restano nel browser che la apre.
   Per accendere la sincronizzazione: crea un progetto su
   https://console.firebase.google.com, aggiungi un'app Web e incolla qui i
   valori che ti dà (vedi il README, punto 4). Questi valori sono pubblici per
   loro natura: a proteggere i dati sono le regole del database. */

export const firebaseConfig = {
  apiKey: "AIzaSyAVm3I9zYJzYFueCyLNhbf3emfzPPrTAUo",
  authDomain: "ruotadellasfiga.firebaseapp.com",
  databaseURL: "https://ruotadellasfiga-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ruotadellasfiga"
};
