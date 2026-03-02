import { byId, create, safeText } from "../shared/dom.js";

function axisLabel(axis) {
  if (axis === "governance") return "Governance";
  if (axis === "memory") return "Memory";
  if (axis === "runtime") return "Runtime";
  if (axis === "interface") return "Interface";
  return "Structure";
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
  if (!root) return;

  renderLedgerRecap(model);

  root.innerHTML = "";
  if (!model.descEntries.length) {
    root.appendChild(create("p", "muted", "No entries yet."));
    return;
  }

  var axisByDateTitle = model.timeline.reduce(function (acc, node) {
    acc[node.date + "|" + node.title] = node.axis;
    return acc;
  }, {});

  model.descEntries.forEach(function (entry) {
    var article = create("article", "entry");
    article.appendChild(create("h3", "", entry.title || "Untitled"));
    article.appendChild(create("p", "date", entry.date || "Unknown date"));
    article.appendChild(create("p", "", entry.summary || ""));

    var axis = axisByDateTitle[(entry.date || "") + "|" + (entry.title || "Untitled")] || "structure";
    article.appendChild(create("p", "axis axis-" + axis, "Axis: " + axisLabel(axis)));

    if (Array.isArray(entry.files_changed) && entry.files_changed.length) {
      article.appendChild(create("p", "", "Files changed:"));
      var ul = create("ul", "files");
      entry.files_changed.forEach(function (file) {
        ul.appendChild(create("li", "", file));
      });
      article.appendChild(ul);
    }

    root.appendChild(article);
  });
}
