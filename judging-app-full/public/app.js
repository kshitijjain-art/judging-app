let eventId = 1; // default event
let criteriaList = [];

/* ================= PANEL CONTROL ================= */

function showJudge() {
  document.getElementById("judgePanel").style.display = "block";
  document.getElementById("adminPanel").style.display = "none";
}

function openAdmin() {
  const pass = prompt("Enter Admin Password");
  if (pass !== "admin2025") {
    alert("Incorrect password");
    return;
  }
  document.getElementById("judgePanel").style.display = "none";
  document.getElementById("adminPanel").style.display = "block";
  loadAdminData();
}

/* ================= LOAD INITIAL DATA ================= */

fetch("/api/judges")
  .then(r => r.json())
  .then(data => {
    const jSel = document.getElementById("judgeSelect");
    data.forEach(j => {
      const o = document.createElement("option");
      o.value = j.name;
      o.text = j.name;
      jSel.appendChild(o);
    });
  });

fetch(`/api/events/${eventId}/teams`)
  .then(r => r.json())
  .then(data => {
    const tSel = document.getElementById("teamSelect");
    data.forEach(t => {
      const o = document.createElement("option");
      o.value = t.id;
      o.text = t.name;
      tSel.appendChild(o);
    });
  });

fetch(`/api/events/${eventId}/criteria`)
  .then(r => r.json())
  .then(data => {
    criteriaList = data;
    renderCriteria(data);
  });

/* ================= TEAM DETAILS ================= */

document.getElementById("teamSelect").addEventListener("change", e => {
  const teamId = e.target.value;
  if (!teamId) return;

  fetch(`/api/teams/${teamId}`)
    .then(r => r.json())
    .then(t => {
      document.getElementById("teamDetails").innerHTML = `
        <b>Team:</b> ${t.name}<br/>
        <b>Leader:</b> ${t.leader_name}<br/>
        <b>Email:</b> ${t.leader_email}<br/>
        <b>Phone:</b> ${t.leader_phone}<br/>
        <b>Members:</b> ${t.member_count}
      `;
    });
});

/* ================= CRITERIA ================= */

function renderCriteria(list) {
  const cDiv = document.getElementById("criteria");
  cDiv.innerHTML = "";

  list.forEach(c => {
    const row = document.createElement("div");
    row.innerHTML = `
      <span>${c.name} (Max ${c.max_score})</span>
      <select data-name="${c.name}">
        ${Array.from({ length: c.max_score + 1 }, (_, i) =>
          `<option value="${i}">${i}</option>`
        ).join("")}
      </select>
    `;
    cDiv.appendChild(row);
  });

  cDiv.addEventListener("change", calculateTotal);
}

rememberedTotal = 0;

function calculateTotal() {
  let total = 0;
  document.querySelectorAll("#criteria select").forEach(s => {
    total += Number(s.value);
  });
  rememberedTotal = total;
  document.getElementById("totalScore").innerText = total;
}

/* ================= SUBMIT ================= */

function submitScore() {
  const judge = document.getElementById("judgeSelect").value;
  const team = document.getElementById("teamSelect").value;

  if (!judge || !team) {
    alert("Select judge and team");
    return;
  }

  const scores = [];
  document.querySelectorAll("#criteria select").forEach(s => {
    scores.push({
      criterion_name: s.dataset.name,
      score: Number(s.value)
    });
  });

  fetch(`/api/events/${eventId}/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      judge_name: judge,
      team_id: team,
      scores,
      remark: document.getElementById("remark").value
    })
  }).then(() => {
    alert("Marks submitted");
    location.reload();
  });
}

/* ================= ADMIN ================= */

function loadAdminData() {
  fetch(`/api/events/${eventId}/judge-wise-table`)
    .then(r => r.json())
    .then(rows => {
      const tbody = document.querySelector("#adminTable tbody");
      tbody.innerHTML = "";
      rows.forEach(r => {
        tbody.innerHTML += `
          <tr>
            <td>${r.judge_name}</td>
            <td>${r.team_name}</td>
            <td>${r.presentation}</td>
            <td>${r.idea}</td>
            <td>${r.uniqueness}</td>
            <td>${r.methodology}</td>
            <td>${r.total}</td>
          </tr>
        `;
      });
    });
}

function downloadCSV() {
  window.open(`/api/events/${eventId}/results.csv`, "_blank");
}
