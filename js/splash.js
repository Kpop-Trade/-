    (function() {
      var splash = document.getElementById("app-splash-screen");
      if (!splash) return;
      var dismissed = false;
      var fadeOut = function() {
        if (dismissed) return;
        dismissed = true;
        splash.classList.add("is-hiding");
        window.setTimeout(function() {
          splash.style.display = "none";
        }, 400);
      };
      window.setTimeout(fadeOut, 900);
      window.setTimeout(function() {
        fadeOut();
        splash.style.display = "none";
      }, 1500);
    })();
  
