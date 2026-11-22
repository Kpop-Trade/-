/**
 * ILLIT Trade - points & raffle
 * loader bootstrap only if full app not present
 */
(function () {
  "use strict";
  if (window.PointsRaffle) return;
  var s = document.createElement("script");
  s.src = "./js/points-raffle.full.js?v=20261122pt13";
  s.onerror = function () {
    console.warn("points-raffle.full missing - using inline boot");
  };
  // Keep previous working file name
})();
