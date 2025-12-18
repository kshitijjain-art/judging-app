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
  }).then(() => {
    markSubmitted(judge, team);
    alert("Marks submitted");

    document.getElementById("teamSelect").value = "";
    document.getElementById("teamDetails").innerHTML = "";
    document.getElementById("remark").value = "";

    loadTeams(); // 🔥 REMOVE TEAM FROM DROPDOWN
  });
}
/* ================= PANEL SWITCH ================= */

function showJudge() {
  document.getElementById("judgePanel").style.display = "block";
  document.getElementById("adminPanel").style.display = "none";
}

function openAdmin() {
  const pin = prompt("Enter Admin PIN");
  if (pin !== "2025") {
    alert("Wrong PIN");
    return;
  }
  document.getElementById("judgePanel").style.display = "none";
  document.getElementById("adminPanel").style.display = "block";
  loadAdmin();
}
/* ================= TEAM DETAILS ================= */

/* ================= TEAM DETAILS ================= */

document.getElementById("teamSelect").addEventListener("change", e => {
  const teamId = e.target.value;
  if (!teamId) {
    document.getElementById("teamDetails").innerHTML = "";
    return;
  }

  fetch(`/api/teams/${teamId}`)
    .then(r => r.json())
    .then(t => {
      document.getElementById("teamDetails").innerHTML = `
        <div class="team-card">
          <div class="team-grid">

            <!-- LEFT COLUMN -->
            <div class="team-col">
              <h4>Team Details</h4>
              <p><b>Team:</b> ${t.name}</p>
              <p><b>Leader:</b> ${t.leader_name}</p>
              <p><b>Email:</b> ${t.leader_email}</p>
              <p><b>Phone:</b> ${t.leader_phone}</p>
              <p><b>Members:</b> ${t.member_count}</p>
            </div>

            <!-- RIGHT COLUMN -->
            <div class="team-col">
              <h4>Mentor & Academic</h4>
              <p><b>Mentor Name:</b> ${t.mentor_name || "-"}</p>
              <p><b>Mentor Email:</b> ${t.mentor_email || "-"}</p>
              <p><b>Student Branch:</b> ${t.student_branch || "-"}</p>
            </div>

          </div>
        </div>
      `;
    })
    .catch(err => {
      console.error(err);
      document.getElementById("teamDetails").innerHTML =
        "<p style='color:red'>Failed to load team details</p>";
    });
});

/* ================= ADMIN ================= */

function loadAdmin() {
  fetch(`/api/events/${eventId}/judge-wise-table`)
    .then(r => r.json())
    .then(rows => {
      const body = document.querySelector("#adminTable tbody");
      body.innerHTML = "";

      rows.forEach(r => {
        body.innerHTML += `
          <tr>
            <td>${r.judge}</td>
            <td>${r.team}</td>
            <td>${r.leader_name}</td>
            <td>${r.leader_email}</td>
            <td>${r.presentation}</td>
            <td>${r.idea}</td>
            <td>${r.uniqueness}</td>
            <td>${r.methodology}</td>
            <td><b>${r.total}</b></td>
          </tr>
        `;
      });
    })
    .catch(err => {
      console.error("Admin load error:", err);
    });

function loadTeamSummary() {
  fetch(`/api/events/${eventId}/team-summary`)
    .then(r => r.json())
    .then(rows => {
      const body = document.querySelector("#teamSummary tbody");
      body.innerHTML = "";

      rows.forEach((r, i) => {
        body.innerHTML += `
          <tr>
            <td>${i + 1}</td>
            <td>${r.team_name}</td>
            <td>${r.leader_name}</td>
            <td>${r.leader_email}</td>
            <td>${r.judges_count}</td>
            <td>${r.total_marks}</td>
            <td>${r.average_marks}</td>
          </tr>
        `;
      });
    });
}

  
}


function downloadCSV() {
  window.open(`/api/events/${eventId}/results.csv`, "_blank");
}
