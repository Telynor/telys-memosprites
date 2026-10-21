const HSR='telys-star-rail-ultimates';
function api(){const value=game.modules.get(HSR)?.api?.summoning;if(!value?.placementContext||!value?.canPlaceSummon)throw Error('Update Tely’s Star Rail Ultimates to preview.19 or later for safe memosprite placement.');return value;}
export function adjacentPlacements(scene,caster,creature,ignoredTokens=[]){
  const rules=api(),context=rules.placementContext(scene,caster,ignoredTokens),width=Math.max(.1,Number(creature.width)||1),height=Math.max(.1,Number(creature.height)||1);
  const start=context.offsetFor({x:context.casterRect.x-width*context.gx,y:context.casterRect.y-height*context.gy}),end=context.offsetFor({x:context.casterRect.right,y:context.casterRect.bottom});
  const radius=Math.hypot(width*context.gx,height*context.gy)/context.gx*context.distance+.01,positions=[];
  for(let i=start.i;i<=end.i;i++)for(let j=start.j;j<=end.j;j++){
    const point=context.pointFor(i,j);
    if(rules.canPlaceSummon(context,{width,height},point,radius))positions.push({x:point.x,y:point.y,width,height});
  }
  return positions;
}
export function validateAdjacentPlacement(scene,caster,creature,position,ignoredTokens=[]){
  if(!position||!adjacentPlacements(scene,caster,creature,ignoredTokens).some(point=>point.x===position.x&&point.y===position.y))throw Error('Cannot Fit: the full memosprite footprint must fit beside the summoner without overlapping tokens or crossing a lighting barrier.');
}
