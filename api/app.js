import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "database/database.json");

function readDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ submissions: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export default async function handler(req, res) {
  const key = req.headers.authorization?.replace("Bearer ", "");
  if (key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "POST") {
    const db = readDB();
    db.submissions.push({
      ...req.body,
      createdAt: Date.now(),
      status: "pending"
    });
    saveDB(db);
    return res.json({ success: true });
  }

  if (req.method === "GET") {
    const db = readDB();
    return res.json(db.submissions);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
