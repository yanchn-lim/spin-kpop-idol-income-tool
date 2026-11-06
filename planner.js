const plannerMutations=mutations.filter(m=>m.name!=="Normal / Base"&&m.status==="confirmed"&&Number.isFinite(m.value));
const plannerBaseSources=plannerMutations.filter(m=>m.base).map(m=>m.name);

async function findBestMutationPlan({starting,available,slots,allowRemoval},onProgress=()=>{}){
  if(typeof graphlib==="undefined")throw new Error("The planner could not load. Reload the page and try again.");
  if(!Number.isInteger(slots)||slots<1||slots>4)throw new Error("Choose between one and four mutation slots.");
  if(starting.length>slots)throw new Error("The starting mutations exceed the selected slot limit.");
  if(new Set(starting).size!==starting.length)throw new Error("Each starting mutation must be unique.");
  const sources=[...new Set(available)];
  for(const name of [...starting,...sources]){
    const mutation=mutationByName.get(name);
    if(!mutation||mutation.status!=="confirmed"||!Number.isFinite(mutation.value))throw new Error(`No confirmed multiplier is recorded for ${name}.`);
  }
  const usableRecipes=recipes.filter(([ingredients,result])=>[...ingredients,result].every(name=>plannerMutations.some(m=>m.name===name)));
  const graph=new graphlib.Graph({directed:true});
  const initial=[...starting].sort(),start=JSON.stringify(initial),pending=[start];
  const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
  graph.setNode(start,initial);
  for(let i=0;i<pending.length;i++){
    const from=pending[i],current=graph.node(from);
    const addTransition=(next,action)=>{
      const key=JSON.stringify(next.sort());
      if(!graph.hasNode(key)){
        graph.setNode(key,next);
        pending.push(key);
      }
      graph.setEdge(from,key,action);
    };
    if(current.length<slots){
      for(const name of sources){
        if(!current.includes(name))addTransition([...current,name],{type:"apply",name});
      }
    }
    for(const [ingredients,result] of usableRecipes){
      if(current.includes(result)||!ingredients.every(name=>current.includes(name)))continue;
      const next=current.filter(name=>!ingredients.includes(name));
      next.push(result);
      if(next.length<=slots)addTransition(next,{type:"fuse",ingredients,result});
    }
    if(allowRemoval){
      for(const name of current)addTransition(current.filter(value=>value!==name),{type:"remove",name});
    }
    if(i%128===0){
      onProgress(`Exploring ${graph.nodeCount().toLocaleString()} reachable combinations…`);
      await pause();
    }
  }
  onProgress("Choosing the shortest crafting sequence…");
  await pause();
  const paths=graphlib.alg.dijkstra(graph,start);
  const score=key=>mutationMultiplier(graph.node(key).map(name=>mutationByName.get(name)));
  let best=start,bestMultiplier=score(start);
  for(const key of graph.nodes()){
    const multiplier=score(key);
    if(multiplier>bestMultiplier+1e-10||(Math.abs(multiplier-bestMultiplier)<=1e-10&&paths[key].distance<paths[best].distance)){
      best=key;
      bestMultiplier=multiplier;
    }
  }
  const steps=[];
  for(let key=best;key!==start;){
    const previous=paths[key].predecessor;
    steps.push({action:graph.edge(previous,key),mutations:graph.node(key)});
    key=previous;
  }
  return {initial,mutations:graph.node(best),multiplier:bestMultiplier,startingMultiplier:score(start),steps:steps.reverse(),stateCount:graph.nodeCount(),slots,allowRemoval};
}

function plannerState(names){
  const state=element("div","","chips planner-step-state");
  state.append(...(names.length?names.map(name=>badge(name)):[element("span","No mutations","muted")]));
  return state;
}
function renderMutationPlan(plan){
  $("plannerMultiplier").textContent=`${formatMultiplier(plan.multiplier)}×`;
  $("plannerBest").replaceChildren(plannerState([...plan.mutations].sort((a,b)=>mutationByName.get(b).value-mutationByName.get(a).value)));
  const gain=(plan.multiplier/plan.startingMultiplier-1)*100;
  $("plannerSummary").textContent=`${plan.stateCount.toLocaleString()} reachable combinations · ${plan.steps.length} actions · ${gain.toFixed(1)}% more income than the starting card`;
  const start=element("li",`Start (${plan.initial.length}/${plan.slots} slots).`);
  start.append(plannerState(plan.initial));
  const steps=plan.steps.map(({action,mutations:state})=>{
    const description=action.type==="apply"?`Apply ${action.name}`:action.type==="remove"?`Remove ${action.name}`:`Fuse ${action.ingredients.join(" + ")} → ${action.result}`;
    const step=element("li",`${description} (${state.length}/${plan.slots} slots).`);
    step.append(plannerState(state));
    return step;
  });
  $("plannerSteps").replaceChildren(start,...steps);
  $("plannerStatus").textContent=plan.steps.length?"Best reachable combination under the selected rules. The sequence never exceeds the slot limit.":"The starting card is already best under the selected rules.";
  $("plannerResult").hidden=false;
}
function invalidateMutationPlan(){
  $("plannerResult").hidden=true;
  $("plannerStatus").textContent="Inputs changed. Select Find best combination to update the result.";
}
function setPlannerSources(names){
  const selected=new Set(names);
  document.querySelectorAll('[name="plannerSource"]').forEach(input=>input.checked=selected.has(input.value));
}

$("plannerStarting").replaceChildren(...plannerMutations.map(m=>chip(m.name,"plannerStart")));
$("plannerSources").replaceChildren(...plannerMutations.map(m=>chip(m.name,"plannerSource")));
setPlannerSources(plannerBaseSources);
$("plannerInputs").addEventListener("change",invalidateMutationPlan);
$("plannerUseCard").addEventListener("click",()=>{
  const selected=new Set(checkedValues("calcMutation"));
  document.querySelectorAll('[name="plannerStart"]').forEach(input=>input.checked=selected.has(input.value));
  invalidateMutationPlan();
});
$("plannerClearStart").addEventListener("click",()=>{clearChecks("plannerStart");invalidateMutationPlan()});
$("plannerNormal").addEventListener("click",()=>{setPlannerSources(plannerBaseSources);invalidateMutationPlan()});
$("plannerFestive").addEventListener("click",()=>{setPlannerSources([...plannerBaseSources,"Ghostly","Hallow"]);invalidateMutationPlan()});
$("plannerClearSources").addEventListener("click",()=>{clearChecks("plannerSource");invalidateMutationPlan()});
$("plannerForm").addEventListener("submit",async event=>{
  event.preventDefault();
  $("plannerResult").hidden=true;
  $("plannerInputs").disabled=true;
  $("plannerSolve").disabled=true;
  $("plannerForm").setAttribute("aria-busy","true");
  try{
    const plan=await findBestMutationPlan({
      starting:checkedValues("plannerStart"),available:checkedValues("plannerSource"),
      slots:Number($("plannerSlots").value),allowRemoval:$("plannerRemoval").checked
    },message=>$("plannerStatus").textContent=message);
    renderMutationPlan(plan);
  }catch(error){
    $("plannerStatus").textContent=error.message;
  }finally{
    $("plannerInputs").disabled=false;
    $("plannerSolve").disabled=false;
    $("plannerForm").removeAttribute("aria-busy");
  }
});
