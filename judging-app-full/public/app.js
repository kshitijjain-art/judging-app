let eventId = "";
let judgeName = "";
let teamId = "";

async function load() {
  const events = await fetch("/api/events").then(r=>r.json());
  eventId = events[0].id;

  loadJudges();
  loadTeams();
  loadCriteria();
}

async function loadJudges() {
  const j = await fetch("/api/judges").then(r=>r.json());
  const sel = document.getElementById("judge");
  sel.innerHTML = `<option value="">Select Judge</option>`;
  j.forEach(x => sel.innerHTML += `<option>${x.name}</option>`);
}

async function loadTeams() {
  const t = await fetch(`/api/events/${eventId}/teams`).then(r=>r.json());
  const sel = document.getElementById("team");
  sel.innerHTML = `<option value="">Select Team</option>`;
  t.forEach(x => sel.innerHTML += `<option value="${x.id}">${x.name}</option>`);
}

async function loadCriteria() {
  const c = await fetch(`/api/events/${eventId}/criteria`).then(r=>r.json());
  const box = document.getElementById("criteria");
  box.innerHTML = "";
  c.forEach(x => {
    box.innerHTML += `
      <div>
        ${x.name}
        <select data-name="${x.name}">
          ${Array.from({length:x.max_score+1},(_,i)=>`<option>${i}</option>`).join("")}
        </select>
      </div>`;
  });
}

async function submitScore() {
  judgeName = judge.value;
  teamId = team.value;
  if(!judgeName || !teamId){ alert("Select Judge & Team"); return;}

  const scores = [...document.querySelectorAll("#criteria select")]
    .map(s => ({criterion_name:s.dataset.name, score:Number(s.value)}));

  await fetch(`/api/events/${eventId}/scores`,{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({judge_name:judgeName, team_id:teamId, scores})
  });

  alert("Submitted");
  loadTeams();
}

async function loadAdmin() {
  const r = await fetch(`/api/events/${eventId}/judge-wise-table`).then(r=>r.json());
  const t = document.getElementById("admin");
  t.innerHTML = "";
  r.forEach(x=>{
    t.innerHTML+=`<tr>
      <td>${x.judge_name}</td>
      <td>${x.team_id}</td>
      <td>${x.presentation}</td>
      <td>${x.idea}</td>
      <td>${x.uniqueness}</td>
      <td>${x.methodology}</td>
      <td>${x.total}</td>
    </tr>`;
  });
}

window.onload = load;
