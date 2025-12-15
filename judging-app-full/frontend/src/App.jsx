import React, { useEffect, useState } from "react";

export default function App() {
  const [view, setView] = useState("judge");
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [teams, setTeams] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [judgeName, setJudgeName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [scores, setScores] = useState({});
  const [remark, setRemark] = useState("");
  const [results, setResults] = useState([]);
  const [judgeTable, setJudgeTable] = useState([]);
  const [teamDetails, setTeamDetails] = useState(null);

  const judges = [
    "Prof. Kshitij Jain",
    "Dr. Ajay Verma",
    "Prof. Rahul Sharma",
    "Prof. Neha Gupta"
  ];

  useEffect(() => {
    fetch("/api/events")
      .then(r => r.json())
      .then(d => {
        setEvents(d);
        if (d.length) setEventId(d[0].id);
      });
  }, []);

  useEffect(() => {
    if (!eventId) return;

    fetch(`/api/events/${eventId}/criteria`)
      .then(r => r.json())
      .then(d => {
        setCriteria(d);
        const map = {};
        d.forEach(c => (map[c.name] = 0));
        setScores(map);
      });
  }, [eventId]);

  useEffect(() => {
    if (!judgeName || !eventId) return;
    fetch(`/api/events/${eventId}/teams?judge=${judgeName}`)
      .then(r => r.json())
      .then(setTeams);
  }, [judgeName, eventId]);

  useEffect(() => {
    if (!teamId) {
      setTeamDetails(null);
      return;
    }
    fetch(`/api/teams/${teamId}`)
      .then(r => r.json())
      .then(setTeamDetails);
  }, [teamId]);

  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  async function submitScore() {
    if (!judgeName || !teamId || total === 0) {
      alert("Select judge, team and give marks");
      return;
    }

    const payload = {
      judge_name: judgeName,
      team_id: Number(teamId),
      scores: Object.entries(scores).map(([k, v]) => ({
        criterion_name: k,
        score: v
      })),
      remark
    };

    await fetch(`/api/events/${eventId}/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    alert("Score submitted successfully");
    setTeamId("");
    setTeamDetails(null);
    setScores(Object.fromEntries(Object.keys(scores).map(k => [k, 0])));
    fetch(`/api/events/${eventId}/teams?judge=${judgeName}`)
      .then(r => r.json())
      .then(setTeams);
  }

  function loadAdmin() {
    fetch(`/api/events/${eventId}/results`)
      .then(r => r.json())
      .then(setResults);

    fetch(`/api/events/${eventId}/judge-wise-table`)
      .then(r => r.json())
      .then(setJudgeTable);
  }

  function downloadCSV() {
    window.open(`/api/events/${eventId}/results.csv`, "_blank");
  }

  return (
    <div style={{ maxWidth: 1000, margin: "auto", padding: 20 }}>
      <h2>Shivalik SharkLab Innovators 1.0</h2>

      <button onClick={() => setView("judge")}>Judge</button>{" "}
      <button onClick={() => { setView("admin"); loadAdmin(); }}>
        Admin
      </button>

      {view === "judge" && (
        <>
          <h3>Judge Panel</h3>

          <select value={judgeName} onChange={e => setJudgeName(e.target.value)}>
            <option value="">Select Judge</option>
            {judges.map(j => <option key={j}>{j}</option>)}
          </select>

          <select value={teamId} onChange={e => setTeamId(e.target.value)}>
            <option value="">Select Team</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {teamDetails && (
            <div style={{ marginTop: 10, padding: 10, border: "1px solid #ccc" }}>
              <p><strong>Team:</strong> {teamDetails.name}</p>
              <p><strong>Leader:</strong> {teamDetails.leader_name}</p>
              <p><strong>Members:</strong> {teamDetails.member_count}</p>
            </div>
          )}

          {criteria.map(c => (
            <div key={c.name}>
              {c.name}
              <select
                value={scores[c.name]}
                onChange={e =>
                  setScores({ ...scores, [c.name]: +e.target.value })
                }
              >
                {[...Array(c.max_score + 1).keys()].map(i => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
          ))}

          <p><strong>Total:</strong> {total}</p>

          <textarea
            placeholder="Remarks"
            value={remark}
            onChange={e => setRemark(e.target.value)}
          />

          <br />
          <button onClick={submitScore}>Submit</button>
        </>
      )}

      {view === "admin" && (
        <>
          <h3>Admin Dashboard</h3>

          <div style={{ marginBottom: 12 }}>
            <button onClick={loadAdmin}>🔄 Refresh</button>{" "}
            <button onClick={downloadCSV}>⬇ Download CSV / Excel</button>
          </div>

          <h4>Top Ranking</h4>
          <table border="1" cellPadding="6">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Average Score</th>
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

          <h4>Judge-wise Detailed Marks</h4>
          <table border="1" cellPadding="6">
            <thead>
              <tr>
                <th>Judge</th>
                <th>Team</th>
                <th>Presentation</th>
                <th>Idea</th>
                <th>Uniqueness</th>
                <th>Methodology</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {judgeTable.map((r, i) => (
                <tr key={i}>
                  <td>{r.judge_name}</td>
                  <td>{r.team_name}</td>
                  <td>{r.presentation}</td>
                  <td>{r.idea}</td>
                  <td>{r.uniqueness}</td>
                  <td>{r.methodology}</td>
                  <td><strong>{r.total}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
