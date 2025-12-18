const judgeSelect = document.getElementById("judgeSelect");
const teamSelect = document.getElementById("teamSelect");
const totalScoreEl = document.getElementById("totalScore");

// load dropdown values
fetch("/api/judges").then(r=>r.json()).then(d=>{
  judgeSelect.innerHTML = '<option value="">Select Judge</option>';
  d.forEach(j => judgeSelect.innerHTML += `<option>${j.name}</option>`);
});

fetch("/api/events/1/teams").then(r=>r.json()).then(d=>{
  teamSelect.innerHTML = '<option value="">Select Team</option>';
  d.forEach(t => teamSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`);
});

// team details
teamSelect.addEventListener("change", () => {
  fetch(`/api/teams/${teamSelect.value}`).then(r=>r.json()).then(t=>{
    document.getElementById("teamDetails").innerHTML = `
      <h3>Team Details</h3>
      Team: ${t.name}<br>
      Leader: ${t.leader_name}<br>
      Email: ${t.leader_email}<br>
      Phone: ${t.leader_phone}<br>
      Members: ${t.member_count}
    `;

    document.getElementById("mentorDetails").innerHTML = `
      <h3>Mentor & Academic</h3>
      Mentor: ${t.mentor_name}<br>
      Mentor Email: ${t.mentor_email}<br>
      Branch: ${t.student_branch}
    `;
  });
});

// scores dropdown 0–10
document.querySelectorAll(".score").forEach(s=>{
  for(let i=0;i<=10;i++) s.innerHTML += `<option>${i}</option>`;
  s.addEventListener("change", calcTotal);
});

function calcTotal(){
  let total = 0;
  document.querySelectorAll(".score").forEach(s=> total += Number(s.value));
  totalScoreEl.innerText = total;
}

function submitMarks(){
  const scores = [];
  document.querySelectorAll(".score").forEach(s=>{
    scores.push({ criterion_name: s.dataset.name, score: s.value });
  });

  fetch("/api/events/1/scores",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      judge_name: judgeSelect.value,
      team_id: teamSelect.value,
      scores,
      remark: document.getElementById("remark").value
    })
  }).then(()=>alert("Marks Submitted"));
}
