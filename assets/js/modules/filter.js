(function () {
  "use strict";

  var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
  var items = Array.prototype.slice.call(document.querySelectorAll("[data-category]"));
  var status = document.getElementById("work-filter-status");

  if (buttons.length === 0 || items.length === 0) {
    return;
  }

  var labels = {
    all: "All Archives",
    saas: "SaaS Platforms",
    ecommerce: "E-Commerce",
    fintech: "Fintech",
    academic: "Academic Systems"
  };

  function apply(filter) {
    var shown = 0;

    items.forEach(function (item) {
      var match = filter === "all" || item.getAttribute("data-category") === filter;
      item.hidden = !match;
      if (match) {
        shown += 1;
      }
    });

    buttons.forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        button.getAttribute("data-filter") === filter ? "true" : "false"
      );
    });

    if (status) {
      var name = labels[filter] || labels.all;
      status.textContent =
        shown === items.length && filter === "all"
          ? "Filter: " + name
          : "Filter: " + name + " (" + shown + ")";
    }
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      apply(button.getAttribute("data-filter"));
    });
  });

  apply("all");
})();
