const express = require("express");
const pg = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= DATABASE ================= */

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ================= HEALTH ================= */

app.get("/", (req, res) => {
  res.send("Judging App Backend Running");
});

/* ================= EVENTS ================= */

app.get("/api/events", async (req, res) => {
  const r = await db.query("SELECT id, name, date FROM events ORDER BY id");
  res.json(r.rows);
});

/* ================= JUDGES ================= */

app.get("/api/judges", async (req, res) => {
  const r = await db.query(
    "SELECT id, name, email FROM judges ORDER BY name"
  );
  res.json(r.rows);
});

/* ================= TEAMS ================= */

app.get("/api/events/:eventId/teams", async (req, res) => {
  const { eventId } = req.params;

  const r = await db.query(
    `SELECT id, name FROM teams WHERE event_id = $1 ORDER BY name`,
    [eventId]
  );

  res.json(r.rows);
});

/* TEAM DETAILS */

app.get("/api/teams/:teamId", async (req, res) => {
  const { teamId } = req.params;

  const r = await db.query(
    `
    SELECT
      id,
      name,
      leader_name,
      leader_email,
      leader_phone,
      member_count
    FROM teams
    WHERE id = $1
    `,
    [teamId]
  );

  res.json(r.rows);
});

/* ================= CRITERIA ================= */

app.get("/api/events/:eventId/criteria", async (req, res) => {
  const { eventId } = req.params;

  const r = await db.query(
    `SELECT id, name, max_score FROM criteria WHERE event_id = $1 ORDER BY id`,
    [eventId]
  );

  res.json(r.rows);
});

/* ================= SUBMIT SCORES ================= */

app.post("/api/events/:eventId/scores", async (req, res) => {
  const { eventId } = req.params;
  const { judge_name, team_id, scores, remark } = req.body;

  try {
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
          remark || null
        ]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save scores" });
  }
});

/* ================= ADMIN: TOP RANKING ================= */

app.get("/api/events/:eventId/results", async (req, res) => {
  const { eventId } = req.params;

  const q = `
    SELECT
      t.name AS team_name,
      ROUND(AVG(s.score), 2) AS avg_score,
      COUNT(DISTINCT s.judge_name) AS judges_count
    FROM scores s
    JOIN teams t ON t.id = s.team_id
    WHERE s.event_id = $1
    GROUP BY t.name
    ORDER BY avg_score DESC
  `;

  const r = await db.query(q, [eventId]);
  res.json(r.rows);
});

/* ================= ADMIN: JUDGE-WISE TABLE ================= */

app.get("/api/events/:eventId/judge-wise-table", async (req, res) => {
  const { eventId } = req.params;

  const q = `
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
    ORDER BY total DESC
  `;

  const r = await db.query(q, [eventId]);
  res.json(r.rows);
});

/* ================= CSV DOWNLOAD ================= */

app.get("/api/events/:eventId/results.csv", async (req, res) => {
  const { eventId } = req.params;

  const q = `
    SELECT
      t.name AS team,
      s.judge_name AS judge,
      s.criterion_name,
      s.score
    FROM scores s
    JOIN teams t ON t.id = s.team_id
    WHERE s.event_id = $1
    ORDER BY t.name, s.judge_name
  `;

  const r = await db.query(q, [eventId]);

  let csv = "Team,Judge,Criterion,Score\n";
  r.rows.forEach(row => {
    csv += `${row.team},${row.judge},${row.criterion_name},${row.score}\n`;
  });

  res.header("Content-Type", "text/csv");
  res.attachment("judging_results.csv");
  res.send(csv);
});

/* ================= START ================= */

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
