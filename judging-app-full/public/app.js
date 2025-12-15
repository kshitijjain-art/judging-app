let eventId = 1;

function showJudge() {
  judgePanel.style.display = "block";
  adminPanel.style.display = "none";
}

function showAdmin() {
  judgePanel.style.display = "none";
  adminPanel.style.display = "block";
  loadAdmin();
}

/* ================= LOAD ================= */

async function load() {
  const judges = await fetch("/api/judges").then(r=>r.json());
  judge.innerHTML = `<option value="">Select Judge</option>`;
  judges.forEach(j=>judge.innerHTML+=`<option>${j.name}</option>`);

  loadTeams();
  loadCriteria();
}

async function loadTeams() {
  const t = await fetch(`/api/events/${eventId}/teams`).then(r=>r.json());
  team.innerHTML = `<option value="">Select Team</option>`;
  t.forEach(x=>team.innerHTML+=`<option value="${x.id}">${x.name}</option>`);
}

async function loadTeamDetails() {
  if(!team.value) return;
  const d = await fetch(`/api/teams/${team.value}`).then(r=>r.json());
  teamDetails.innerHTML = `
    <b>Leader:</b> ${d.leader_name}<br/>
    <b>Email:</b> ${d.leader_email}<br/>
    <b>Phone:</b> ${d.leader_phone}<br/>
    <b>Members:</b> ${d.member_count}
  `;
}

async function loadCriteria() {
  const c = await fetch(`/api/events/${eventId}/criteria`).then(r=>r.json());
  criteria.innerHTML = "";
  c.forEach(x=>{
    criteria.innerHTML+=`
      <div>
        ${x.name}
        <select data-name="${x.name}">
          ${Array.from({length:11},(_,i)=>`<option>${i}</option>`).join("")}
        </select>
      </div>
    `;
  });
}

/* ================= SUBMIT ================= */

async function submitScore() {
  if(!judge.value || !team.value){
    alert("Select Judge & Team");
    return;
  }

  const scores=[...document.querySelectorAll("#criteria select")]
    .map(s=>({criterion_name:s.dataset.name, score:Number(s.value)}));

  await fetch(`/api/events/${eventId}/scores`,{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      judge_name:judge.value,
      team_id:team.value,
      scores
    })
  });

  alert("Marks Submitted");
  loadTeams();
}

/* ================= ADMIN ================= */

async function loadAdmin() {
  const r = await fetch(`/api/events/${eventId}/judge-wise-table`).then(r=>r.json());
  adminTable.innerHTML="";
  r.forEach(x=>{
    adminTable.innerHTML+=`
      <tr>
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

function downloadCSV(){
  window.open(`/api/events/${eventId}/results.csv`);
}

window.onload = load;
