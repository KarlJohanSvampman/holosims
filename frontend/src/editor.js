let world = null;
let selectedTool = "tile";
let selectedType = null;

async function loadWorld() {
  const res = await fetch("http://localhost:8000/api/editor/world?sim_id=default");
  world = await res.json();
}

function placeTile(x, y, type) {
  world.tiles = world.tiles || {};
  world.tiles[`${x},${y}`] = { type };
}

function placeProp(x, y, type) {
  world.props.push({
    id: "prop_" + Date.now(),
    type,
    x,
    y
  });
}

async function saveWorld() {
  await fetch("/api/editor/world?sim_id=default", {
    method: "POST",
    body: JSON.stringify(world)
  });
}