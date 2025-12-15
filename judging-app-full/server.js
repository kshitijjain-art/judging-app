const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= DATABASE ================= */
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ================= EVENTS ================= */
app.get("/api/events", async (req, res) => {
  const r = await db.query("SELECT * FROM events ORDER BY id");
  res.json(r.rows);
});

/* ================= JUDGES (FROM YOUR TABLE) ================= */
app.get("/api/judges", async (req, res) => {
  try {
    const r = await db.query(
      "SELECT id, name, email FROM judges ORDER BY id"
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load judges" });
  }
});

/* ================= TEAMS (LIST) ================= */
app.get("/api/events/:eventId/teams", async (req, res) => {
  const r = await db.query(
    "SELECT id, name FROM teams ORDER BY name"
  );
  res.json(r.rows);
});

/* ================= TEAM DETAILS ================= */
app.get("/api/teams/:teamId", async (req, res) => {
  const r = await db.query(
    "SELECT name, leader_name, member_count FROM teams WHERE id = $1",
    [req.params.teamId]
  );
  res.json(r.rows[0]);
});

/* ================= CRITERIA ================= */
app.get("/api/events/:eventId/criteria", async (req, res) => {
  const r = await db.query(
    "SELECT id, name, max_score FROM criteria ORDER BY id"
  );
  res.json(r.rows);
});

/* ================= SUBMIT SCORES ================= */
app.post("/api/events/:eventId/scores", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { judge_name, team_id, scores, remark } = req.body;

    for (const s of scores) {
      await db.query(
        `
        INSERT INTO scores
        (event_id, team_id, judge_name, criterion_name, score, remark)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          eventId,
          team_id,
          judge_name,
          s.criterion_name,
          s.score,
          remark || ""
        ]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit score" });
  }
});

/* ================= TOP RANKING ================= */
app.get("/api/events/:eventId/results", async (req, res) => {
  const r = await db.query(
    `
    SELECT
      t.name AS team_name,
      ROUND(AVG(j.judge_total), 2) AS avg_score,
      COUNT(DISTINCT j.judge_name) AS judges_count
    FROM (
      SELECT
        s.team_id,
        s.judge_name,
        SUM(s.score) AS judge_total
      FROM scores s
      WHERE s.event_id = $1
      GROUP BY s.team_id, s.judge_name
    ) j
    JOIN teams t ON t.id = j.team_id
    GROUP BY t.name
    ORDER BY avg_score DESC
    `,
    [req.params.eventId]
  );

  res.json(r.rows);
});

/* ================= JUDGE-WISE CRITERIA TABLE ================= */
app.get("/api/events/:eventId/judge-wise-table", async (req, res) => {
  const r = await db.query(
    `
    SELECT
      s.judge_name,
      t.name AS team_name,
      SUM(CASE WHEN s.criterion_name = 'Presentation Skills' THEN s.score ELSE 0 END) AS presentation,
      SUM(CASE WHEN s.criterion_name = 'Idea' THEN s.score ELSE 0 END) AS idea,
      SUM(CASE WHEN s.criterion_name = 'Uniqueness' THEN s.score ELSE 0 END) AS uniqueness,
      SUM(CASE WHEN s.criterion_name = 'Methodology' THEN s.score ELSE 0 END) AS methodology,
      SUM(s.score) AS total
    FROM scores s
    JOIN teams t ON t.id = s.team_id
    WHERE s.event_id = $1
    GROUP BY s.judge_name, t.name
    ORDER BY t.name, s.judge_name
    `,
    [req.params.eventId]
  );

  res.json(r.rows);
});

/* ================= CSV / EXCEL DOWNLOAD ================= */
app.get("/api/events/:eventId/results.csv", async (req, res) => {
  const r = await db.query(
    `
    SELECT
      s.judge_name AS judge,
      t.name AS team,
      s.criterion_name AS criterion,
      s.score AS score
    FROM scores s
    JOIN teams t ON t.id = s.team_id
    WHERE s.event_id = $1
    ORDER BY t.name, s.judge_name
    `,
    [req.params.eventId]
  );

  let csv = "Judge,Team,Criterion,Score\n";
  r.rows.forEach(row => {
    csv += `${row.judge},${row.team},${row.criterion},${row.score}\n`;
  });

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=judging_results.csv"
  );
  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
});

/* ================= FRONTEND (PRODUCTION BUILD) ================= */
app.use(express.static(path.join(__dirname, "public")));

app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
