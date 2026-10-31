(function () {
  "use strict";

  var toggle = document.querySelector("[data-nav-toggle]");
  var drawer = document.querySelector("[data-nav-drawer]");
  var scrim = document.querySelector("[data-nav-scrim]");

  if (!toggle || !drawer) {
    return;
  }

  var mq = window.matchMedia("(min-width: 768px)");

  function open() {
    drawer.hidden = false;
    if (scrim) {
      scrim.hidden = false;
      window.requestAnimationFrame(function () {
        scrim.classList.add("is-visible");
      });
    }
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("is-locked");
  }

  function close() {
    if (scrim) {
      scrim.classList.remove("is-visible");
      window.setTimeout(function () {
        if (!isOpen()) {
          scrim.hidden = true;
        }
      }, 300);
    }
    drawer.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-locked");
  }

  function isOpen() {
    return toggle.getAttribute("aria-expanded") === "true";
  }

  toggle.addEventListener("click", function () {
    if (isOpen()) {
      close();
    } else {
      open();
    }
  });

  drawer.addEventListener("click", function (event) {
    if (event.target.closest("a[href^='#']")) {
      close();
    }
  });

  if (scrim) {
    scrim.addEventListener("click", close);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen()) {
      close();
      toggle.focus();
    }
  });

  function onBreakpointChange(event) {
    if (event.matches) {
      close();
    }
  }

  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onBreakpointChange);
  } else if (typeof mq.addListener === "function") {
    mq.addListener(onBreakpointChange);
  }
})();
