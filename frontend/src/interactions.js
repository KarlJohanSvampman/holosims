function findAnchorByName(prop, name) {
  return prop.anchors.find(a => a.name === name);
}

function getAnchorWorldPosition(anchor) {
  const pos = new THREE.Vector3();
  anchor.object.getWorldPosition(pos);
  return pos;
}

function playPropAnimation(prop, anchor, phase) {
  const anim = anchor.interaction.animations;

  let clipName = null;

  if (phase === "start") clipName = anim.start;
  if (phase === "loop") clipName = anim.loop;
  if (phase === "stop") clipName = anim.stop;

  if (!clipName) return;

  const action = prop.actions[clipName.toLowerCase()];
  if (!action) return;

  Object.values(prop.actions).forEach(a => {
    if (a !== action) a.fadeOut(0.2);
  });

  action.reset().fadeIn(0.2).play();
}