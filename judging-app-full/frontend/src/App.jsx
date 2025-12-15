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

  /* ===== LOCAL STORAGE ===== */
  const key = (e, t, j) => `done_${e}_${t}_${j}`;
  const isDone = (e, t, j) => localStorage.getItem(key(e,t,j));
  const markDone = (e, t, j) => localStorage.setItem(key(e,t,j), "yes");

  /* ===== LOAD DATA ===== */
  useEffect(() => {
    fetch("/api/events").then(r=>r.json()).then(d=>{
      setEvents(d);
      if(d.length) setEventId(d[0].id);
    });
    fetch("/api/judges").then(r=>r.json()).then(setJudges);
  }, []);

  useEffect(() => {
    if(!eventId) return;
    fetch(`/api/events/${eventId}/teams`).then(r=>r.json()).then(d=>{
      setTeams(d); setTeamId(""); setTeamDetails(null);
    });
    fetch(`/api/events/${eventId}/criteria`).then(r=>r.json()).then(d=>{
      setCriteria(d);
      const m={}; d.forEach(c=>m[c.name]=0); setScores(m);
    });
  }, [eventId]);

  useEffect(() => {
    if(!teamId) return setTeamDetails(null);
    fetch(`/api/teams/${teamId}`).then(r=>r.json()).then(setTeamDetails);
  }, [teamId]);

  const total = Object.values(scores).reduce((a,b)=>a+Number(b||0),0);

  async function submitScore(){
    await fetch(`/api/events/${eventId}/scores`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        judge_name:judgeName,
        team_id:teamId,
        scores:Object.entries(scores).map(([k,v])=>({criterion_name:k,score:v})),
        remark
      })
    });
    markDone(eventId, teamId, judgeName);
    alert("Submitted");
    setTeamId(""); setTeamDetails(null);
  }

  function loadAdmin(){
    fetch(`/api/events/${eventId}/results`).then(r=>r.json()).then(setResults);
    fetch(`/api/events/${eventId}/judge-wise-table`).then(r=>r.json()).then(setJudgeTable);
  }

  return (
    <div style={{maxWidth:1000,margin:"auto",padding:20}}>
      <h2>Shivalik SharkLab Innovators 1.0</h2>

      <button onClick={()=>setView("judge")}>Judge Panel</button>
      <button onClick={()=>{setView("admin");loadAdmin();}}>Admin Panel</button>

      {view==="judge" && (
        <>
          <h3>Judge Panel</h3>

          <select value={judgeName} onChange={e=>setJudgeName(e.target.value)}>
            <option value="">-- Judge --</option>
            {judges.map(j=><option key={j.id} value={j.name}>{j.name}</option>)}
          </select>

          <select value={teamId} onChange={e=>setTeamId(e.target.value)}>
            <option value="">-- Team --</option>
            {teams.filter(t=>!isDone(eventId,t.id,judgeName))
              .map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          {teamDetails && (
            <div>
              <p><b>Leader:</b> {teamDetails.leader_name}</p>
              <p><b>Email:</b> {teamDetails.leader_email}</p>
              <p><b>Members:</b> {teamDetails.member_count}</p>
            </div>
          )}

          {criteria.map(c=>(
            <div key={c.name}>
              {c.name}
              <select onChange={e=>setScores({...scores,[c.name]:e.target.value})}>
                {[...Array(c.max_score+1).keys()].map(i=><option key={i}>{i}</option>)}
              </select>
            </div>
          ))}

          <p>Total: {total}</p>
          <textarea onChange={e=>setRemark(e.target.value)} />
          <button onClick={submitScore}>Submit</button>
        </>
      )}

      {view==="admin" && (
        <>
          <h3>Admin</h3>
          <button onClick={()=>window.open(`/api/events/${eventId}/results.csv`)}>Download CSV</button>

          <table border="1">
            <thead>
              <tr>
                <th>Judge</th><th>Team</th>
                <th>Presentation</th><th>Idea</th>
                <th>Uniqueness</th><th>Methodology</th><th>Total</th>
              </tr>
            </thead>
            <tbody>
              {judgeTable.map((r,i)=>(
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
