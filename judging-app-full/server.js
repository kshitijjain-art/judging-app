// ================================
// server.js — FULL WORKING VERSION
// ================================

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// DATABASE CONNECTION
// ================================
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

// ================================
// MIDDLEWARE
// ================================
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serves frontend

// ================================
// BASIC CHECK
// ================================
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// ================================
// GET JUDGES
// ================================
app.get("/api/judges", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT name FROM judges ORDER BY name"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load judges" });
  }
});


// ================================
// GET TEAMS (FILTERED BY JUDGE)
// ================================
app.get("/api/events/:eventId/teams", async (req, res) => {
  const { eventId } = req.params;
  const judge = req.query.judge;

  try {
    let query = `
      SELECT id, name
      FROM teams
      WHERE id NOT IN (
        SELECT team_id FROM scores
        WHERE event_id = $1 AND judge_name = $2
      )
      ORDER BY name
    `;

    const result = await db.query(query, [eventId, judge]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load teams" });
  }
});

// ================================
// GET TEAM DETAILS
// ================================
app.get("/api/teams/:teamId/details", async (req, res) => {
  const { teamId } = req.params;

  try {
    const result = await db.query(
      `SELECT leader_name, leader_email, leader_phone, member_count
       FROM teams WHERE id = $1`,
      [teamId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to load team details" });
  }
});

// ================================
// SUBMIT SCORES
// ================================
app.post("/api/events/:eventId/scores", async (req, res) => {
  const { eventId } = req.params;
  const { judge_name, team_id, scores, remark } = req.body;

  try {
    for (const s of scores) {
      await db.query(
        `INSERT INTO scores
         (event_id, team_id, judge_name, criterion_id, score, remark)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [eventId, team_id, judge_name, s.criterion_id, s.score, remark]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save scores" });
  }
});

// ================================
// TOP RANKING (ADMIN)
// ================================
app.get("/api/events/:eventId/results", async (req, res) => {
  const { eventId } = req.params;

  try {
    const result = await db.query(`
      SELECT
        t.name AS team_name,
        ROUND(AVG(s.score),2) AS avg_score,
        COUNT(DISTINCT s.judge_name) AS judges_count
      FROM scores s
      JOIN teams t ON t.id = s.team_id
      WHERE s.event_id = $1
      GROUP BY t.name
      ORDER BY avg_score DESC
    `, [eventId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load results" });
  }
});

// ================================
// JUDGE-WISE COLUMN TABLE (ADMIN)
// ================================
app.get("/api/events/:eventId/judge-wise-table", async (req, res) => {
  const { eventId } = req.params;

  try {
    const result = await db.query(`
      SELECT
        s.judge_name AS judge,
        t.name AS team,

        MAX(CASE WHEN s.criterion_id = 1 THEN s.score END) AS presentation,
        MAX(CASE WHEN s.criterion_id = 2 THEN s.score END) AS idea,
        MAX(CASE WHEN s.criterion_id = 3 THEN s.score END) AS uniqueness,
        MAX(CASE WHEN s.criterion_id = 4 THEN s.score END) AS methodology,

        (
          COALESCE(MAX(CASE WHEN s.criterion_id = 1 THEN s.score END),0) +
          COALESCE(MAX(CASE WHEN s.criterion_id = 2 THEN s.score END),0) +
          COALESCE(MAX(CASE WHEN s.criterion_id = 3 THEN s.score END),0) +
          COALESCE(MAX(CASE WHEN s.criterion_id = 4 THEN s.score END),0)
        ) AS total
      FROM scores s
      JOIN teams t ON t.id = s.team_id
      WHERE s.event_id = $1
      GROUP BY s.judge_name, t.name
      ORDER BY t.name, s.judge_name
    `, [eventId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load judge-wise table" });
  }
});

// ================================
// START SERVER
// ================================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
