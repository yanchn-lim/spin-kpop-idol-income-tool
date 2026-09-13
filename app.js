const $=id=>document.getElementById(id), money=n=>"$"+n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+"/s";
function mutationStyle(name){const [background,color]=mutationColors[name]||["#e5e7eb","#172033"];return `--mutation-bg:${background};--mutation-fg:${color}`}
function chip(name,inputName){return `<label class="chip-label"><input type="checkbox" name="${inputName}" value="${name}"><span class="chip ${colors[name]||""}" style="${mutationStyle(name)}">${name}</span></label>`}

rarities.forEach(([n,v])=>$("rarity").add(new Option(v==null?`${n} — unknown`:`${n} — $${v}/kg`,n)));
$("rarity").value="Infinity";grades.forEach(([n,v])=>$("grade").add(new Option(`${n} — ${v.toFixed(2)}×`,n)));$("grade").value="F";
$("calcMutations").innerHTML=mutations.filter(m=>m.name!=="Normal / Base").map(m=>chip(m.name,"calcMutation")).join("");
$("ownedMutations").innerHTML=[...new Set(recipes.flatMap(r=>[...r[0],r[1]]))].map(n=>chip(n,"ownedMutation")).join("");

function calculate(){
  const weight=Number($("weight").value), rarity=rarities.find(r=>r[0]===$("rarity").value), grade=grades.find(g=>g[0]===$("grade").value);
  const names=[...document.querySelectorAll('[name="calcMutation"]:checked')].map(x=>x.value);
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
$("calcMutations").addEventListener("change",calculate);$("clearCalc").onclick=()=>{document.querySelectorAll('[name="calcMutation"]').forEach(x=>x.checked=false);calculate()};

function renderMutationList(){
  const q=$("mutationSearch").value.trim().toLowerCase(),mode=document.querySelector('[name="mutationMode"]:checked').value;
  const list=mutations.filter(m=>(mode==="all"||m.status===mode)&&(!q||m.name.toLowerCase().includes(q)||(m.value!=null&&String(m.value).includes(q))));
  $("mutationList").innerHTML=list.map(m=>`<article class="mutation-card ${m.value==null?"unknown":""}" style="${mutationStyle(m.name)}"><strong>${m.name}</strong><span class="mult">${m.value==null?"Unknown":m.value.toFixed(2)+"×"}</span><div class="tag">${m.base?"Base mutation · ":""}${m.status==="confirmed"?"Confirmed":"Needs testing"}</div></article>`).join("");
  $("mutationStatus").textContent=`Showing ${list.length} of ${mutations.length} mutations`;
}
$("mutationSearch").addEventListener("input",renderMutationList);$("mutationModes").addEventListener("change",renderMutationList);

function renderRarities(){
  const q=$("raritySearch").value.trim().toLowerCase();
  const list=rarities.filter(([name,rate])=>!q||name.toLowerCase().includes(q)||(rate!=null&&String(rate).includes(q)));
  $("rarityRows").innerHTML=list.map(([name,rate])=>{
    const observed=observedWeights[name];
    const range=observed?(observed[0]===observed[1]?`${observed[0].toFixed(2)} kg`:`${observed[0].toFixed(2)}–${observed[1].toFixed(2)} kg`):"—";
    return `<tr><td><strong>${name}</strong></td><td>${rate==null?"—":`<strong>$${rate.toFixed(2)}/kg</strong>`}</td><td>${range}</td><td>${observed?observed[2]:"—"}</td><td class="${rate==null?"missing":"ready"}">${rate==null?"Needed":"Confirmed"}</td></tr>`;
  }).join("");
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
  $("packResults").innerHTML=list.length?list.map(card=>`<article class="pack-result"><strong>${card.idol}</strong><div class="pack-meta">${card.group} · ${card.rarity}</div><div class="pack-name ${packClass(card.pack)}">${card.pack} pack</div></article>`).join(""):"<p class=\"muted\">No matching idols or groups.</p>";
  $("packStatus").textContent=`Showing ${list.length} of ${packPool.length} cards`;
}
$("packSearch").addEventListener("input",renderPacks);
const packClassNames={Common:"common",Uncommon:"uncommon",Rare:"rare",Epic:"epic",Legendary:"legendary",Mythic:"mythic",Ethereal:"ethereal",Secret:"secret",Oblivion:"oblivion",Eternal:"eternal",Transcendent:"transcendent",Infinity:"infinity",Apex:"apex",Fansign:"fansign",Vacation:"vacation",Concept:"concept",Performance:"performance",Iconic:"iconic",Fashion:"fashion",Harmony:"harmony",Munch:"munch",Mirror:"mirror",Cutesy:"cutesy",Pets:"pets",Formal:"formal",Plushie:"plushie",Event:"event"};
function packClass(name){return packClassNames[name]||""}

function badge(n){return `<span class="chip ${colors[n]||""}" style="${mutationStyle(n)}">${n}</span>`}
function renderRecipes(){
  const owned=new Set([...document.querySelectorAll('[name="ownedMutation"]:checked')].map(x=>x.value));
  const q=$("recipeSearch").value.trim().toLowerCase(),mode=document.querySelector('[name="recipeMode"]:checked').value;
  const shown=recipes.filter(([ings,result])=>{
    const search=!q||[...ings,result].join(" ").toLowerCase().includes(q);
    const related=ings.some(x=>owned.has(x)),available=ings.every(x=>owned.has(x));
    return search&&(mode==="all"||mode==="related"&&related||mode==="available"&&available);
  });
  let readyCount=0;
  $("recipeRows").innerHTML=shown.map(([ings,result])=>{
    const missing=ings.filter(x=>!owned.has(x)),ready=owned.size&&missing.length===0;
    if(ready)readyCount++;
    const availability=!owned.size?'<span class="muted">Not checked</span>':ready?'<span class="ready">Ready</span>':`<span class="missing">Missing: ${missing.join(", ")}</span>`;
    return `<tr class="${ready?"ready-row":""}"><td><div class="fusion-cell">${ings.map(badge).join(' <strong class="muted">+</strong> ')}</div></td><td><strong>${result}</strong></td><td>${availability}</td></tr>`;
  }).join("");
  $("recipeStatus").textContent=`${shown.length} of ${recipes.length} recipes${owned.size?` · ${readyCount} craftable`:""}`;
}
$("ownedMutations").addEventListener("change",renderRecipes);$("recipeSearch").addEventListener("input",renderRecipes);$("recipeModes").addEventListener("change",renderRecipes);
$("selectBase").onclick=()=>{document.querySelectorAll('[name="ownedMutation"]').forEach(x=>x.checked=mutations.some(m=>m.name===x.value&&m.base));document.querySelector('[name="recipeMode"][value="available"]').checked=true;renderRecipes()};
$("clearOwned").onclick=()=>{document.querySelectorAll('[name="ownedMutation"]').forEach(x=>x.checked=false);renderRecipes()};
const tabs=[...document.querySelectorAll(".tab")],validTabs=new Set(tabs.map(tab=>tab.dataset.tab));
function activateTab(tabId,updateUrl=false){
  const selectedTab=validTabs.has(tabId)?tabId:"calculator";
  tabs.forEach(tab=>{const active=tab.dataset.tab===selectedTab;tab.classList.toggle("active",active);tab.setAttribute("aria-selected",String(active))});
  document.querySelectorAll(".panel").forEach(panel=>panel.classList.toggle("active",panel.id===selectedTab));
  if(updateUrl){const url=new URL(location.href);url.searchParams.set("tab",selectedTab);history.pushState({tab:selectedTab},"",url)}
  return selectedTab;
}
document.querySelector(".tabs").addEventListener("click",e=>{const tabButton=e.target.closest(".tab");if(tabButton)activateTab(tabButton.dataset.tab,true)});
window.addEventListener("popstate",()=>activateTab(new URLSearchParams(location.search).get("tab")));
const requestedTab=new URLSearchParams(location.search).get("tab"),initialTab=activateTab(requestedTab);
if(requestedTab!==initialTab){const url=new URL(location.href);url.searchParams.set("tab",initialTab);history.replaceState({tab:initialTab},"",url)}
calculate();renderMutationList();renderRarities();renderPacks();renderRecipes();
