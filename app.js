const $=id=>document.getElementById(id), money=n=>"$"+n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+"/s";
function element(tag,text="",className=""){
  const node=document.createElement(tag);
  node.textContent=String(text);
  node.className=className;
  return node;
}
function badge(name){
  const node=element("span",name,"chip");
  const background=mutationByName.get(name)?.color;
  if(background)node.style.setProperty("--mutation-bg",background);
  return node;
}
function chip(name,inputName){
  const label=element("label","","chip-label"),input=element("input");
  input.type="checkbox";input.name=inputName;input.value=name;
  label.append(input,badge(name));
  return label;
}
function tableCell(content,className=""){
  const cell=element("td","",className);
  cell.append(content);
  return cell;
}
function emptyRow(message,columns){
  const row=element("tr"),cell=tableCell(message,"muted");
  cell.colSpan=columns;row.append(cell);
  return row;
}
function checkedValues(name){
  return [...document.querySelectorAll(`[name="${name}"]:checked`)].map(input=>input.value);
}
function clearChecks(name){
  document.querySelectorAll(`[name="${name}"]`).forEach(input=>input.checked=false);
}
function mutationMultiplier(selected){
  const sorted=[...selected].sort((a,b)=>b.value-a.value);
  return sorted.length?sorted.reduce((total,mutation,i)=>i?total+(mutation.value-1)/(2**i):mutation.value,0):1;
}
function cardIncome(weight,rate,grade,multiplier){return weight*rate*grade*multiplier}
function totalIncome(base,rebirth,friend,vip){
  return {online:base*(1+(rebirth+friend)/100)*(vip?1.10:1),offline:base*0.5};
}
function formatMultiplier(value){
  return value.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:5,useGrouping:false});
}
const mutationByName=new Map(mutations.map(mutation=>[mutation.name,mutation]));

rarities.forEach(({name,rate})=>$("rarity").add(new Option(rate==null?`${name} — unknown`:`${name} — $${rate}/kg`,name)));
$("rarity").value="Infinity";grades.forEach(([n,v])=>$("grade").add(new Option(`${n} — ${v.toFixed(2)}×`,n)));$("grade").value="F";
$("calcMutations").replaceChildren(...mutations.filter(m=>m.name!=="Normal / Base").map(m=>chip(m.name,"calcMutation")));
$("ownedMutations").replaceChildren(...[...new Set(recipes.flatMap(r=>[...r[0],r[1]]))].map(n=>chip(n,"ownedMutation")));

function calculate(){
  const weight=Number($("weight").value), rarity=rarities.find(r=>r.name===$("rarity").value), grade=grades.find(g=>g[0]===$("grade").value);
  const names=checkedValues("calcMutation");
  $("calcSelection").textContent=`${names.length} mutations selected`;
  $("clearCalc").disabled=names.length===0;
  $("weight").setAttribute("aria-invalid",String(!Number.isFinite(weight)||weight<=0));
  $("rarity").setAttribute("aria-invalid",String(rarity.rate==null));
  const selected=names.map(name=>mutationByName.get(name));
  const unknown=selected.filter(m=>m.value==null);
  if(!Number.isFinite(weight)||weight<=0){showCalculatorError("Enter a weight greater than zero.");return}
  if(rarity.rate==null){showCalculatorError(`${rarity.name} does not have a confirmed $/kg rate yet.`);return}
  if(unknown.length){showCalculatorError(`Needs testing: ${unknown.map(item=>item.name).join(", ")}`);return}
  const combined=mutationMultiplier(selected);
  $("finalMoney").textContent=money(cardIncome(weight,rarity.rate,grade[1],combined));
  $("breakdown").textContent=`${weight} kg × $${rarity.rate}/kg × ${grade[1].toFixed(2)} grade × ${combined.toFixed(5)} mutations`;
}
function showCalculatorError(message){$("finalMoney").textContent="Cannot calculate";$("breakdown").textContent=message}
["weight","rarity","grade"].forEach(id=>$(id).addEventListener("input",calculate));
$("calcMutations").addEventListener("change",calculate);
$("clearCalc").addEventListener("click",()=>{
  clearChecks("calcMutation");
  calculate();
});

function calculateTotalIncome(){
  const ids=["baseIncome","rebirthBoost","friendBoost"];
  const values=ids.map(id=>$(id).value.trim()===""?NaN:Number($(id).value));
  const invalid=values.map(value=>!Number.isFinite(value)||value<0);
  ids.forEach((id,i)=>$(id).setAttribute("aria-invalid",String(invalid[i])));
  $("totalError").textContent=invalid.some(Boolean)?"Enter a non-negative number in each highlighted field.":"";
  if(invalid.some(Boolean)){
    $("onlineMoney").textContent="Cannot calculate";
    $("offlineMoney").textContent="Cannot calculate";
    return;
  }
  const [base,rebirth,friend]=values;
  const income=totalIncome(base,rebirth,friend,$("hasVip").checked);
  $("onlineMoney").textContent=money(income.online);
  $("offlineMoney").textContent=money(income.offline);
}
["baseIncome","rebirthBoost","friendBoost"].forEach(id=>$(id).addEventListener("input",calculateTotalIncome));
$("hasVip").addEventListener("change",calculateTotalIncome);

function renderMutationList(){
  const q=$("mutationSearch").value.trim().toLowerCase(),mode=document.querySelector('[name="mutationMode"]:checked').value;
  const list=mutations.filter(m=>(mode==="all"||m.status===mode)&&(!q||m.name.toLowerCase().includes(q)||(m.value!=null&&String(m.value).includes(q))));
  const cards=list.map(m=>{
    const card=element("article","","mutation-card");
    const background=m.color;
    if(background)card.style.setProperty("--mutation-bg",background);
    card.append(element("strong",m.name),element("span",m.value==null?"Unknown":m.value.toFixed(2)+"×","mult"),element("div",`${m.base?"Base mutation · ":""}${m.status==="confirmed"?"Confirmed":"Needs testing"}`,"tag"));
    return card;
  });
  $("mutationList").replaceChildren(...(cards.length?cards:[element("p","No matching mutations. Clear the search or select All.","muted")]));
  $("mutationStatus").textContent=`Showing ${list.length} of ${mutations.length} mutations`;
}
$("mutationSearch").addEventListener("input",renderMutationList);$("mutationModes").addEventListener("change",renderMutationList);

function renderRarities(){
  const q=$("raritySearch").value.trim().toLowerCase();
  const list=rarities.filter(({name,rate})=>!q||name.toLowerCase().includes(q)||(rate!=null&&String(rate).includes(q)));
  const rows=list.map(({name,rate,weightRange})=>{
    const range=weightRange?`${weightRange[0].toFixed(2)}–${weightRange[1].toFixed(2)} kg`:"—";
    const row=element("tr");
    row.append(tableCell(element("strong",name)),tableCell(rate==null?"—":element("strong",`$${rate.toFixed(2)}/kg`)),tableCell(range));
    return row;
  });
  $("rarityRows").replaceChildren(...(rows.length?rows:[emptyRow("No matching rarities. Clear the search to show all rates.",3)]));
  $("rarityStatus").textContent=`Showing ${list.length} of ${rarities.length} rarities`;
}
$("raritySearch").addEventListener("input",renderRarities);

function editDistance(a,b){
  const row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    let diagonal=row[0];row[0]=i;
    for(let j=1;j<=b.length;j++){
      const above=row[j];
      row[j]=a[i-1]===b[j-1]?diagonal:1+Math.min(diagonal,row[j-1],above);
      diagonal=above;
    }
  }
  return row[b.length];
}
function isAdjacentSwap(a,b){
  if(a.length!==b.length)return false;
  const differences=[];
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences.push(i);
  return differences.length===2&&differences[1]===differences[0]+1&&a[differences[0]]===b[differences[1]]&&a[differences[1]]===b[differences[0]];
}
function normalizeSearch(text){
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
}
function fuzzyMatch(field,query,queryWords){
  if(field.text.includes(query))return true;
  return queryWords.every(word=>word.length>=4&&field.words.some(targetWord=>editDistance(word,targetWord)<=Math.max(1,Math.floor(word.length*.3))||isAdjacentSwap(word,targetWord)));
}
const searchablePacks=packPool.map(card=>({
  card,
  fields:[...new Set([card.idol,card.group,card.pack,card.rarity])].map(value=>{
    const text=normalizeSearch(value);
    return {text,words:text.split(" ")};
  })
}));
function renderPacks(){
  const q=normalizeSearch($("packSearch").value),queryWords=q.split(" ");
  const list=searchablePacks.filter(({fields})=>!q||fields.some(field=>fuzzyMatch(field,q,queryWords))).map(({card})=>card);
  const cards=list.map(card=>{
    const node=element("article","","pack-result");
    node.append(element("strong",card.idol),element("div",`${card.group} · ${card.rarity}`,"pack-meta"),element("div",`${card.pack} pack`,`pack-name ${packClass(card.pack)}`));
    return node;
  });
  $("packResults").replaceChildren(...(cards.length?cards:[element("p","No matching cards. Try another idol, group, pack, or rarity.","muted")]));
  $("packStatus").textContent=`Showing ${list.length} of ${packPool.length} cards`;
}
$("packSearch").addEventListener("input",renderPacks);
function packClass(name){return name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}

function renderCombinations(){
  const totals={};
  Object.entries(combinations).forEach(([id,names])=>{
    const selected=names.map(name=>mutationByName.get(name)).sort((a,b)=>b.value-a.value);
    const multiplier=mutationMultiplier(selected);
    totals[id]=multiplier;
    $(`${id}Combination`).textContent=`${selected.map(m=>m.name).join(" + ")} = ${formatMultiplier(multiplier)}×`;
    const terms=selected.map((m,i)=>i?`(${m.value.toFixed(2)}−1)/${2**i}`:m.value.toFixed(2));
    $(`${id}Formula`).textContent=`${terms.join(" + ")} = ${formatMultiplier(multiplier)}×`;
  });
  $("festiveImprovement").textContent=`This combination earns ${((totals.festive/totals.normal-1)*100).toFixed(1)}% more than the normal best combination.`;
}

function renderRecipes(){
  const owned=new Set(checkedValues("ownedMutation"));
  $("ownedSelection").textContent=`${owned.size} mutations selected`;
  $("clearOwned").disabled=owned.size===0;
  const q=$("recipeSearch").value.trim().toLowerCase(),mode=document.querySelector('[name="recipeMode"]:checked').value;
  const shown=recipes.filter(([ings,result])=>{
    const search=!q||[...ings,result].join(" ").toLowerCase().includes(q);
    const related=ings.some(x=>owned.has(x)),available=ings.every(x=>owned.has(x));
    return search&&(mode==="all"||mode==="related"&&related||mode==="available"&&available);
  });
  let readyCount=0;
  const rows=shown.map(([ings,result])=>{
    const missing=ings.filter(x=>!owned.has(x)),ready=owned.size&&missing.length===0;
    if(ready)readyCount++;
    const ingredients=element("div","","fusion-cell");
    ings.forEach((name,i)=>{if(i)ingredients.append(element("strong","+","muted"));ingredients.append(badge(name))});
    const row=element("tr","",ready?"ready-row":"");
    row.append(tableCell(ingredients),tableCell(element("strong",result)),tableCell(!owned.size?"Not checked":ready?"Ready":`Missing: ${missing.join(", ")}`,!owned.size?"muted":ready?"ready":"missing"));
    return row;
  });
  $("recipeRows").replaceChildren(...(rows.length?rows:[emptyRow("No matching recipes. Clear the search, select All recipes, or update your owned mutations.",3)]));
  $("recipeStatus").textContent=`${shown.length} of ${recipes.length} recipes${owned.size?` · ${readyCount} craftable`:""}`;
}
$("ownedMutations").addEventListener("change",renderRecipes);$("recipeSearch").addEventListener("input",renderRecipes);$("recipeModes").addEventListener("change",renderRecipes);
$("selectBase").onclick=()=>{document.querySelectorAll('[name="ownedMutation"]').forEach(x=>x.checked=mutations.some(m=>m.name===x.value&&m.base));document.querySelector('[name="recipeMode"][value="available"]').checked=true;renderRecipes()};
$("clearOwned").onclick=()=>{clearChecks("ownedMutation");renderRecipes()};
const tabs=[...document.querySelectorAll(".tab")],validTabs=new Set(tabs.map(tab=>tab.dataset.tab));
tabs.forEach(tab=>{
  tab.id=`tab-${tab.dataset.tab}`;
  tab.setAttribute("role","tab");
  tab.setAttribute("aria-controls",tab.dataset.tab);
  const panel=$(tab.dataset.tab);
  panel.setAttribute("role","tabpanel");
  panel.setAttribute("aria-labelledby",tab.id);
  panel.tabIndex=0;
});
function updateTabUrl(tabId,replace=false){
  try{
    const url=new URL(location.href);
    url.searchParams.set("tab",tabId);
    if(replace)history.replaceState({tab:tabId},"",url);
    else history.pushState({tab:tabId},"",url);
  }catch{
    // Navigation still works if the browser does not permit history updates.
  }
}
function activateTab(tabId,updateUrl=false){
  const selectedTab=validTabs.has(tabId)?tabId:"calculator";
  tabs.forEach(tab=>{
    const active=tab.dataset.tab===selectedTab;
    tab.classList.toggle("active",active);
    tab.setAttribute("aria-selected",String(active));
    tab.tabIndex=active?0:-1;
  });
  document.querySelectorAll(".panel").forEach(panel=>{
    const active=panel.id===selectedTab;
    panel.classList.toggle("active",active);
    panel.hidden=!active;
  });
  if(updateUrl)updateTabUrl(selectedTab);
  return selectedTab;
}
document.querySelector(".tabs").addEventListener("keydown",e=>{
  const current=tabs.indexOf(e.target);
  if(current<0||!["ArrowRight","ArrowLeft","Home","End"].includes(e.key))return;
  e.preventDefault();
  const next=e.key==="Home"?0:e.key==="End"?tabs.length-1:(current+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;
  activateTab(tabs[next].dataset.tab,true);
  tabs[next].focus();
});
document.querySelector(".tabs").addEventListener("click",e=>{const tabButton=e.target.closest(".tab");if(tabButton)activateTab(tabButton.dataset.tab,true)});
window.addEventListener("popstate",()=>activateTab(new URLSearchParams(location.search).get("tab")));
const requestedTab=new URLSearchParams(location.search).get("tab"),initialTab=activateTab(requestedTab);
if(requestedTab!==initialTab)updateTabUrl(initialTab,true);
calculate();calculateTotalIncome();renderMutationList();renderRarities();renderPacks();renderRecipes();renderCombinations();
