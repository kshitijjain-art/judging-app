const EVENT_ID = 1;
const PIN = "2025";

const criteria = [
 {id:1,name:"Presentation Skills"},
 {id:2,name:"Idea"},
 {id:3,name:"Uniqueness"},
 {id:4,name:"Methodology"}
];

let scores = {1:0,2:0,3:0,4:0};

window.onload = () => {
 loadJudges();
 renderCriteria();
};

async function loadJudges(){
 const r = await fetch("/api/judges");
 const d = await r.json();
 judge.innerHTML = d.map(j=>`<option>${j.name}</option>`).join("");
 loadTeams();
}

async function loadTeams(){
 const r = await fetch(`/api/events/${EVENT_ID}/teams?judge=${encodeURIComponent(judge.value)}`);
 const d = await r.json();
 team.innerHTML = d.map(t=>`<option value="${t.id}">${t.name}</option>`).join("");
 loadTeamDetails();
}

async function loadTeamDetails(){
 if(!team.value) return;
 const r = await fetch(`/api/teams/${team.value}/details`);
 const d = await r.json();
 teamDetails.innerHTML = `
  <b>Leader:</b> ${d.leader_name}<br>
  <b>Email:</b> ${d.leader_email}<br>
  <b>Phone:</b> ${d.leader_phone}<br>
  <b>Members:</b> ${d.member_count}`;
}

function renderCriteria(){
 criteriaDiv = document.getElementById("criteria");
 criteriaDiv.innerHTML = "";
 criteria.forEach(c=>{
  criteriaDiv.innerHTML += `
   <div>${c.name}
    <select onchange="setScore(${c.id},this.value)">
     ${Array.from({length:11},(_,i)=>`<option>${i}</option>`).join("")}
    </select>
   </div>`;
 });
}

function setScore(id,val){
 scores[id]=Number(val);
 total.innerText = "Total: "+Object.values(scores).reduce((a,b)=>a+b,0);
}

async function submitScore(){
 const payload = {
  judge_name: judge.value,
  team_id: Number(team.value),
  scores: Object.entries(scores).map(([k,v])=>({criterion_id:Number(k),score:v})),
  remark: remark.value
 };
 const r = await fetch(`/api/events/${EVENT_ID}/scores`,{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify(payload)
 });
 if(r.ok){
  alert("Saved");
  loadTeams();
 }
}

function showJudge(){
 judgePanel.style.display="block";
 adminPanel.style.display="none";
}

function adminLogin(){
 const p = prompt("Enter PIN");
 if(p===PIN){
  judgePanel.style.display="none";
  adminPanel.style.display="block";
  loadAdmin();
 }
}

async function loadAdmin(){
 const r1 = await fetch(`/api/events/${EVENT_ID}/results`);
 const rank = await r1.json();
 let h1 = "<h3>Top Ranking</h3><table><tr><th>Rank</th><th>Team</th><th>Avg</th></tr>";
 rank.forEach((x,i)=>h1+=`<tr><td>${i+1}</td><td>${x.team_name}</td><td>${x.avg_score}</td></tr>`);
 h1+="</table>";
 results.innerHTML = h1;

 const r2 = await fetch(`/api/events/${EVENT_ID}/judge-wise-table`);
 const jw = await r2.json();
 let h2 = "<h3>Judge-wise Marks</h3><table><tr><th>Judge</th><th>Team</th><th>Presentation</th><th>Idea</th><th>Uniqueness</th><th>Methodology</th><th>Total</th></tr>";
 jw.forEach(x=>{
  h2+=`<tr><td>${x.judge}</td><td>${x.team}</td><td>${x.presentation}</td><td>${x.idea}</td><td>${x.uniqueness}</td><td>${x.methodology}</td><td><b>${x.total}</b></td></tr>`;
 });
 h2+="</table>";
 judgeWise.innerHTML = h2;
}
