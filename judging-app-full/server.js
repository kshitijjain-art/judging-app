const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const stringify = require('csv-stringify').stringify;

// DB layer: use knex to support sqlite (dev) and postgres (prod)
const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig[process.env.NODE_ENV || 'development']);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Helpers
async function getCriteriaForEvent(eventId) {
  return knex('criteria').where({ event_id: eventId }).select('id','name','max_score').orderBy('id');
}

// --- API: events, teams, criteria, judges
app.get('/api/events', async (req, res) => {
  const rows = await knex('events').select('id','name','date').orderBy('id');
  res.json(rows);
});

app.get('/api/events/:eventId/teams', async (req, res) => {
  const eventId = req.params.eventId;
  const rows = await knex('teams').where({ event_id: eventId }).select('id','name','members').orderBy('name');
  res.json(rows);
});

app.get('/api/events/:eventId/criteria', async (req, res) => {
  const eventId = req.params.eventId;
  const rows = await getCriteriaForEvent(eventId);
  res.json(rows);
});

app.get('/api/judges', async (req, res) => {
  const rows = await knex('judges').select('id','name').orderBy('name');
  res.json(rows);
});

// --- Submit scores
app.post('/api/events/:eventId/scores', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { judge_name, team_id, scores, remark } = req.body;
    if (!judge_name || !team_id || !Array.isArray(scores)) return res.status(400).json({ error: 'Missing fields' });

    // Prevent duplicate (same judge_name + team for same event) server-side
    const exists = await knex('scores').where({ event_id: eventId, team_id, judge_name }).first();
    if (exists) return res.status(409).json({ error: 'Duplicate submission by this judge for the same team' });

    const total = scores.reduce((s,c) => s + Number(c.score || 0), 0);
    const now = new Date().toISOString();

    const insert = await knex('scores').insert({ event_id: eventId, team_id, judge_name, total_score: total, remark: remark || '', submitted_at: now });
    let finalScoreId;
    if (Array.isArray(insert) && insert.length) finalScoreId = insert[0];
    else finalScoreId = insert;

    const rows = scores.map(s => ({ score_id: finalScoreId, criterion_id: s.criterion_id, score: s.score }));
    await knex('scoredetails').insert(rows);

    res.json({ success: true, score_id: finalScoreId, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- Admin: aggregated results and CSV export
app.get('/api/events/:eventId/results', async (req, res) => {
  const eventId = req.params.eventId;
  const rows = await knex('teams as t')
    .leftJoin('scores as s', function(){ this.on('s.team_id','t.id').andOn('s.event_id', knex.raw('?', [eventId])); })
    .where('t.event_id', eventId)
    .groupBy('t.id')
    .select('t.id as team_id','t.name as team_name', knex.raw('COUNT(s.id) as judges_count'), knex.raw('ROUND(AVG(s.total_score)::numeric,2) as avg_score'), knex.raw('MAX(s.submitted_at) as last_submission'))
    .orderByRaw('avg_score DESC NULLS LAST');
  res.json(rows);
});

app.get('/api/events/:eventId/results.csv', async (req, res) => {
  const eventId = req.params.eventId;
  const rows = await knex('scores as s').join('teams as t', 't.id', 's.team_id').where('s.event_id', eventId).select('t.name as team_name','s.judge_name','s.total_score','s.remark','s.submitted_at').orderBy('s.submitted_at','asc');
  const header = ['team_name','judge_name','total_score','remark','submitted_at'];
  const csv = stringify(rows, { header: true, columns: header });
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="results_event_${eventId}.csv"`);
  res.send(csv);
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname,'public','index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
router.get("/events/:eventId/judge-wise-table", async (req, res) => {
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
