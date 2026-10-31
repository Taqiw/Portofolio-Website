(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var links = Array.prototype.slice.call(document.querySelectorAll("[data-nav-link]"));
  var seen = {};
  var sections = links
    .map(function (link) {
      var id = link.getAttribute("href");
      if (!id || id.length < 2 || seen[id]) return null;
      seen[id] = true;
      return document.querySelector(id);
    })
    .filter(Boolean);

  if (sections.length === 0) {
    return;
  }

  function setActive(id) {
    links.forEach(function (link) {
      if (id && link.getAttribute("href") === "#" + id) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function currentSection() {
    var headerHeight = 5 * 16;
    var probe = window.scrollY + headerHeight + 24;
    var found = null;

    for (var i = 0; i < sections.length; i += 1) {
      if (sections[i].offsetTop <= probe) {
        found = sections[i];
      }
    }

    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 2) {
      found = sections[sections.length - 1];
    }

    return found;
  }

  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      var active = currentSection();
      setActive(active ? active.id : null);
      ticking = false;
    });
  }

  function onHashChange() {
    var id = window.location.hash.replace("#", "");
    if (id) {
      setActive(id);
    } else {
      setActive(null);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("hashchange", onHashChange);

  document.addEventListener("click", function (event) {
    var anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;

    var id = anchor.getAttribute("href").replace("#", "");
    if (!id) return;

    var target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();

    var headerHeight =
      parseInt(
        window.getComputedStyle(document.documentElement).getPropertyValue("--header-height"),
        10
      ) || 80;

    var top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;

    window.scrollTo({
      top: top < 0 ? 0 : top,
      behavior: prefersReduced.matches ? "auto" : "smooth"
    });

    setActive(id);

    if (window.history && typeof window.history.pushState === "function") {
      window.history.pushState(null, "", "#" + id);
    }
  });

  onHashChange();
  onScroll();
})();
