export function emojiForEmotion(e) {
  return {calm:'🙂',playful:'😄',warm:'😊',awkward:'😬',annoyed:'😒',angry:'😠',furious:'🤬',fearful:'😨',sad:'😢',smug:'😏',curious:'🤔',suspicious:'🧐'}[e] || '🙂';
}
export async function showHousehold(id) {
  const res = await fetch(`/api/household/${id}`);
  const h = await res.json();
  document.getElementById('panelContent').innerHTML = `<h3>${h.name || id}</h3><pre>${JSON.stringify(h,null,2)}</pre>`;
}
export function updateOverlay(state) {
  const news = (state.news || []).slice(-3).map(n=>`• ${n.headline}`).join('<br>');
  document.getElementById('overlay').innerHTML =
    `<b>Tick:</b> ${state.tick}<br><b>Time:</b> day ${state.calendar?.day}, min ${state.calendar?.minute_of_day}<br><b>Job listings:</b> ${(state.job_listings||[]).filter(j=>j.open).length}<br><b>News</b><br>${news || 'No news yet'}`;
}
