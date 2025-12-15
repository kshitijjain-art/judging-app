import React, { useEffect, useState } from "react";

export default function App() {
  const [view, setView] = useState("judge");

  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");

  const [judges, setJudges] = useState([]);
  const [judgeName, setJudgeName] = useState("");

  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [teamDetails, setTeamDetails] = useState(null);

  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [remark, setRemark] = useState("");

  const [results, setResults] = useState([]);
  const [judgeTable, setJudgeTable] = useState([]);

  /* ================= LOCAL STORAGE HELPERS ================= */

  function hasJudgeSubmitted(eventId, teamId, judgeName) {
    if (!eventId || !teamId || !judgeName) return false;
    return localStorage.getItem(
      `submitted_${String(eventId)}_${String(teamId)}_${judgeName}`
    );
  }

  function markJudgeSubmitted(eventId, teamId, judgeName) {
    localStorage.setItem(
      `submitted_${String(eventId)}_${String(teamId)}_${judgeName}`,
      "yes"
    );
  }

  /* ================= LOAD EVENTS & JUDGES ================= */

  useEffect(() => {
    fetch("/api/events")
      .then(r => r.json())
      .then(d => {
        setEvents(d);
        if (d.length) setEventId(String(d[0].id));
      });

    fetch("/api/judges")
      .then(r => r.json())
      .then(setJudges);
  }, []);

  /* ================= LOAD TEAMS ================= */

  useEffect(() => {
    if (!eventId) {
      setTeams([]);
      return;
    }

    fetch(`/api/events/${eventId}/teams`)
      .then(r => r.json())
      .then(d => {
        setTeams(d);
        setTeamId("");
        setTeamDetails(null);
      });
  }, [eventId]);

  /* ================= LOAD TEAM DETAILS ================= */

  useEffect(() => {
    if (!teamId) {
      setTeamDetails(null);
      return;
    }

    fetch(`/api/teams/${teamId}`)
      .then(r => r.json())
      .then(data => {
        // FIX: backend may return array
        if (Array.isArray(data)) {
          setTeamDetails(data[0] || null);
        } else {
          setTeamDetails(data);
        }
      });
  }, [name]);

  /* ================= LOAD CRITERIA ================= */

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

  /* ================= SCORE TOTAL ================= */

  const totalScore = Object.values(scores).reduce(
    (sum, val) => sum + Number(val || 0),
    0
  );

  /* ================= SUBMIT SCORE ================= */

  async function submitScore() {
    if (!judgeName || !teamId) {
      alert("Please select Judge and Team");
      return;
    }

    await fetch(`/api/events/${eventId}/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        judge_name: judgeName,
        team_id: Number(teamId),
        scores: Object.entries(scores).map(([k, v]) => ({
          criterion_name: k,
          score: Number(v)
        })),
        remark
      })
    });

    // MARK THIS TEAM AS COMPLETED FOR THIS JUDGE
    markJudgeSubmitted(eventId, teamId, judgeName);

    alert("Score submitted successfully");

    // RESET UI
    setTeamId("");
    setTeamDetails(null);
    setRemark("");
  }

  /* ================= ADMIN ================= */

  function loadAdmin() {
    fetch(`/api/events/${eventId}/results`)
      .then(r => r.json())
      .then(setResults);

    fetch(`/api/events/${eventId}/judge-wise-table`)
      .then(r => r.json())
      .then(setJudgeTable);
  }

  /* ================= UI ================= */

  return (
    <div style={{ maxWidth: 1000, margin: "auto", padding: 20 }}>
      <h2>Shivalik SharkLab Innovators 1.0</h2>

      <div style={{ marginBottom: 15 }}>
        <button onClick={() => setView("judge")}>Judge Panel</button>{" "}
        <button onClick={() => { setView("admin"); loadAdmin(); }}>
          Admin Panel
        </button>
      </div>

      {/* ================= JUDGE PANEL ================= */}
      {view === "judge" && (
        <>
          <h3>Judge Panel</h3>

          {/* JUDGE */}
          <select
            value={judgeName}
            onChange={e => setJudgeName(e.target.value)}
          >
            <option value="">-- Select Judge --</option>
            {judges.map(j => (
              <option key={j.id} value={j.name}>
                {j.name} ({j.email})
              </option>
            ))}
          </select>

          {/* TEAM */}
          <br /><br />
          <select
            value={teamId}
            onChange={e => {
              setTeamId(e.target.value);
              setTeamDetails(null);
            }}
          >
            <option value="">-- Select Team --</option>

            {teams
              .filter(t => !hasJudgeSubmitted(eventId, t.id, judgeName))
              .map(t => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
          </select>

          {/* ALL TEAMS DONE MESSAGE */}
          {judgeName &&
            teams.filter(
              t => !hasJudgeSubmitted(eventId, t.id, judgeName)
            ).length === 0 && (
              <p style={{ color: "green", marginTop: 8 }}>
                ✅ All teams evaluated by this judge
              </p>
            )}

          {/* TEAM DETAILS */}
          {teamDetails && (
            <div style={{
              marginTop: 12,
              padding: 12,
              border: "1px solid #ccc",
              borderRadius: 6
            }}>
              <p><b>Team:</b> {teamDetails.name}</p>
              <p><b>Leader:</b> {teamDetails.leader_name}</p>
              <p><b>Email:</b> {teamDetails.leader_email}</p>
              <p><b>Phone:</b> {teamDetails.leader_phone}</p>
              <p><b>Members:</b> {teamDetails.member_count}</p>
            </div>
          )}

          {/* CRITERIA */}
          <h4 style={{ marginTop: 15 }}>Evaluation Criteria</h4>
          {criteria.map(c => (
            <div key={c.name} style={{ marginBottom: 8 }}>
              {c.name}
              <select
                style={{ marginLeft: 10 }}
                value={scores[c.name]}
                onChange={e =>
                  setScores({ ...scores, [c.name]: Number(e.target.value) })
                }
              >
                {[...Array(c.max_score + 1).keys()].map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          ))}

          <p><b>Total Score:</b> {totalScore}</p>

          <textarea
            placeholder="Remarks (optional)"
            value={remark}
            onChange={e => setRemark(e.target.value)}
            style={{ width: "100%", height: 60 }}
          />

          <br /><br />
          <button onClick={submitScore}>Submit Marks</button>
        </>
      )}

      {/* ================= ADMIN PANEL ================= */}
      {view === "admin" && (
        <>
          <h3>Admin Dashboard</h3>

          <button
            onClick={() =>
              window.open(`/api/events/${eventId}/results.csv`, "_blank")
            }
          >
            Download CSV / Excel
          </button>

          <h4 style={{ marginTop: 20 }}>Judge-wise Marks</h4>

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
