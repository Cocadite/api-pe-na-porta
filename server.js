const express = require("express");
const cors = require("cors");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(cors());
app.use(express.json());

// ====== CONFIG ======
const DB_FILE = "./database/database.json";

// Aceita ADMIN_API_KEY (recomendado) ou API_KEY (compatível)
const API_KEY =
  process.env.ADMIN_API_KEY ||
  process.env.API_KEY ||
  "CHAVE_SECRETA_FORTE";

// ====== DB ======
function ensureDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.mkdirSync("./database", { recursive: true });
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ submissions: [], logs: [] }, null, 2)
    );
  }
}

function loadDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ====== AUTH ======
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token || token !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ====== LIMIT ======
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

// =======================================================
// ✅ ROTAS DE VIDA (pra não dar Cannot GET / e nem 404 no health)
// =======================================================

// Raiz
app.get("/", (req, res) => {
  res.status(200).send("PE NA PORTA API ONLINE ✅");
});

// Health público (alias)
app.get("/health", (req, res) => {
  res.json({ status: "online", api: "PE NA PORTA", alive: true });
});

// Health padrão /api/health (o que você quer testar na Vercel)
app.get("/api/health", (req, res) => {
  res.json({ status: "online", api: "PE NA PORTA", alive: true });
});

// Health admin (protegido)
app.get("/admin/health", auth, (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// =======================================================
// ✅ FORM (público)
// =======================================================
app.post("/api/form/submit", (req, res) => {
  const db = loadDB();

  const entry = {
    id: Date.now().toString(),
    ...req.body,
    status: "pending",
    done: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  db.submissions.push(entry);
  db.logs.push({ type: "submit", id: entry.id, time: Date.now() });
  saveDB(db);

  res.json({ ok: true, id: entry.id });
});

// =======================================================
// ✅ ADMIN (protegido)
// =======================================================
app.get("/admin/submissions", auth, (req, res) => {
  const db = loadDB();
  res.json({ items: db.submissions });
});

app.post("/admin/submissions/:id/approve", auth, (req, res) => {
  const db = loadDB();
  const item = db.submissions.find((x) => x.id === req.params.id);

  if (!item) return res.status(404).json({ error: "Not found" });

  item.status = "approved";
  item.updatedAt = Date.now();
  db.logs.push({ type: "approve", id: item.id, time: Date.now() });

  saveDB(db);
  res.json({ ok: true });
});

app.post("/admin/submissions/:id/reject", auth, (req, res) => {
  const db = loadDB();
  const item = db.submissions.find((x) => x.id === req.params.id);

  if (!item) return res.status(404).json({ error: "Not found" });

  item.status = "rejected";
  item.updatedAt = Date.now();
  db.logs.push({ type: "reject", id: item.id, time: Date.now() });

  saveDB(db);
  res.json({ ok: true });
});

app.get("/admin/logs", auth, (req, res) => {
  const db = loadDB();
  res.json({ logs: db.logs });
});

// =======================================================
// ✅ BOT (protegido)
// =======================================================
app.get("/bot/approved", auth, (req, res) => {
  const db = loadDB();
  const list = db.submissions.filter((x) => x.status === "approved" && !x.done);
  res.json({ items: list });
});

app.post("/bot/mark-done", auth, (req, res) => {
  const db = loadDB();
  const item = db.submissions.find((x) => x.id === req.body.id);

  if (!item) return res.status(404).json({ error: "Not found" });

  item.done = true;
  item.updatedAt = Date.now();
  db.logs.push({ type: "done", id: item.id, time: Date.now() });

  saveDB(db);
  res.json({ ok: true });
});

// ====== START ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🔥 API NÍVEL MÁXIMO RODANDO na porta " + PORT));
