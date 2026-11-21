/**
 * Myトレカ バインダーUI — ホログラム・シマー演出（軽量）
 */
(function () {
  "use strict";

  function bindBinderHolo() {
    const card = document.getElementById("binder-holo-card");
    if (!card) return;
    const sheen = card.querySelector(".binder-holo-sheen");
    if (!sheen) return;

    function setFromPoint(clientX, clientY) {
      const r = card.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const nx = (clientX - r.left) / r.width;
      const ny = (clientY - r.top) / r.height;
      const x = (nx - 0.5) * 56;
      const y = (ny - 0.5) * 40;
      card.style.setProperty("--holo-x", x.toFixed(1) + "%");
      card.style.setProperty("--holo-y", y.toFixed(1) + "%");
    }

    function onMove(e) {
      const t = e.touches && e.touches[0] ? e.touches[0] : e;
      if (!t) return;
      setFromPoint(t.clientX, t.clientY);
    }

    card.onpointermove = onMove;
    card.ontouchmove = onMove;
    card.onpointerenter = onMove;
    setFromPoint(
      card.getBoundingClientRect().left + card.getBoundingClientRect().width * 0.35,
      card.getBoundingClientRect().top + card.getBoundingClientRect().height * 0.3
    );
  }

  window.bindBinderHolo = bindBinderHolo;
})();
