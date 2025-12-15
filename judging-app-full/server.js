const express = require("express");
const path = require("path");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= DATABASE ================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

/* ================= FRONTEND SERVING ================= */
// This makes Express serve files from /public
app.use(express.static(path.join(__dirname, "public")));

// Root URL → load frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ================= API ROUTES ================= */

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is running" });
});

// Events
app.get("/api/events", async (req, res) => {
  const r = await pool.query("SELECT id, name FROM events ORDER BY id");
  res.json(r.rows);
});

// Judges
app.get("/api/judges", async (req, res) => {
  const r = await pool.query(
    "SELECT id, name, email FROM judges ORDER BY name"
  );
  res.json(r.rows);
});

// Teams by event
app.get("/api/events/:eventId/teams", async (req, res) => {
  const r = await pool.query(
    "SELECT id, name FROM teams WHERE event_id = $1 ORDER BY name",
    [req.params.eventId]
  );
  res.json(r.rows);
});

// Team details
app.get("/api/teams/:teamId", async (req, res) => {
  const r = await pool.query(
    `SELECT name, leader_name, leader_email, leader_phone, member_count
     FROM teams WHERE id = $1`,
    [req.params.teamId]
  );
  res.json(r.rows[0]);
});

// Criteria
app.get("/api/events/:eventId/criteria", async (req, res) => {
  const r = await pool.query(
    "SELECT id, name, max_score FROM criteria ORDER BY id"
  );
  res.json(r.rows);
});

// Submit scores
app.post("/api/events/:eventId/scores", async (req, res) => {
  const { judge_name, team_id, scores, remark } = req.body;

  for (const s of scores) {
    await pool.query(
      `INSERT INTO scores
       (event_id, team_id, judge_name, criterion_name, score, remark)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        req.params.eventId,
        team_id,
        judge_name,
        s.criterion_name,
        s.score,
        remark || ""
      ]
    );
  }

  res.json({ success: true });
});

// Admin results
app.get("/api/events/:eventId/results", async (req, res) => {
  const r = await pool.query(
    `
    SELECT t.name AS team_name,
           ROUND(AVG(s.score),2) AS avg_score,
           COUNT(DISTINCT s.judge_name) AS judges_count
    FROM scores s
    JOIN teams t ON t.id = s.team_id
    WHERE s.event_id = $1
    GROUP BY t.name
    ORDER BY avg_score DESC
    `,
    [req.params.eventId]
  );
  res.json(r.rows);
});

// CSV download
app.get("/api/events/:eventId/results.csv", async (req, res) => {
  const r = await pool.query(
    `
    SELECT judge_name, t.name AS team, criterion_name, score
    FROM scores s
    JOIN teams t ON t.id = s.team_id
    WHERE s.event_id = $1
    ORDER BY judge_name, team
    `,
    [req.params.eventId]
  );

  let csv = "Judge,Team,Criterion,Score\n";
  r.rows.forEach(row => {
    csv += `${row.judge_name},${row.team},${row.criterion_name},${row.score}\n`;
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=results.csv");
  res.send(csv);
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
