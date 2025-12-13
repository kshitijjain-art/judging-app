const EVENT_ID = 1;
const PIN = "2025";

const criteriaList = [
 {id:1,name:"Presentation Skills",max:10},
 {id:2,name:"Idea",max:10},
 {id:3,name:"Uniqueness",max:10},
 {id:4,name:"Methodology",max:10}
];

let scores = {};
criteriaList.forEach(c=>scores[c.id]=0);

window.onload = () => {
 loadJudges();
 loadTeams();
 renderCriteria();
};

async function loadJudges(){
 try{
  const r = await fetch("/api/judges");
  const d = await r.json();
  judge.innerHTML = d.map(j=>`<option>${j.name}</option>`).join("");
 }catch{
  judge.innerHTML = "<option>Judge</option>";
 }
}

async function loadTeams(){
 const r = await fetch(`/api/events/${EVENT_ID}/teams`);
 const d = await r.json();
 team.innerHTML = d.map(t=>`<option value='${t.id}'>${t.name}</option>`).join("");
 loadTeamDetails();
}

async function loadTeamDetails(){
 const teamId = team.value;
 if(!teamId) return;
 const r = await fetch(`/api/teams/${teamId}/details`);
 const d = await r.json();
 document.getElementById("teamDetails").innerHTML = `
  <b>Team Leader</b><br>
  Name: ${d.leader_name}<br>
  Email: ${d.leader_email}<br>
  Phone: ${d.leader_phone}<br>
  Members: ${d.member_count}
 `;
}

function renderCriteria(){
 const c = document.getElementById("criteria");
 c.innerHTML="";
 criteriaList.forEach(x=>{
  c.innerHTML += `
   <div>${x.name} (max ${x.max})
   <select onchange="setScore(${x.id},this.value)">
    ${Array.from({length:x.max+1},(_,i)=>`<option value='${i}'>${i}</option>`).join("")}
   </select></div>`;
 });
}

function setScore(id,val){
 scores[id]=Number(val);
 total.innerText = "Total: " + Object.values(scores).reduce((a,b)=>a+b,0);
}

async function submitScore(){
 const payload = {
  judge_name: judge.value,
  team_id: Number(team.value),
  scores: Object.entries(scores).map(([cid,score])=>({criterion_id:Number(cid),score})),
  remark: remark.value
 };
 const r = await fetch(`/api/events/${EVENT_ID}/scores`,{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify(payload)
 });
 alert(r.ok ? "Saved successfully" : "Error saving");
}

function showJudge(){
 judgePanel.style.display="block";
 adminPanel.style.display="none";
}

function adminLogin(){
 const p = prompt("Enter Admin PIN");
 if(p===PIN){ showAdmin(); } else alert("Wrong PIN");
}

async function showAdmin(){
 judgePanel.style.display="none";
 adminPanel.style.display="block";
 loadResults();
}

async function loadResults(){
 const r = await fetch(`/api/events/${EVENT_ID}/results`);
 const data = await r.json();
 let html = `<table><tr><th>Rank</th><th>Team</th><th>Avg</th><th>Judges</th></tr>`;
 data.forEach((x,i)=>{
  html+=`<tr><td>${i+1}</td><td>${x.team_name}</td><td>${x.avg_score}</td><td>${x.judges_count}</td></tr>`;
 });
 html+=`</table>`;
 results.innerHTML = html;
}

function downloadCSV(){
 window.location.href = `/api/events/${EVENT_ID}/results.csv`;
}
