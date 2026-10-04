const $=id=>document.getElementById(id), money=n=>"$"+n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+"/s";
function element(tag,text="",className=""){
  const node=document.createElement(tag);
  node.textContent=String(text);
  node.className=className;
  return node;
}
function badge(name){
  const node=element("span",name,"chip");
  const background=mutationColors[name]?.[0];
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

rarities.forEach(([n,v])=>$("rarity").add(new Option(v==null?`${n} — unknown`:`${n} — $${v}/kg`,n)));
$("rarity").value="Infinity";grades.forEach(([n,v])=>$("grade").add(new Option(`${n} — ${v.toFixed(2)}×`,n)));$("grade").value="F";
$("calcMutations").replaceChildren(...mutations.filter(m=>m.name!=="Normal / Base").map(m=>chip(m.name,"calcMutation")));
$("ownedMutations").replaceChildren(...[...new Set(recipes.flatMap(r=>[...r[0],r[1]]))].map(n=>chip(n,"ownedMutation")));

function calculate(){
  const weight=Number($("weight").value), rarity=rarities.find(r=>r[0]===$("rarity").value), grade=grades.find(g=>g[0]===$("grade").value);
  const names=[...document.querySelectorAll('[name="calcMutation"]:checked')].map(x=>x.value);
  $("calcSelection").textContent=`${names.length} mutations selected`;
  $("clearCalc").disabled=names.length===0;
  $("weight").setAttribute("aria-invalid",String(!Number.isFinite(weight)||weight<=0));
  $("rarity").setAttribute("aria-invalid",String(rarity[1]==null));
  const selected=names.map(n=>mutations.find(m=>m.name===n)).sort((a,b)=>(b.value??-1)-(a.value??-1));
  const unknown=selected.filter(m=>m.value==null);
  if(!Number.isFinite(weight)||weight<=0){showCalculatorError("Enter a weight greater than zero.");return}
  if(rarity[1]==null){showCalculatorError(`${rarity[0]} does not have a confirmed $/kg rate yet.`);return}
  if(unknown.length){showCalculatorError(`Needs testing: ${unknown.map(item=>item.name).join(", ")}`);return}
  const combined=selected.length?selected.reduce((t,m,i)=>i? t+(m.value-1)/(2**i):m.value,0):1;
  const final=weight*rarity[1]*grade[1]*combined;
  $("finalMoney").textContent=money(final);
  $("breakdown").textContent=`${weight} kg × $${rarity[1]}/kg × ${grade[1].toFixed(2)} grade × ${combined.toFixed(5)} mutations`;
}
function showCalculatorError(message){$("finalMoney").textContent="Cannot calculate";$("breakdown").textContent=message}
["weight","rarity","grade"].forEach(id=>$(id).addEventListener("input",calculate));
$("calcMutations").addEventListener("change",calculate);
$("clearCalc").addEventListener("click",()=>{
  document.querySelectorAll('[name="calcMutation"]').forEach(input=>{
    input.checked=false;
  });
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
  const vipMultiplier=$("hasVip").checked?1.10:1;
  $("onlineMoney").textContent=money(base*(1+(rebirth+friend)/100)*vipMultiplier);
  $("offlineMoney").textContent=money(base*0.5);
}
["baseIncome","rebirthBoost","friendBoost"].forEach(id=>$(id).addEventListener("input",calculateTotalIncome));
$("hasVip").addEventListener("change",calculateTotalIncome);

function renderMutationList(){
  const q=$("mutationSearch").value.trim().toLowerCase(),mode=document.querySelector('[name="mutationMode"]:checked').value;
  const list=mutations.filter(m=>(mode==="all"||m.status===mode)&&(!q||m.name.toLowerCase().includes(q)||(m.value!=null&&String(m.value).includes(q))));
  const cards=list.map(m=>{
    const card=element("article","","mutation-card");
    const background=mutationColors[m.name]?.[0];
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
  const list=rarities.filter(([name,rate])=>!q||name.toLowerCase().includes(q)||(rate!=null&&String(rate).includes(q)));
  const rows=list.map(([name,rate])=>{
    const observed=observedWeights[name];
    const range=observed?(observed[0]===observed[1]?`${observed[0].toFixed(2)} kg`:`${observed[0].toFixed(2)}–${observed[1].toFixed(2)} kg`):"—";
    const row=element("tr");
    row.append(tableCell(element("strong",name)),tableCell(rate==null?"—":element("strong",`$${rate.toFixed(2)}/kg`)),tableCell(range),tableCell(String(observed?observed[2]:"—")),tableCell(rate==null?"Needed":"Confirmed",rate==null?"missing":"ready"));
    return row;
  });
  $("rarityRows").replaceChildren(...(rows.length?rows:[emptyRow("No matching rarities. Clear the search to show all rates.",5)]));
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
function fuzzyMatch(value,query){
  const normalize=text=>text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g," ").trim();
  const target=normalize(value),needle=normalize(query);
  if(!needle||target.includes(needle))return true;
  const targetWords=target.split(" "),queryWords=needle.split(" ");
  return queryWords.every(word=>word.length>=4&&targetWords.some(targetWord=>editDistance(word,targetWord)<=Math.max(1,Math.floor(word.length*.3))||isAdjacentSwap(word,targetWord)));
}
function renderPacks(){
  const q=$("packSearch").value.trim();
  const list=packPool.filter(card=>!q||[card.idol,card.group,card.pack,card.rarity].some(value=>fuzzyMatch(value,q)));
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

function renderRecipes(){
  const owned=new Set([...document.querySelectorAll('[name="ownedMutation"]:checked')].map(x=>x.value));
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
$("clearOwned").onclick=()=>{document.querySelectorAll('[name="ownedMutation"]').forEach(x=>x.checked=false);renderRecipes()};
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
calculate();calculateTotalIncome();renderMutationList();renderRarities();renderPacks();renderRecipes();
