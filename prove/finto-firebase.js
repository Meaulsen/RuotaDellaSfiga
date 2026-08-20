/* Finto Firebase per le prove: un server che tiene un oggetto JSON in memoria,
   con le stesse due operazioni che usa nube.js (leggi tutto / applica scritture). */
const http = require("http");
let db = {};
const leggi = (p) => p.split("/").filter(Boolean).reduce((n, k) => (n == null ? null : n[k]), db);
function applica(percorso, valore) {
  const parti = percorso.split("/").filter(Boolean);
  let nodo = db;
  for (let i = 0; i < parti.length - 1; i++) {
    if (typeof nodo[parti[i]] !== "object" || nodo[parti[i]] === null) nodo[parti[i]] = {};
    nodo = nodo[parti[i]];
  }
  const u = parti[parti.length - 1];
  if (valore === null) delete nodo[u]; else nodo[u] = valore;
}
http.createServer((req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type");
  if (req.method === "OPTIONS") return res.end();
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/db") {
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify(leggi(u.searchParams.get("path")) ?? null));
  }
  if (u.pathname === "/update") {
    let corpo = "";
    req.on("data", (c) => (corpo += c));
    return req.on("end", () => {
      const { path, patch } = JSON.parse(corpo);
      Object.keys(patch).forEach((k) => applica(path + "/" + k, patch[k]));
      res.end("ok");
    });
  }
  if (u.pathname === "/tutto") { res.setHeader("content-type","application/json"); return res.end(JSON.stringify(db)); }
  if (u.pathname === "/azzera") { db = {}; return res.end("ok"); }
  res.statusCode = 404; res.end();
}).listen(8098, "127.0.0.1", () => console.log("finto firebase su 8098"));
