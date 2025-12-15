const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ================= DATABASE =================
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ================= EVENTS =================
app.get("/api/events", async (req, res) => {
  const r = await db.query("SELECT * FROM events ORDER BY id");
  res.json(r.rows);
});

// ================= JUDGES (FROM YOUR TABLE) =================
app.get("/api/judges", async (req, res) => {
  const r = await db.query(
    "SELECT id, name, email FROM judges ORDER BY id"
  );
  res.json(r.rows);
});

// ================= TEAMS (LIST) =================
app.get("/api/events/:eventId/teams", async (req, res) => {
  const r = await db.query(
    "SELECT id, name FROM teams ORDER BY name"
  );
  res.json(r.rows);
});

// ================= TEAM DETAILS =================
app.get("/api/teams/:teamId", async (req, res) => {
  const r = await db.query(
    "SELECT name, leader_name, member_count FROM teams WHERE id=$1",
    [req.params.teamId]
  );
  res.json(r.rows[0]);
});

// ================= CRITERIA =================
app.get("/api/events/:eventId/criteria", async (req, res) => {
  const r = await db.query("SELECT * FROM criteria ORDER BY id");
  res.json(r.rows);
});

// ================= SUBMIT SCORES =================
app.post("/api/events/:eventId/scores", async (req, res) => {
  const { eventId } = req.params;
  const { judge_name, team_id, scores, remark } = req.body;

  for (const s of scores) {
    await db.query(`
      INSERT INTO scores
      (event_id, team_id, judge_name, criterion_name, score, remark)
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

// ================= TOP RANKING =================
app.get("/api/events/:eventId/results", async (req, res) => {
  const r = await db.query(`
    SELECT
      t.name AS team_name,
      ROUND(AVG(judge_total),2) AS avg_score,
      COUNT(DISTINCT judge_name) AS judges_count
    FROM (
      SELECT team_id, judge_name, SUM(score) AS judge_total
      FROM scores
      WHERE event_id = $1
      GROUP BY team_id, judge_name
    ) x
    JOIN teams t ON t.id = x.team_id
    GROUP BY t.name
    ORDER BY avg_score DESC
  `, [req.params.eventId]);

  res.json(r.rows);
});

// ================= JUDGE-WISE CRITERIA TABLE =================
app.get("/api/events/:eventId/judge-wise-table", async (req, res) => {
  const r = await db.query(`
    SELECT
      judge_name,
      t.name AS team_name,
      SUM(CASE WHEN criterion_name='Presentation Skills' THEN score ELSE 0 END) AS presentation,
      SUM(CASE WHEN criterion_name='Idea' THEN score ELSE 0 END) AS idea,
      SUM(CASE WHEN criterion_name='Uniqueness' THEN score ELSE 0 END) AS uniqueness,
      SUM(CASE WHEN criterion_name='Methodology' THEN score ELSE 0 END) AS methodology,
      SUM(score) AS total
    FROM scores s
    JOIN teams t ON t.id = s.team_id
    WHERE event_id=$1
    GROUP BY judge_name, t.name
    ORDER BY t.name, judge_name
  `, [req.params.eventId]);

  res.json(r.rows);
});

// ================= CSV / EXCEL DOWNLOAD =================
app.get("/api/events/:eventId/results.csv", async (req, res) => {
  const r = await db.query(`
    SELECT
      judge_name AS "Judge",
      t.name AS "Team",
      criterion_name AS "Criterion",
      score AS "Score"
    FROM scores s
    JOIN teams t ON t.id = s.team_id
    WHERE event_id=$1
  `, [req.params.eventId]);

  let csv = "Judge,Team,Criterion,Score\n";
  r.rows.forEach(x => {
    csv += `${x.Judge},${x.Team},${x.Criterion},${x.Score}\n`;
  });

  res.setHeader("Content-Disposition", "attachment; filename=judging_results.csv");
  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
});

// ================= FRONTEND =================
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on", PORT));
