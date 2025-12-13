import React, { useEffect, useState } from "react";

export default function App() {
  const [view, setView] = useState("judge");
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [teams, setTeams] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [judges, setJudges] = useState([]);
  const [judgeName, setJudgeName] = useState("");
  const [remark, setRemark] = useState("");
  const [scores, setScores] = useState({});
  const [teamId, setTeamId] = useState("");
  const [results, setResults] = useState([]);

  /* ---------------- LOAD INITIAL DATA ---------------- */

  useEffect(() => {
    fetch("/api/events")
      .then(r => r.json())
      .then(d => {
        setEvents(d);
        if (d.length) setEventId(d[0].id);
      });

    fetch("/api/judges")
      .then(r => r.json())
      .then(d => setJudges(d));
  }, []);

  useEffect(() => {
    if (!eventId) return;

    fetch(`/api/events/${eventId}/teams`)
      .then(r => r.json())
      .then(d => {
        setTeams(d);
        setTeamId(""); // ✅ NO AUTO SELECTION
      });

    fetch(`/api/events/${eventId}/criteria`)
      .then(r => r.json())
      .then(d => {
        setCriteria(d);
        const map = {};
        d.forEach(c => (map[c.id] = 0));
        setScores(map);
      });
  }, [eventId]);

  /* ---------------- HELPERS ---------------- */

  const totalScore = () =>
    Object.values(scores).reduce((a, b) => a + Number(b || 0), 0);

  const setCriterionScore = (id, val) =>
    setScores(prev => ({ ...prev, [id]: Number(val) }));

  /* ---------------- SUBMIT ---------------- */

  async function submitScore() {
    if (!judgeName) {
      alert("Please select Judge");
      return;
    }
    if (!teamId) {
      alert("Please select Team");
      return;
    }

    const payload = {
      judge_name: judgeName,
      team_id: Number(teamId),
      scores: Object.entries(scores).map(([cid, score]) => ({
        criterion_id: Number(cid),
        score: Number(score)
      })),
      remark
    };

    const res = await fetch(`/api/events/${eventId}/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("Score submitted successfully");
      setTeamId("");
      setJudgeName("");
      setRemark("");
    } else {
      alert("Error submitting score");
    }
  }

  /* ---------------- ADMIN ---------------- */

  function loadResults() {
    fetch(`/api/events/${eventId}/results`)
      .then(r => r.json())
      .then(d => setResults(d));
  }

  /* ---------------- UI ---------------- */

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 20 }}>
      <h2>Shivalik SharkLab Innovators 1.0</h2>

      <button onClick={() => setView("judge")}>Judge</button>
      <button onClick={() => { setView("admin"); loadResults(); }}>
        Admin
      </button>

      {/* EVENT */}
      <div style={{ marginTop: 15 }}>
        <label>Event</label>
        <select
          value={eventId}
          onChange={e => setEventId(e.target.value)}
        >
          {events.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {/* ---------------- JUDGE PANEL ---------------- */}
      {view === "judge" && (
        <>
          <div style={{ marginTop: 15 }}>
            <label>Judge</label>
            <select
              value={judgeName}
              onChange={e => setJudgeName(e.target.value)}
            >
              <option value="">-- Select Judge --</option>
              {judges.map(j => (
                <option key={j.name} value={j.name}>{j.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 15 }}>
            <label>Team</label>
            <select
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
            >
              <option value="">-- Select Team --</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 15 }}>
            <h3>Criteria</h3>
            {criteria.map(c => (
              <div key={c.id}>
                {c.name}
                <select
                  value={scores[c.id] || 0}
                  onChange={e => setCriterionScore(c.id, e.target.value)}
                >
                  {Array.from({ length: c.max_score + 1 }, (_, i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <p><strong>Total:</strong> {totalScore()}</p>

          <textarea
            placeholder="Remarks"
            value={remark}
            onChange={e => setRemark(e.target.value)}
          />

          <br /><br />
          <button onClick={submitScore}>
            Submit Score
          </button>
        </>
      )}

      {/* ---------------- ADMIN PANEL ---------------- */}
      {view === "admin" && (
        <>
          <h3>Results</h3>
          {results.length === 0 ? (
            <p>No data yet</p>
          ) : (
            <table border="1" cellPadding="6">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Avg Score</th>
                  <th>Judges</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.team_name}>
                    <td>{i + 1}</td>
                    <td>{r.team_name}</td>
                    <td>{r.avg_score}</td>
                    <td>{r.judges_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
