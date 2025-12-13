const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ===== DATABASE CONNECTION =====
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===== EVENTS =====
app.get("/api/events", async (req, res) => {
  const r = await db.query("SELECT * FROM events ORDER BY id");
  res.json(r.rows);
});

// ===== JUDGES (STATIC + FROM DB OPTIONAL) =====
app.get("/api/judges", async (req, res) => {
  res.json([
    { name: "Prof. Kshitij Jain" },
    { name: "Dr. Ajay Verma" },
    { name: "Prof. Rahul Sharma" },
    { name: "Prof. Neha Gupta" }
  ]);
});

// ===== TEAMS (HIDE ALREADY JUDGED BY JUDGE) =====
app.get("/api/events/:eventId/teams", async (req, res) => {
  const { eventId } = req.params;
  const judge = req.query.judge;

  if (!judge) {
    const r = await db.query(
      "SELECT id, name FROM teams ORDER BY id"
    );
    return res.json(r.rows);
  }

  const r = await db.query(`
    SELECT id, name FROM teams
    WHERE id NOT IN (
      SELECT DISTINCT team_id FROM scores
      WHERE event_id=$1 AND judge_name=$2
    )
    ORDER BY id
  `, [eventId, judge]);

  res.json(r.rows);
});

// ===== CRITERIA =====
app.get("/api/events/:eventId/criteria", async (req, res) => {
  const r = await db.query(
    "SELECT * FROM criteria ORDER BY id"
  );
  res.json(r.rows);
});

// ===== SUBMIT SCORES =====
app.post("/api/events/:eventId/scores", async (req, res) => {
  const { eventId } = req.params;
  const { judge_name, team_id, scores, remark } = req.body;

  if (!judge_name || !team_id || !scores?.length) {
    return res.status(400).json({ error: "Invalid submission" });
  }

  for (const s of scores) {
    await db.query(`
      INSERT INTO scores (event_id, team_id, judge_name, criterion_name, score, remark)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [
      eventId,
      team_id,
      judge_name,
      s.criterion_name,
      s.score,
      remark || ""
    ]);
  }

  res.json({ success: true });
});

// ===== TOP RANKING (CORRECT AVG LOGIC) =====
app.get("/api/events/:eventId/results", async (req, res) => {
  const { eventId } = req.params;

  const r = await db.query(`
    SELECT
      t.name AS team_name,
      ROUND(AVG(judge_total),2) AS avg_score,
      COUNT(DISTINCT judge_name) AS judges_count
    FROM (
      SELECT team_id, judge_name, SUM(score) AS judge_total
      FROM scores
      WHERE event_id=$1
      GROUP BY team_id, judge_name
    ) jt
    JOIN teams t ON t.id = jt.team_id
    GROUP BY t.name
    ORDER BY avg_score DESC
  `, [eventId]);

  res.json(r.rows);
});

// ===== JUDGE-WISE DETAILED TABLE =====
app.get("/api/events/:eventId/judge-wise-table", async (req, res) => {
  const { eventId } = req.params;

  const r = await db.query(`
    SELECT
      judge_name,
      t.name AS team,
      SUM(CASE WHEN criterion_name='Presentation Skills' THEN score ELSE 0 END) AS presentation,
      SUM(CASE WHEN criterion_name='Idea' THEN score ELSE 0 END) AS idea,
      SUM(CASE WHEN criterion_name='Uniqueness' THEN score ELSE 0 END) AS uniqueness,
      SUM(CASE WHEN criterion_name='Methodology' THEN score ELSE 0 END) AS methodology,
      SUM(score) AS total
    FROM scores s
    JOIN teams t ON t.id = s.team_id
    WHERE event_id=$1
    GROUP BY judge_name, t.name
    ORDER BY judge_name
  `, [eventId]);

  res.json(r.rows);
});

// ===== CSV DOWNLOAD =====
app.get("/api/events/:eventId/results.csv", async (req, res) => {
  const { eventId } = req.params;

  const r = await db.query(`
    SELECT judge_name, t.name AS team, criterion_name, score
    FROM scores s
    JOIN teams t ON t.id = s.team_id
    WHERE event_id=$1
    ORDER BY judge_name, team
  `, [eventId]);

  let csv = "Judge,Team,Criterion,Score\n";
  r.rows.forEach(x => {
    csv += `${x.judge_name},${x.team},${x.criterion_name},${x.score}\n`;
  });

  res.header("Content-Type", "text/csv");
  res.attachment("results.csv");
  res.send(csv);
});

// ===== SERVE FRONTEND =====
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));
