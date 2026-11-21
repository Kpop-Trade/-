(function(){
  function updateGllitTicker() {
    const schedEl = document.getElementById('gllit-hub-schedule');
    const taskEl = document.getElementById('gllit-hub-tasks');
    const track = document.getElementById('gllit-ticker-track');
    if (!track) return;
    const parts = [];
    if (taskEl && taskEl.innerText.trim()) {
      parts.push('🔔 ' + taskEl.innerText.replace(/\s+/g, ' ').trim());
    }
    if (schedEl && schedEl.innerText.trim()) {
      parts.push('📅 ' + schedEl.innerText.replace(/\s+/g, ' ').trim());
    }
    const text = parts.length ? parts.join('　／　') : '📅 今日の予定・スケジュールをタップで確認';
    track.innerHTML = '<span class="pr-10">' + text + '</span><span class="pr-10">' + text + '</span>';
    const dur = Math.max(14, Math.min(45, Math.round(text.length * 0.35)));
    track.style.animationDuration = dur + 's';
  }
  const obs = new MutationObserver(updateGllitTicker);
  window.addEventListener('DOMContentLoaded', function() {
    const sEl = document.getElementById('gllit-hub-schedule');
    const tEl = document.getElementById('gllit-hub-tasks');
    if (sEl) obs.observe(sEl, { childList: true, subtree: true, characterData: true });
    if (tEl) obs.observe(tEl, { childList: true, subtree: true, characterData: true });
    updateGllitTicker();
  });
  setTimeout(updateGllitTicker, 1500);
})();
