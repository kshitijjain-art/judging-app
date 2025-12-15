const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= DATABASE ================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ================= API ================= */

// Health check
app.get("/", (req, res) => {
  res.send("Judging App Backend Running");
});

/* ---------- EVENTS ---------- */
app.get("/api/events", async (req, res) => {
  const r = await pool.query("SELECT * FROM events ORDER BY id");
  res.json(r.rows);
});

/* ---------- JUDGES (FROM judges TABLE) ---------- */
app.get("/api/judges", async (req, res) => {
  const r = await pool.query(
    "SELECT id, name, email FROM judges ORDER BY name"
  );
  res.json(r.rows);
});

/* ---------- TEAMS ---------- */
app.get("/api/events/:eventId/teams", async (req, res) => {
  const r = await pool.query(
    "SELECT id, name FROM teams WHERE event_id=$1 ORDER BY name",
    [req.params.eventId]
  );
  res.json(r.rows);
});

/* ---------- TEAM DETAILS ---------- */
app.get("/api/teams/:teamId", async (req, res) => {
  const r = await pool.query(
    `SELECT name, leader_name, leader_email, leader_phone, member_count
     FROM teams WHERE id=$1`,
    [req.params.teamId]
  );
  res.json(r.rows[0]);
});

/* ---------- CRITERIA ---------- */
app.get("/api/events/:eventId/criteria", async (req, res) => {
  const r = await pool.query(
    "SELECT id, name, max_score FROM criteria ORDER BY id"
  );
  res.json(r.rows);
});

/* ---------- SUBMIT SCORES ---------- */
app.post("/api/events/:eventId/scores", async (req, res) => {
  const { judge_name, team_id, scores, remark } = req.body;

  for (let s of scores) {
    await pool.query(
      `INSERT INTO scores
      (event_id, judge_name, team_id, criterion_name, score, remark)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        req.params.eventId,
        judge_name,
        team_id,
        s.criterion_name,
        s.score,
        remark || ""
      ]
    );
  }

  res.json({ success: true });
});

/* ---------- ADMIN RESULTS (RANKING) ---------- */
app.get("/api/events/:eventId/results", async (req, res) => {
  const r = await pool.query(
    `
    SELECT t.name AS team_name,
           ROUND(AVG(s.score),2) AS avg_score,
           COUNT(DISTINCT s.judge_name) AS judges_count
    FROM scores s
    JOIN teams t ON t.id=s.team_id
    WHERE s.event_id=$1
    GROUP BY t.name
    ORDER BY avg_score DESC
    `,
    [req.params.eventId]
  );
  res.json(r.rows);
});

/* ---------- JUDGE-WISE TABLE ---------- */
app.get("/api/events/:eventId/judge-wise-table", async (req, res) => {
  const r = await pool.query(
    `
    SELECT judge_name,
           t.name AS team_name,
           SUM(CASE WHEN criterion_name='Presentation Skills' THEN score ELSE 0 END) AS presentation,
           SUM(CASE WHEN criterion_name='Idea' THEN score ELSE 0 END) AS idea,
           SUM(CASE WHEN criterion_name='Uniqueness' THEN score ELSE 0 END) AS uniqueness,
           SUM(CASE WHEN criterion_name='Methodology' THEN score ELSE 0 END) AS methodology,
           SUM(score) AS total
    FROM scores s
    JOIN teams t ON t.id=s.team_id
    WHERE s.event_id=$1
    GROUP BY judge_name, t.name
    ORDER BY judge_name, t.name
    `,
    [req.params.eventId]
  );
  res.json(r.rows);
});

/* ---------- CSV DOWNLOAD ---------- */
app.get("/api/events/:eventId/results.csv", async (req, res) => {
  const r = await pool.query(
    `
    SELECT judge_name, t.name AS team, criterion_name, score
    FROM scores s
    JOIN teams t ON t.id=s.team_id
    WHERE s.event_id=$1
    ORDER BY judge_name, team
    `,
    [req.params.eventId]
  );

  let csv = "Judge,Team,Criterion,Score\n";
  r.rows.forEach(row => {
    csv += `${row.judge_name},${row.team},${row.criterion_name},${row.score}\n`;
  });

  res.header("Content-Type", "text/csv");
  res.attachment("results.csv");
  res.send(csv);
});

/* ================= FRONTEND ================= */

app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ================= START ================= */

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log("Server running on port", PORT)
);
