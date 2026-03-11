import { byId, create, safeText } from "../shared/dom.js";

function axisLabel(axis) {
  if (axis === "governance") return "Governance";
  if (axis === "memory") return "Memory";
  if (axis === "runtime") return "Runtime";
  if (axis === "interface") return "Interface";
  return "Structure";
}

function dayDiff(olderDate, newerDate) {
  var older = new Date(olderDate);
  var newer = new Date(newerDate);
  if (Number.isNaN(older.getTime()) || Number.isNaN(newer.getTime())) return null;
  var ms = newer.getTime() - older.getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function classifyFocus(entry, axis) {
  var files = Array.isArray(entry.files_changed) ? entry.files_changed : [];
  var joined = files.join("|").toLowerCase();
  var summary = String(entry.summary || "").toLowerCase();

  var visibleFileSignal = joined.includes(".html") ||
    joined.includes("style.css") ||
    joined.includes("src/views/") ||
    joined.includes("site.js");
  var visibleTextSignal = summary.includes("observer") ||
    summary.includes("interface") ||
    summary.includes("legibility") ||
    summary.includes("navigation") ||
    summary.includes("home") ||
    summary.includes("public");

  if (axis === "interface" || visibleFileSignal || visibleTextSignal) {
    return "external";
  }
  return "internal";
}

function deriveImpact(entry, focus) {
  var files = Array.isArray(entry.files_changed) ? entry.files_changed : [];
  var joined = files.join("|").toLowerCase();

  if (focus === "external") {
    if (joined.includes("index.html") || joined.includes("history.html")) {
      return "Observer path changed: route content or structure became more legible.";
    }
    if (joined.includes("src/views/") || joined.includes("site.js")) {
      return "Observer behavior changed: rendered output now communicates trajectory differently.";
    }
    if (joined.includes("style.css")) {
      return "Observer reading quality changed via presentation and information hierarchy.";
    }
    return "Observer-facing behavior shifted in this run.";
  }

  if (joined.includes("autonomy") || joined.includes("constitution")) {
    return "Governance logic changed; observer-facing impact is deferred to a follow-up run.";
  }
  if (joined.includes("program-engine") || joined.includes("policy-engine") || joined.includes("trajectory-lab")) {
    return "Runtime planning logic changed; external behavior depends on subsequent interface projection.";
  }
  if (joined.includes("log.json") || joined.includes("memory-ledger")) {
    return "Memory semantics changed; this mainly improves continuity and future explainability.";
  }
  return "Internal substrate changed; observer-facing effect is indirect.";
}

function renderLedgerRecap(model) {
  var summary = byId("history-ledger-summary");
  var events = byId("history-events");
  if (!summary || !events) return;

  safeText(summary, "Schema " + model.ledgerSchema + " using " + model.ledgerSemantics + " semantics. " + model.eventSummary.count + " events tracked.");

  events.innerHTML = "";
  model.eventSummary.recent.slice(0, 4).forEach(function (event) {
    var item = create("li", "");
    item.textContent = event.date + " · " + event.type + " · " + event.axis;
    events.appendChild(item);
  });
}

export function renderHistory(model) {
  var root = byId("history-list");
  var summary = byId("history-impact-summary");
  var filterInput = byId("history-focus-filter");
  if (!root) return;

  renderLedgerRecap(model);

  var axisByDateTitle = model.timeline.reduce(function (acc, node) {
    acc[node.date + "|" + node.title] = node.axis;
    return acc;
  }, {});

  var prepared = model.descEntries.map(function (entry) {
    var axis = axisByDateTitle[(entry.date || "") + "|" + (entry.title || "Untitled")] || "structure";
    var focus = classifyFocus(entry, axis);
    return {
      entry: entry,
      axis: axis,
      focus: focus,
      impact: deriveImpact(entry, focus)
    };
  });

  function refresh() {
    var filter = filterInput ? filterInput.value : "all";
    var filtered = prepared.filter(function (item) {
      return filter === "all" || item.focus === filter;
    });

    root.innerHTML = "";
    if (!filtered.length) {
      root.appendChild(create("p", "muted", "No runs match this filter."));
      if (summary) {
        safeText(summary, "Filter returned no runs.");
      }
      return;
    }

    var externalCount = prepared.filter(function (item) { return item.focus === "external"; }).length;
    var internalCount = prepared.length - externalCount;
    if (summary) {
      safeText(
        summary,
        "Showing " + filtered.length + " of " + prepared.length + " runs. External: " + externalCount +
        ". Internal: " + internalCount + "."
      );
    }

    filtered.forEach(function (item, index) {
      var entry = item.entry;
      var article = create("article", "entry history-entry history-" + item.focus);
      article.appendChild(create("h3", "", entry.title || "Untitled"));

      var meta = create("p", "date");
      var gap = null;
      if (index < filtered.length - 1) {
        gap = dayDiff(filtered[index + 1].entry.date, entry.date);
      }
      meta.textContent = (entry.date || "Unknown date") +
        " · " + axisLabel(item.axis) +
        " · " + item.focus +
        (gap !== null ? " · +" + gap + " day(s) since previous shown run" : "");
      article.appendChild(meta);

      article.appendChild(create("p", "muted", item.impact));
      article.appendChild(create("p", "", entry.summary || ""));
      article.appendChild(create("p", "axis axis-" + item.axis, "Axis: " + axisLabel(item.axis)));

      if (Array.isArray(entry.files_changed) && entry.files_changed.length) {
        var details = create("details", "history-trace");
        details.appendChild(create("summary", "", "Trace: " + entry.files_changed.length + " file(s) changed"));
        var ul = create("ul", "files");
        entry.files_changed.forEach(function (file) {
          ul.appendChild(create("li", "", file));
        });
        details.appendChild(ul);
        article.appendChild(details);
      }

      root.appendChild(article);
    });
  }

  if (filterInput) {
    filterInput.addEventListener("change", refresh);
  }

  refresh();
}
