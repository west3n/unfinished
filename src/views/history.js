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

function toFileList(entry) {
  return Array.isArray(entry.files_changed) ? entry.files_changed : [];
}

function toFileSet(entry) {
  return toFileList(entry).reduce(function (acc, file) {
    acc[file] = true;
    return acc;
  }, {});
}

function runOptionLabel(item) {
  var title = item.entry.title || "Untitled";
  if (title.length > 56) {
    title = title.slice(0, 53) + "...";
  }
  return (item.entry.date || "Unknown date") + " · " + title;
}

function compareRank(item) {
  var id = String(item.id || "");
  var parts = id.split("-");
  var rank = Number(parts[1]);
  return Number.isNaN(rank) ? 0 : rank;
}

function orderComparison(itemA, itemB) {
  var dateA = String(itemA.entry.date || "");
  var dateB = String(itemB.entry.date || "");

  if (dateA > dateB) return { newer: itemA, older: itemB };
  if (dateB > dateA) return { newer: itemB, older: itemA };

  return compareRank(itemA) < compareRank(itemB)
    ? { newer: itemA, older: itemB }
    : { newer: itemB, older: itemA };
}

function summarizeDelta(newerItem, olderItem) {
  var newerSet = toFileSet(newerItem.entry);
  var olderSet = toFileSet(olderItem.entry);

  var newerFiles = Object.keys(newerSet);
  var olderFiles = Object.keys(olderSet);

  var added = newerFiles.filter(function (file) {
    return !olderSet[file];
  });
  var removed = olderFiles.filter(function (file) {
    return !newerSet[file];
  });
  var shared = newerFiles.filter(function (file) {
    return olderSet[file];
  });

  var totalDistinct = added.length + removed.length + shared.length;
  var noveltyRatio = totalDistinct ? (added.length + removed.length) / totalDistinct : 0;

  var mode = "incremental refinement";
  if (!shared.length && (added.length || removed.length)) {
    mode = "hard pivot";
  } else if (noveltyRatio >= 0.7) {
    mode = "major branch shift";
  } else if (noveltyRatio >= 0.4) {
    mode = "mixed refactor";
  }

  if (newerItem.focus !== olderItem.focus) {
    mode += " with focus shift to " + newerItem.focus;
  } else {
    mode += " inside " + newerItem.focus + " focus";
  }

  if (newerItem.axis !== olderItem.axis) {
    mode += " (" + axisLabel(olderItem.axis) + " to " + axisLabel(newerItem.axis) + ")";
  }

  return {
    added: added.sort(),
    removed: removed.sort(),
    shared: shared.sort(),
    noveltyRatio: noveltyRatio,
    mode: mode
  };
}

function renderFileBucket(title, files, emptyText, className) {
  var bucket = create("section", "history-compare-bucket " + className);
  bucket.appendChild(create("h4", "", title + " (" + files.length + ")"));

  if (!files.length) {
    bucket.appendChild(create("p", "muted", emptyText));
    return bucket;
  }

  var list = create("ul", "files");
  files.forEach(function (file) {
    list.appendChild(create("li", "", file));
  });
  bucket.appendChild(list);
  return bucket;
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
  var compareA = byId("history-compare-newer");
  var compareB = byId("history-compare-older");
  var compareRoot = byId("history-compare");
  if (!root) return;

  renderLedgerRecap(model);

  var axisByDateTitle = model.timeline.reduce(function (acc, node) {
    acc[node.date + "|" + node.title] = node.axis;
    return acc;
  }, {});

  var prepared = model.descEntries.map(function (entry, index) {
    var axis = axisByDateTitle[(entry.date || "") + "|" + (entry.title || "Untitled")] || "structure";
    var focus = classifyFocus(entry, axis);
    return {
      id: "run-" + index,
      entry: entry,
      axis: axis,
      focus: focus,
      impact: deriveImpact(entry, focus)
    };
  });

  var compareLookup = prepared.reduce(function (acc, item) {
    acc[item.id] = item;
    return acc;
  }, {});

  function refreshComparison() {
    if (!compareRoot || !compareA || !compareB) return;

    compareRoot.innerHTML = "";
    if (prepared.length < 2) {
      compareRoot.appendChild(create("p", "muted", "Need at least two runs to compare."));
      return;
    }

    var itemA = compareLookup[compareA.value];
    var itemB = compareLookup[compareB.value];
    if (!itemA || !itemB) {
      compareRoot.appendChild(create("p", "muted", "Pick two runs to load the comparison."));
      return;
    }
    if (itemA.id === itemB.id) {
      compareRoot.appendChild(create("p", "muted", "Select two different runs."));
      return;
    }

    var ordered = orderComparison(itemA, itemB);
    var newer = ordered.newer;
    var older = ordered.older;
    var gap = dayDiff(older.entry.date, newer.entry.date);
    var delta = summarizeDelta(newer, older);

    compareRoot.appendChild(create(
      "p",
      "",
      "A/B span: " + (older.entry.date || "Unknown") + " to " + (newer.entry.date || "Unknown") +
      (gap !== null ? " (" + gap + " day gap)" : "")
    ));
    compareRoot.appendChild(create(
      "p",
      "muted",
      "Newer run: " + (newer.entry.title || "Untitled") + " · Older run: " + (older.entry.title || "Untitled")
    ));

    var stats = create("ul", "history-compare-stats");
    stats.appendChild(create("li", "", "Shared files: " + delta.shared.length));
    stats.appendChild(create("li", "", "Added in newer run: " + delta.added.length));
    stats.appendChild(create("li", "", "Removed since older run: " + delta.removed.length));
    stats.appendChild(create("li", "", "File-level novelty: " + Math.round(delta.noveltyRatio * 100) + "%"));
    compareRoot.appendChild(stats);
    compareRoot.appendChild(create("p", "history-compare-mode", "Trajectory classification: " + delta.mode + "."));

    var buckets = create("div", "history-compare-buckets");
    buckets.appendChild(renderFileBucket("Added", delta.added, "No new files relative to the older run.", "history-compare-added"));
    buckets.appendChild(renderFileBucket("Removed", delta.removed, "No files were dropped relative to the older run.", "history-compare-removed"));
    buckets.appendChild(renderFileBucket("Shared", delta.shared, "No overlap between file sets.", "history-compare-shared"));
    compareRoot.appendChild(buckets);
  }

  function seedComparisonControls() {
    if (!compareA || !compareB) return;

    compareA.innerHTML = "";
    compareB.innerHTML = "";
    prepared.forEach(function (item) {
      var optionA = create("option", "", runOptionLabel(item));
      optionA.value = item.id;
      compareA.appendChild(optionA);

      var optionB = create("option", "", runOptionLabel(item));
      optionB.value = item.id;
      compareB.appendChild(optionB);
    });

    if (prepared.length) {
      compareA.value = prepared[0].id;
      compareB.value = (prepared[1] || prepared[0]).id;
    }
  }

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

  if (compareA) {
    compareA.addEventListener("change", refreshComparison);
  }
  if (compareB) {
    compareB.addEventListener("change", refreshComparison);
  }

  seedComparisonControls();
  refreshComparison();
  refresh();
}
