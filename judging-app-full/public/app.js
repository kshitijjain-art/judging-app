const PIN="2025";
const criteriaList=[
{id:1,name:"Presentation Skills",max:10},
{id:2,name:"Idea",max:10},
{id:3,name:"Uniqueness",max:10},
{id:4,name:"Methodology",max:10}
];
let scores={1:0,2:0,3:0,4:0};

function init(){
 document.getElementById("judge").innerHTML=
  ["Prof. Kshitij Jain","Dr. Ajay Verma"].map(j=>`<option>${j}</option>`).join("");
 document.getElementById("team").innerHTML=
  ["Team Alpha","Team Beta"].map(t=>`<option>${t}</option>`).join("");
 const c=document.getElementById("criteria");
 criteriaList.forEach(x=>{
  c.innerHTML+=`
   <div>
    ${x.name} (max ${x.max})
    <select onchange="setScore(${x.id},this.value)">
     ${Array.from({length:x.max+1},(_,i)=>`<option>${i}</option>`).join("")}
    </select>
   </div>`;
 });
}

function setScore(id,v){
 scores[id]=Number(v);
 document.getElementById("total").innerText=
  "Total: "+Object.values(scores).reduce((a,b)=>a+b,0);
}

function submitScore(){ alert("Score submitted"); }
function showJudge(){
 document.getElementById("judgePanel").style.display="block";
 document.getElementById("adminPanel").style.display="none";
}
function adminLogin(){
 const p=prompt("Enter Admin PIN");
 if(p===PIN){
  document.getElementById("judgePanel").style.display="none";
  document.getElementById("adminPanel").style.display="block";
 } else alert("Wrong PIN");
}
function loadResults(){
 document.getElementById("results").innerHTML="<p>Results will load from backend</p>";
}
function downloadCSV(){ alert("CSV download"); }
init();
