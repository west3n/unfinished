import { byId, create, safeText } from "../shared/dom.js";
import { inferAxis } from "../core/memory-ledger.js";

function formatAxis(axis) {
  return String(axis || "structure").replace(/^[a-z]/, function (match) {
    return match.toUpperCase();
  });
}

function renderBrief(model) {
  var headline = byId("brief-headline");
  var body = byId("brief-body");
  var signals = byId("brief-signals");
  if (!headline || !body || !signals) return;

  signals.innerHTML = "";

  if (!model.descEntries.length) {
    safeText(headline, "No recorded runs yet.");
    safeText(body, "Observer brief becomes available after the first logged change.");
    return;
  }

  var latest = model.descEntries[0];
  var gap = model.cadence.latestGap;
  var continuityLine = gap === 0
    ? "Continuity is live with a same-day update."
    : "Continuity gap is " + gap + " day(s); cadence needs reinforcement.";
  var repetitionLine = model.repetition
    ? "Repetition risk: " + model.repetition.risk + ". " + model.repetition.details
    : "Repetition risk unavailable.";

  safeText(headline, "Latest run: " + (latest.title || "Untitled") + " (" + (latest.date || "unknown") + ")");
  safeText(body, continuityLine + " " + repetitionLine);

  var signalRows = [
    "Entries: " + model.entries.length,
    "Active days: " + model.days.length,
    "Longest streak: " + model.streaks.longest,
    "Current action mode: " + (model.policy ? model.policy.actionMode : "policy unavailable")
  ];

  signalRows.forEach(function (text) {
    signals.appendChild(create("li", "", text));
  });
}

function renderArc(model) {
  var summary = byId("arc-summary");
  var list = byId("arc-list");
  if (!summary || !list) return;

  list.innerHTML = "";

  if (!model.descEntries.length) {
    safeText(summary, "No change arc available yet.");
    return;
  }

  var sample = model.descEntries.slice(0, Math.min(5, model.descEntries.length));
  safeText(summary, "Showing the last " + sample.length + " runs as a legible trajectory rather than fragmented panels.");

  sample.forEach(function (entry) {
    var filesCount = Array.isArray(entry.files_changed) ? entry.files_changed.length : 0;
    var card = create("article", "ledger-event");
    card.appendChild(create("h3", "", entry.title || "Untitled"));

    var axis = inferAxis(entry);
    card.appendChild(create("p", "ledger-meta", (entry.date || "Unknown") + " · " + formatAxis(axis) + " · " + filesCount + " file(s)"));

    var text = entry.summary || "No summary provided.";
    if (text.length > 180) text = text.slice(0, 177).trim() + "...";
    card.appendChild(create("p", "", text));
    list.appendChild(card);
  });
}

function renderNext(model) {
  var now = byId("next-now");
  var list = byId("next-list");
  if (!now || !list) return;

  list.innerHTML = "";

  var primary = model.policy && model.policy.requiredAxis
    ? model.policy.requiredAxis
    : "interface";
  var recent = model.descEntries.slice(0, 5);
  var internalWeightedRuns = recent.filter(function (entry) {
    return inferAxis(entry) !== "interface";
  }).length;
  var runType = model.repetition && model.repetition.risk === "high"
    ? "external"
    : internalWeightedRuns >= 3
      ? "external"
      : "internal";
  var mode = model.policy ? model.policy.actionMode : "maintain-diversification";

  safeText(now, "Suggested next run: " + runType + " with emphasis on " + primary + " axis (" + mode + ").");

  var steps = [];
  if (runType === "external") {
    steps.push("Deliver one observer-visible improvement tied to recent runtime or memory signals.");
    steps.push("Prefer subtraction if a page or behavior is redundant or noisy.");
  } else {
    steps.push("Make one focused internal change that removes duplication in the required axis.");
    steps.push("Ship a concrete external follow-up target in the same run note.");
  }

  steps.push("Update log semantics with a trace that explains why this move was non-redundant.");

  steps.forEach(function (text) {
    list.appendChild(create("li", "", text));
  });
}

export function renderHome(model) {
  renderBrief(model);
  renderArc(model);
  renderNext(model);
}
