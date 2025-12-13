import React, { useEffect, useState } from "react";

export default function App() {
  const [view, setView] = useState("judge");
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [teams, setTeams] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [judges] = useState([
    "Prof. Kshitij Jain",
    "Dr. Ajay Verma",
    "Prof. Rahul Sharma",
    "Prof. Neha Gupta"
  ]);
  const [judgeName, setJudgeName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [scores, setScores] = useState({});
  const [remark, setRemark] = useState("");
  const [results, setResults] = useState([]);
  const [judgeTable, setJudgeTable] = useState([]);

  useEffect(() => {
    fetch("/api/events").then(r=>r.json()).then(d=>{
      setEvents(d); if(d.length) setEventId(d[0].id);
    });
  }, []);

  useEffect(() => {
    if (!eventId) return;

    fetch(`/api/events/${eventId}/criteria`)
      .then(r=>r.json())
      .then(d=>{
        setCriteria(d);
        const m={}; d.forEach(c=>m[c.name]=0); setScores(m);
      });

  }, [eventId]);

  useEffect(() => {
    if (!judgeName || !eventId) return;
    fetch(`/api/events/${eventId}/teams?judge=${judgeName}`)
      .then(r=>r.json())
      .then(setTeams);
  }, [judgeName, eventId]);

  const total = Object.values(scores).reduce((a,b)=>a+b,0);

  async function submitScore() {
    if (!judgeName || !teamId || total===0) {
      alert("Select judge, team and give marks");
      return;
    }

    const payload = {
      judge_name: judgeName,
      team_id: Number(teamId),
      scores: Object.entries(scores).map(([k,v])=>({
        criterion_name:k, score:v
      })),
      remark
    };

    await fetch(`/api/events/${eventId}/scores`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(payload)
    });

    alert("Submitted");
    setTeamId(""); setScores(Object.fromEntries(Object.keys(scores).map(k=>[k,0])));
    fetch(`/api/events/${eventId}/teams?judge=${judgeName}`)
      .then(r=>r.json()).then(setTeams);
  }

  function loadAdmin() {
    fetch(`/api/events/${eventId}/results`).then(r=>r.json()).then(setResults);
    fetch(`/api/events/${eventId}/judge-wise-table`).then(r=>r.json()).then(setJudgeTable);
  }

  function downloadCSV() {
    window.location.href=`/api/events/${eventId}/results.csv`;
  }

  return (
    <div style={{maxWidth:900,margin:"auto",padding:20}}>
      <h2>Shivalik SharkLab Innovators 1.0</h2>

      <button onClick={()=>setView("judge")}>Judge</button>{" "}
      <button onClick={()=>{setView("admin"); loadAdmin();}}>Admin</button>

      {view==="judge" && <>
        <h3>Judge Panel</h3>

        <select value={judgeName} onChange={e=>setJudgeName(e.target.value)}>
          <option value="">Select Judge</option>
          {judges.map(j=><option key={j}>{j}</option>)}
        </select>

        <select value={teamId} onChange={e=>setTeamId(e.target.value)}>
          <option value="">Select Team</option>
          {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        {criteria.map(c=>(
          <div key={c.name}>
            {c.name}
            <select value={scores[c.name]} onChange={e=>setScores({...scores,[c.name]:+e.target.value})}>
              {[...Array(c.max_score+1).keys()].map(i=><option key={i}>{i}</option>)}
            </select>
          </div>
        ))}

        <p>Total: {total}</p>
        <textarea placeholder="Remark" value={remark} onChange={e=>setRemark(e.target.value)} />
        <br/>
        <button onClick={submitScore}>Submit</button>
      </>}

      {view==="admin" && <>
        <h3>Admin Dashboard</h3>
        <button onClick={downloadCSV}>Download CSV</button>

        <h4>Top Ranking</h4>
        <table border="1"><tbody>
          {results.map((r,i)=>(
            <tr key={r.team_name}>
              <td>{i+1}</td><td>{r.team_name}</td><td>{r.avg_score}</td>
            </tr>
          ))}
        </tbody></table>

        <h4>Judge-wise Marks</h4>
        <table border="1"><tbody>
          {judgeTable.map((r,i)=>(
            <tr key={i}>
              <td>{r.judge_name}</td><td>{r.team}</td>
              <td>{r.presentation}</td><td>{r.idea}</td>
              <td>{r.uniqueness}</td><td>{r.methodology}</td>
              <td>{r.total}</td>
            </tr>
          ))}
        </tbody></table>
      </>}
    </div>
  );
}
