import React, { useEffect, useState } from "react";

export default function App() {
  const [view, setView] = useState("judge");
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [teamDetails, setTeamDetails] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [judges, setJudges] = useState([]);
  const [judgeName, setJudgeName] = useState("");
  const [remark, setRemark] = useState("");
  const [results, setResults] = useState([]);
  const [judgeTable, setJudgeTable] = useState([]);

  /* ---------- LOAD EVENTS & JUDGES ---------- */
  useEffect(() => {
    fetch("/api/events").then(r => r.json()).then(d => {
      setEvents(d);
      if (d.length) setEventId(d[0].id);
    });
    fetch("/api/judges").then(r => r.json()).then(setJudges);
  }, []);

  /* ---------- LOAD TEAMS ---------- */
  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/events/${eventId}/teams`)
      .then(r => r.json())
      .then(d => {
        setTeams(d);
        setTeamId("");
      });
  }, [eventId]);

  /* ---------- LOAD TEAM DETAILS ---------- */
  useEffect(() => {
    if (!teamId) {
      setTeamDetails(null);
      return;
    }
    fetch(`/api/teams/${teamId}`)
      .then(r => r.json())
      .then(setTeamDetails);
  }, [teamId]);

  /* ---------- LOAD CRITERIA ---------- */
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

  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  async function submitScore() {
    if (!judgeName || !teamId) {
      alert("Select Judge & Team");
      return;
    }

    await fetch(`/api/events/${eventId}/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        judge_name: judgeName,
        team_id: teamId,
        scores: Object.entries(scores).map(([k, v]) => ({
          criterion_name: k,
          score: v
        })),
        remark
      })
    });

    alert("Score submitted");
    setTeamId("");
    setRemark("");
  }

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
          <select onChange={e => setJudgeName(e.target.value)}>
            <option value="">Select Judge</option>
            {judges.map(j => (
              <option key={j.id} value={j.name}>
                {j.name} ({j.email})
              </option>
            ))}
          </select>

          <select value={teamId} onChange={e => setTeamId(e.target.value)}>
            <option value="">Select Team</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {teamDetails && (
            <div>
              <p><b>Leader:</b> {teamDetails.leader_name}</p>
              <p><b>Email:</b> {teamDetails.leader_email}</p>
              <p><b>Phone:</b> {teamDetails.leader_phone}</p>
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
          <textarea placeholder="Remarks" onChange={e => setRemark(e.target.value)} />
          <br />
          <button onClick={submitScore}>Submit</button>
        </>
      )}

      {view === "admin" && (
        <>
          <button onClick={() =>
            window.open(`/api/events/${eventId}/results.csv`, "_blank")
          }>
            Download CSV
          </button>

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
