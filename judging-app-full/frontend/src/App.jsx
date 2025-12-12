import React, { useEffect, useState } from 'react';

// Judging App component (single-file). For full functionality run a backend (see ../README.md).
export default function App() {
  const [view, setView] = useState('judge');
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [judgeName, setJudgeName] = useState('');
  const [judges, setJudges] = useState([]);
  const [remark, setRemark] = useState('');
  const [scoresState, setScoresState] = useState({});
  const [status, setStatus] = useState('');
  const [results, setResults] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const evRes = await fetch('/api/events');
        if (!evRes.ok) throw new Error('no events');
        const ev = await evRes.json();
        setEvents(ev);
        if (ev && ev.length) setEventId(ev[0].id);
        const jRes = await fetch('/api/judges');
        if (jRes.ok) {
          const j = await jRes.json();
          setJudges(j.map(x => x.name));
        } else {
          setJudges(['Prof. Kshitij Jain','Dr. Ajay Verma','Prof. Rahul Sharma','Prof. Neha Gupta']);
        }
      } catch (e) {
        setPreviewMode(true);
        const mockEvents = [{ id: 'mock-1', name: 'Preview Event', date: '2025-12-20' }];
        setEvents(mockEvents);
        setEventId(mockEvents[0].id);
        setTeams([{ id: 't1', name: 'Team Alpha', members: 'Alice, Bob' }, { id: 't2', name: 'Team Beta', members: 'Charlie, Deepa' }]);
        setJudges(['Prof. Kshitij Jain','Dr. Ajay Verma','Prof. Rahul Sharma','Prof. Neha Gupta']);
      }
    })();
  }, []);

  useEffect(() => {
    if (!eventId) return;
    if (previewMode) {
      setTeams(prev => (prev && prev.length ? prev : [{ id: 't1', name: 'Team Alpha' }, { id: 't2', name: 'Team Beta' }]));
      const j = [
        { id: 1, name: 'Presentation Skills', max_score: 10 },
        { id: 2, name: 'Idea', max_score: 10 },
        { id: 3, name: 'Uniqueness', max_score: 10 },
        { id: 4, name: 'Methodology', max_score: 10 }
      ];
      setCriteria(j);
      const map = {}; j.forEach(c => map[c.id]=0);
      setScoresState(prev => ({ ...prev, scores: map }));
    } else {
      (async () => {
        try {
          const res = await fetch(`/api/events/${eventId}/teams`);
          const j = await res.json();
          setTeams(j);
          setScoresState(prev => ({ ...prev, team_id: j[0].id }));
        } catch (e) {}
        try {
          const res = await fetch(`/api/events/${eventId}/criteria`);
          const j = await res.json();
          if (Array.isArray(j) && j.length>0) {
            setCriteria(j);
            const map = {}; j.forEach(c => map[c.id]=0);
            setScoresState(prev=>({...prev,scores:map}));
          }
        } catch (e) {}
      })();
    }
  }, [eventId, previewMode]);

  function setCriterionScore(criterionId, val) {
    setScoresState(prev => ({ ...prev, scores: { ...prev.scores, [criterionId]: Number(val) } }));
  }
  function totalScore() {
    if (!scoresState.scores) return 0;
    return Object.values(scoresState.scores).reduce((s,v)=>s+Number(v||0),0);
  }
  function hasAlreadySubmitted(eventId, teamId, judge) {
    try { return !!localStorage.getItem(`submitted_${eventId}_${teamId}_${judge}`); } catch(e){return false;}
  }
  function markSubmitted(eventId, teamId, judge) {
    try { localStorage.setItem(`submitted_${eventId}_${teamId}_${judge}`, new Date().toISOString()); } catch(e) {}
  }

  async function submitScore() {
    if (!eventId || !scoresState.team_id) { setStatus('Choose event and team'); return; }
    if (!judgeName || !judgeName.trim()) { setStatus('Select judge name'); return; }
    if (hasAlreadySubmitted(eventId, scoresState.team_id, judgeName)) { setStatus('You have already submitted for this team (local)'); return; }
    const payload = { judge_name: judgeName, team_id: Number(scoresState.team_id), scores: Object.entries(scoresState.scores||{}).map(([criterion_id, score])=>({criterion_id:Number(criterion_id), score:Number(score)})), remark };
    if (previewMode) { setStatus(`(Preview) Saved ✓ (Total: ${totalScore()})`); markSubmitted(eventId, scoresState.team_id, judgeName); return; }
    setStatus('Submitting...');
    try {
      const res = await fetch(`/api/events/${eventId}/scores`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const j = await res.json();
      if (res.ok && j.success) { setStatus(`Saved ✓ (Total: ${j.total})`); markSubmitted(eventId, scoresState.team_id, judgeName); setRemark(''); }
      else setStatus('Error: '+(j.error||JSON.stringify(j)));
    } catch(e) { setStatus('Network error: '+e.message); }
  }

  async function loadResults() {
    if (!eventId) return;
    if (previewMode) { setResults([{ team_id: 't1', team_name: 'Team Alpha', avg_score: 27, judges_count: 3, last_submission: '2025-12-11T10:00:00Z' }]); return; }
    try { const res = await fetch(`/api/events/${eventId}/results`); const j = await res.json(); setResults(j); } catch(e){}
  }
  function downloadCSV() { if (!eventId) return; if (previewMode) { setStatus('Preview mode — no CSV'); return;} window.location.href=`/api/events/${eventId}/results.csv`; }

  return (
    <div className="container">
      <div style={{background:'#fff', padding:16, borderRadius:12}}>
        <header style={{display:'flex', alignItems:'center', gap:12}}>
          <img src="/shivalik-logo.png" alt="Shivalik Logo" style={{height:64}} />
          <div>
            <h1>Shivalik SharkLab Innovators 1.0 — Judging Panel</h1>
            <div style={{marginTop:6}}>
              <button onClick={()=>setView('judge')} style={{marginRight:6}}>Judge</button>
              <button onClick={()=>{setView('admin'); loadResults();}}>Admin</button>
            </div>
          </div>
        </header>

        <div style={{marginTop:16}}>
          <label>Event</label>
          <select value={eventId||''} onChange={e=>setEventId(e.target.value)} style={{display:'block', width:'100%', padding:8, marginTop:6}}>
            {events.map(ev=> <option key={ev.id} value={ev.id}>{ev.name}{ev.date?` — ${ev.date}`:''}</option>)}
          </select>
        </div>

        {view==='judge' && <>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
            <div>
              <label>Team</label>
              <select value={scoresState.team_id||''} onChange={e=>setScoresState(prev=>({...prev, team_id: e.target.value}))} style={{display:'block', width:'100%', padding:8, marginTop:6}}>
                {teams.map(t=> <option key={t.id} value={t.id}>{t.name}{t.members?` (${t.members})`:''}</option>)}
              </select>
            </div>
            <div>
              <label>Judge name</label>
              <select value={judgeName} onChange={e=>setJudgeName(e.target.value)} style={{display:'block', width:'100%', padding:8, marginTop:6}}>
                <option value="">-- Select Judge --</option>
                {judges.map(j=> <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          </div>

          <div style={{marginTop:12}}>
            <h3>Criteria</h3>
            {criteria.map(c=> (
              <div key={c.id} style={{display:'flex', alignItems:'center', gap:12, marginTop:8}}>
                <div style={{flex:1}}>{c.name} <small>(max {c.max_score})</small></div>
                <div style={{width:120}}>
                  <select value={scoresState.scores?scoresState.scores[c.id]:0} onChange={e=>setCriterionScore(c.id, e.target.value)} style={{width:'100%', padding:8}}>
                    {Array.from({length: c.max_score+1}, (_,i)=> <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div style={{marginTop:12}}>
            <label>Remarks (optional)</label>
            <textarea value={remark} onChange={e=>setRemark(e.target.value)} rows={3} style={{width:'100%', padding:8, marginTop:6}} />
          </div>

          <div style={{marginTop:12, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div><strong>Total: {totalScore()}</strong></div>
            <div>
              <button onClick={submitScore} style={{marginRight:8}}>Submit Score</button>
              <button onClick={()=>{ setJudgeName(''); setRemark(''); setScoresState(prev=>({...prev, scores: criteria.reduce((a,c)=> (a[c.id]=0, a),{} ) })); }}>Clear</button>
            </div>
          </div>

          <div style={{marginTop:8, color:'#555'}}>{status}</div>
        </>}

        {view==='admin' && <>
          <div style={{marginTop:12}}>
            <button onClick={loadResults} style={{marginRight:8}}>Refresh</button>
            <button onClick={downloadCSV}>Download CSV</button>
          </div>
          <div style={{marginTop:12}}>
            {(!results || results.length===0) ? <div style={{color:'#777'}}>No results yet.</div> : (
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead><tr><th>Rank</th><th>Team</th><th>Avg Score</th><th># Judges</th><th>Last submission</th></tr></thead>
                <tbody>
                  {results.map((r,i)=> <tr key={r.team_id}><td>{i+1}</td><td>{r.team_name}</td><td>{r.avg_score}</td><td>{r.judges_count}</td><td>{r.last_submission}</td></tr>)}
                </tbody>
              </table>
            )}
          </div>
        </>}
      </div>

      <footer style={{textAlign:'center', marginTop:12, color:'#666'}}>This frontend supports preview mode when the backend is not present. To preview: run the frontend dev server in <code>frontend/</code>.</footer>
    </div>
  );
}
