let eventId = 1;
let criteriaData = [];

/* ================= UTIL ================= */

function submittedKey(judge, team) {
  return `submitted_${eventId}_${judge}_${team}`;
}

function hasSubmitted(judge, team) {
  return localStorage.getItem(submittedKey(judge, team));
}

function markSubmitted(judge, team) {
  localStorage.setItem(submittedKey(judge, team), "yes");
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

/* ================= LOAD JUDGES ================= */

fetch("/api/judges")
  .then(r => r.json())
  .then(data => {
    const sel = document.getElementById("judgeSelect");
    data.forEach(j => {
      const o = document.createElement("option");
      o.value = j.name;
      o.text = j.name;
      sel.appendChild(o);
    });
  });

/* ================= LOAD TEAMS ================= */

function loadTeams() {
  const judge = document.getElementById("judgeSelect").value;
  const teamSel = document.getElementById("teamSelect");

  teamSel.innerHTML = `<option value="">-- Select Team --</option>`;

  fetch(`/api/events/${eventId}/teams`)
    .then(r => r.json())
    .then(teams => {
      teams.forEach(t => {
        if (!judge || hasSubmitted(judge, t.id)) return;

        const o = document.createElement("option");
        o.value = t.id;
        o.text = t.name;
        teamSel.appendChild(o);
      });
    });
}

document.getElementById("judgeSelect").addEventListener("change", loadTeams);

/* ================= TEAM DETAILS ================= */

document.getElementById("teamSelect").addEventListener("change", e => {
  const teamId = e.target.value;
  if (!teamId) return;

  fetch(`/api/teams/${teamId}`)
    .then(r => r.json())
    .then(t => {
      document.getElementById("teamDetails").innerHTML = `
        <b>Team:</b> ${t.name}<br>
        <b>Leader:</b> ${t.leader_name}<br>
        <b>Email:</b> ${t.leader_email}<br>
        <b>Phone:</b> ${t.leader_phone}<br>
        <b>Members:</b> ${t.member_count}
      `;
    });
});

/* ================= LOAD CRITERIA ================= */

fetch(`/api/events/${eventId}/criteria`)
  .then(r => r.json())
  .then(data => {
    criteriaData = data;
    renderCriteria();
  });

function renderCriteria() {
  const box = document.getElementById("criteria");
  box.innerHTML = "";

  criteriaData.forEach(c => {
    const row = document.createElement("div");
    row.style.marginBottom = "10px";

    row.innerHTML = `
      <label>${c.name} (Max ${c.max_score})</label>
      <select data-name="${c.name}">
        ${Array.from({ length: c.max_score + 1 }, (_, i) =>
          `<option value="${i}">${i}</option>`
        ).join("")}
      </select>
    `;

    box.appendChild(row);
  });

  box.addEventListener("change", updateTotal);
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll("#criteria select").forEach(s => {
    total += Number(s.value);
  });
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
    markSubmitted(judge, team);
    alert("Marks submitted");

    document.getElementById("teamSelect").value = "";
    document.getElementById("teamDetails").innerHTML = "";
    document.getElementById("remark").value = "";

    loadTeams(); // 🔥 REMOVE TEAM FROM DROPDOWN
  });
}

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
            <td>${r.judge_name}</td>
            <td>${r.team_name}</td>
            <td>${r.presentation}</td>
            <td>${r.idea}</td>
            <td>${r.uniqueness}</td>
            <td>${r.methodology}</td>
            <td><b>${r.total}</b></td>
          </tr>
        `;
      });
    });
}

function downloadCSV() {
  window.open(`/api/events/${eventId}/results.csv`, "_blank");
}
