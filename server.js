
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = "./database/database.json";
const API_KEY = process.env.API_KEY || "CHAVE_SECRETA_FORTE";

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.mkdirSync("./database", { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify({ submissions: [], logs: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function auth(req, res, next) {
  const key = req.headers.authorization;
  if (!key || key !== "Bearer " + API_KEY)
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

app.use(rateLimit({ windowMs: 60000, max: 120 }));

app.get("/admin/health", auth, (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.post("/api/form/submit", (req, res) => {
  const db = loadDB();
  const entry = {
    id: Date.now().toString(),
    ...req.body,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  db.submissions.push(entry);
  saveDB(db);
  res.json({ ok: true, id: entry.id });
});

app.get("/admin/submissions", auth, (req, res) => {
  const db = loadDB();
  res.json({ items: db.submissions });
});

app.post("/admin/submissions/:id/approve", auth, (req, res) => {
  const db = loadDB();
  const item = db.submissions.find(x => x.id === req.params.id);
  if (item) {
    item.status = "approved";
    item.updatedAt = Date.now();
    db.logs.push({ type: "approve", id: item.id, time: Date.now() });
  }
  saveDB(db);
  res.json({ ok: true });
});

app.post("/admin/submissions/:id/reject", auth, (req, res) => {
  const db = loadDB();
  const item = db.submissions.find(x => x.id === req.params.id);
  if (item) {
    item.status = "rejected";
    item.updatedAt = Date.now();
    db.logs.push({ type: "reject", id: item.id, time: Date.now() });
  }
  saveDB(db);
  res.json({ ok: true });
});

app.get("/bot/approved", auth, (req, res) => {
  const db = loadDB();
  const list = db.submissions.filter(x => x.status === "approved" && !x.done);
  res.json({ items: list });
});

app.post("/bot/mark-done", auth, (req, res) => {
  const db = loadDB();
  const item = db.submissions.find(x => x.id === req.body.id);
  if (item) item.done = true;
  saveDB(db);
  res.json({ ok: true });
});

app.get("/admin/logs", auth, (req, res) => {
  const db = loadDB();
  res.json({ logs: db.logs });
});

app.listen(3000, () => console.log("🔥 API NÍVEL MÁXIMO RODANDO"));
