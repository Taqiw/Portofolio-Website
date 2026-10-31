(function () {
  "use strict";

  var items = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  if (items.length === 0) {
    return;
  }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (reduced.matches || typeof window.IntersectionObserver !== "function") {
    items.forEach(function (item) {
      item.classList.add("is-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
  );

  items.forEach(function (item) {
    observer.observe(item);
  });
})();
