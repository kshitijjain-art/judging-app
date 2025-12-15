let currentEvent = null;

function showJudge() {
  document.getElementById("judgePanel").style.display = "block";
  document.getElementById("adminPanel").style.display = "none";
  loadJudgePanel();
}

function showAdmin() {
  document.getElementById("judgePanel").style.display = "none";
  document.getElementById("adminPanel").style.display = "block";
  loadAdminPanel();
}

async function loadJudgePanel() {
  const judges = await fetch("/api/judges").then(r => r.json());
  const events = await fetch("/api/events").then(r => r.json());

  currentEvent = events[0].id;
  const teams = await fetch(`/api/events/${currentEvent}/teams`).then(r => r.json());
  const criteria = await fetch(`/api/events/${currentEvent}/criteria`).then(r => r.json());

  let html = `
    <h3>Judge Panel</h3>

    <label>Judge</label>
    <select id="judge">
      <option value="">Select Judge</option>
      ${judges.map(j => `<option>${j.name}</option>`).join("")}
    </select>

    <br><br>

    <label>Team</label>
    <select id="team">
      <option value="">Select Team</option>
      ${teams.map(t => `<option value="${t.id}">${t.name}</option>`).join("")}
    </select>

    <br><br>
  `;

  criteria.forEach(c => {
    html += `
      ${c.name}
      <select data-criterion="${c.name}">
        ${Array.from({length: c.max_score+1}, (_,i)=>`<option>${i}</option>`).join("")}
      </select><br>
    `;
  });

  html += `
    <br>
    <textarea id="remark" placeholder="Remarks"></textarea><br><br>
    <button onclick="submitScore()">Submit</button>
  `;

  document.getElementById("judgePanel").innerHTML = html;
}

async function submitScore() {
  const judge = document.getElementById("judge").value;
  const team = document.getElementById("team").value;
  const remark = document.getElementById("remark").value;

  if (!judge || !team) {
    alert("Select judge and team");
    return;
  }

  const scoreEls = document.querySelectorAll("[data-criterion]");
  const scores = Array.from(scoreEls).map(el => ({
    criterion_name: el.dataset.criterion,
    score: el.value
  }));

  await fetch(`/api/events/${currentEvent}/scores`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      judge_name: judge,
      team_id: team,
      scores,
      remark
    })
  });

  alert("Marks submitted");
  loadJudgePanel();
}

async function loadAdminPanel() {
  const results = await fetch(`/api/events/${currentEvent}/results`).then(r => r.json());

  let html = `
    <h3>Admin Dashboard</h3>
    <button onclick="window.open('/api/events/${currentEvent}/results.csv')">
      Download CSV
    </button>

    <table border="1" cellpadding="6">
      <tr><th>Team</th><th>Avg Score</th><th>Judges</th></tr>
  `;

  results.forEach(r => {
    html += `
      <tr>
        <td>${r.team_name}</td>
        <td>${r.avg_score}</td>
        <td>${r.judges_count}</td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("adminPanel").innerHTML = html;
}
