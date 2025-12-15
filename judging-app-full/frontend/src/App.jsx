import React, { useEffect, useState } from "react";

export default function App() {
  const [view, setView] = useState("judge");
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [teams, setTeams] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [judges, setJudges] = useState([]);
  const [judgeName, setJudgeName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teamDetails, setTeamDetails] = useState(null);
  const [scores, setScores] = useState({});
  const [remark, setRemark] = useState("");
  const [results, setResults] = useState([]);
  const [judgeTable, setJudgeTable] = useState([]);

  // ---------- LOAD EVENTS & JUDGES ----------
  useEffect(() => {
    fetch("/api/events").then(r => r.json()).then(d => {
      setEvents(d);
      if (d.length) setEventId(d[0].id);
    });

    fetch("/api/judges")
      .then(r => r.json())
      .then(setJudges);
  }, []);

  // ---------- LOAD CRITERIA ----------
  useEffect(() => {
    if (!eventId) return;

    fetch(`/api/events/${eventId}/criteria`)
      .then(r => r.json())
      .then(d => {
        setCriteria(d);
        const obj = {};
        d.forEach(c => (obj[c.name] = 0));
        setScores(obj);
      });
  }, [eventId]);

  // ---------- LOAD TEAMS ----------
  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/events/${eventId}/teams`)
      .then(r => r.json())
      .then(setTeams);
  }, [eventId]);

  // ---------- TEAM DETAILS ----------
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

  // ---------- SUBMIT ----------
  async function submitScore() {
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

    alert("Score submitted");
    setTeamId("");
    setTeamDetails(null);
    setRemark("");
  }

  // ---------- ADMIN ----------
  function loadAdmin() {
    fetch(`/api/events/${eventId}/results`).then(r => r.json()).then(setResults);
    fetch(`/api/events/${eventId}/judge-wise-table`)
      .then(r => r.json())
      .then(setJudgeTable);
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

          <select onChange={e => setJudgeName(e.target.value)}>
            <option value="">Select Judge</option>
            {judges.map(j => (
              <option key={j.id} value={j.name}>
                {j.name} ({j.email})
              </option>
            ))}
          </select>

          <select onChange={e => setTeamId(e.target.value)}>
            <option value="">Select Team</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {teamDetails && (
            <div style={{ border: "1px solid #ccc", padding: 10 }}>
              <p><b>Team:</b> {teamDetails.name}</p>
              <p><b>Leader:</b> {teamDetails.leader_name}</p>
              <p><b>Members:</b> {teamDetails.member_count}</p>
            </div>
          )}

          {criteria.map(c => (
            <div key={c.name}>
              {c.name}
              <select
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

          <p><b>Total:</b> {total}</p>
          <textarea placeholder="Remark" onChange={e => setRemark(e.target.value)} />
          <br />
          <button onClick={submitScore}>Submit</button>
        </>
      )}

      {view === "admin" && (
        <>
          <h3>Admin Dashboard</h3>

          <button onClick={() => window.open(`/api/events/${eventId}/results.csv`)}>
            Download CSV / Excel
          </button>

          <h4>Top Ranking</h4>
          <table border="1">
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{r.team_name}</td>
                  <td>{r.avg_score}</td>
                  <td>{r.judges_count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4>Judge-wise Criteria Marks</h4>
          <table border="1">
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
                  <td>{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
