/** Temporary beta-only console helpers. Preview never writes achievement data. */
window.kaasiMilestonesDebug = Object.freeze({
  list:()=>Milestones.definitions.map(({id,name})=>({id,name})),
  check:(count=500)=>{
    if(!Number.isInteger(count)||count<0||count>10000)throw new Error('Use a count from 0 to 10000');
    const sample={transactions:Array.from({length:count},()=>({type:'expense',date:'2026-01-01'}))};
    return Milestones.evaluate(sample);
  },
  preview:(id='first_record')=>showNotification('Milestone unlocked: '+(Milestones.definitions.find(d=>d.id===id)?.name||'Preview'),'achievement',5000),
  async reset(id) {
    if(!Milestones.known.has(id))throw new Error('Unknown milestone ID');
    delete state.achievements?.[id];
    Milestones.forget(id);
    // Persist directly through the normal save boundary, suppressing re-evaluation once.
    await saveData(state,{skipMilestones:true});
  }
});
