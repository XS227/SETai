const API="/si-api";
const thread=document.getElementById("thread");
const form=document.getElementById("composer");
const promptEl=document.getElementById("prompt");
const sendBtn=document.getElementById("send");
const runtime=document.getElementById("runtime");

function setStatus(name,state,label){
  const row=document.querySelector('[data-service="'+name+'"]');
  if(!row)return;
  row.classList.remove("online","offline");
  if(state)row.classList.add(state);
  row.querySelector("em").textContent=label;
}
function safe(value){
  const el=document.createElement("div");
  el.textContent=value;
  return el.innerHTML;
}
