export function generateNavigationGrid(floorplan){

  const blocked = new Set();

  for(const tile of floorplan.tiles){

    if(tile.type === 'wall'){

      blocked.add(`${tile.x},${tile.y}`);
    }
  }

  for(const door of floorplan.doors || []){

    blocked.delete(`${door.x},${door.y}`);
  }

  const walkable = [];

  for(let x=0;x<floorplan.width;x++){
    for(let y=0;y<floorplan.height;y++){

      const key = `${x},${y}`;

      if(!blocked.has(key)){

        walkable.push({x,y});
      }
    }
  }

  floorplan.navigation = {
    blocked: [...blocked],
    walkable
  };

  return floorplan.navigation;
}