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

function summarizeTouchGaps(matches) {
  if (matches.length < 2) {
    return { average: 0, min: 0, max: 0 };
  }

  var gaps = [];
  for (var i = 1; i < matches.length; i += 1) {
    var gap = dayDiff(matches[i - 1].entry.date, matches[i].entry.date);
    if (gap !== null) gaps.push(gap);
  }
  if (!gaps.length) {
    return { average: 0, min: 0, max: 0 };
  }

  var total = gaps.reduce(function (sum, value) {
    return sum + value;
  }, 0);
  return {
    average: total / gaps.length,
    min: Math.min.apply(Math, gaps),
    max: Math.max.apply(Math, gaps)
  };
}

function coChangeRanking(matches, query) {
  var map = {};
  var queryLower = String(query || "").toLowerCase();

  matches.forEach(function (item) {
    toFileList(item.entry).forEach(function (file) {
      var lower = String(file || "").toLowerCase();
      if (!lower || lower.includes(queryLower)) return;
      map[file] = (map[file] || 0) + 1;
    });
  });

  return Object.keys(map)
    .map(function (file) {
      return { file: file, count: map[file] };
    })
    .sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return a.file.localeCompare(b.file);
    })
    .slice(0, 6);
}

export function renderHistory(model) {
  var root = byId("history-list");
  var summary = byId("history-impact-summary");
  var filterInput = byId("history-focus-filter");
  var compareA = byId("history-compare-newer");
  var compareB = byId("history-compare-older");
  var compareRoot = byId("history-compare");
  var traceQuery = byId("history-trace-query");
  var traceSummary = byId("history-trace-summary");
  var traceResults = byId("history-trace-results");
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

  function seedTraceQuery() {
    if (!traceQuery || traceQuery.value) return;
    var seed = model.dominantFiles && model.dominantFiles.length ? model.dominantFiles[0] : "";
    traceQuery.value = seed;
  }

  function refreshTraceExplorer() {
    if (!traceQuery || !traceSummary || !traceResults) return;

    var query = String(traceQuery.value || "").trim();
    traceResults.innerHTML = "";

    if (!query) {
      safeText(traceSummary, "Enter a file path fragment to load trace evidence.");
      traceResults.appendChild(create("p", "muted", "Example: src/views/history.js or style.css"));
      return;
    }

    var queryLower = query.toLowerCase();
    var matches = prepared
      .filter(function (item) {
        return toFileList(item.entry).some(function (file) {
          return String(file || "").toLowerCase().includes(queryLower);
        });
      })
      .slice()
      .reverse();

    if (!matches.length) {
      safeText(traceSummary, "No runs touched files matching \"" + query + "\".");
      traceResults.appendChild(create("p", "muted", "Try a broader prefix like src/views/ or src/core/."));
      return;
    }

    var oldest = matches[0];
    var newest = matches[matches.length - 1];
    var gaps = summarizeTouchGaps(matches);
    var share = Math.round(matches.length / Math.max(1, prepared.length) * 100);
    safeText(
      traceSummary,
      "Matched " + matches.length + " run(s) (" + share + "% of history), from " +
      (oldest.entry.date || "Unknown") + " to " + (newest.entry.date || "Unknown") +
      ". Avg return gap: " + gaps.average.toFixed(1) + " day(s), min " + gaps.min + ", max " + gaps.max + "."
    );

    var coChanges = coChangeRanking(matches, query);
    var stats = create("ul", "history-compare-stats");
    stats.appendChild(create("li", "", "Latest touch: " + (newest.entry.date || "Unknown date")));
    stats.appendChild(create("li", "", "Latest run title: " + (newest.entry.title || "Untitled")));
    stats.appendChild(create("li", "", "Focus split: " + matches.filter(function (item) { return item.focus === "external"; }).length + " external / " + matches.filter(function (item) { return item.focus === "internal"; }).length + " internal."));
    traceResults.appendChild(stats);

    var coChangeSection = create("section", "history-cochange");
    coChangeSection.appendChild(create("h3", "", "Frequent co-changes"));
    if (!coChanges.length) {
      coChangeSection.appendChild(create("p", "muted", "No stable co-change files in this slice."));
    } else {
      var coList = create("ul", "files");
      coChanges.forEach(function (item) {
        coList.appendChild(create("li", "", item.file + " (" + item.count + ")"));
      });
      coChangeSection.appendChild(coList);
    }
    traceResults.appendChild(coChangeSection);

    var matchSection = create("section", "history-trace-match-list");
    matchSection.appendChild(create("h3", "", "Matching runs"));
    var matchList = create("div", "history-trace-cards");
    matches.slice().reverse().forEach(function (item) {
      var entry = item.entry;
      var card = create("article", "history-trace-card");
      card.appendChild(create("h4", "", (entry.date || "Unknown date") + " · " + (entry.title || "Untitled")));
      card.appendChild(create("p", "muted", "Axis: " + axisLabel(item.axis) + " · Focus: " + item.focus));
      card.appendChild(create("p", "", entry.summary || "No summary provided."));
      matchList.appendChild(card);
    });
    matchSection.appendChild(matchList);
    traceResults.appendChild(matchSection);
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
  if (traceQuery) {
    traceQuery.addEventListener("input", refreshTraceExplorer);
  }

  seedComparisonControls();
  seedTraceQuery();
  refreshComparison();
  refreshTraceExplorer();
  refresh();
}
