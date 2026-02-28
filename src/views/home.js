import { byId, safeText, create } from "../shared/dom.js";
import { addDays, toDayString } from "../shared/time.js";
import { hashSeed, seededRandom } from "../shared/random.js";

function describeVolatility(files) {
  if (files >= 6) return "High";
  if (files >= 3) return "Medium";
  if (files > 0) return "Low";
  return "Trace";
}

function renderLatest(model) {
  var title = byId("latest-title");
  var summary = byId("latest-summary");
  var date = byId("latest-date");
  if (!title) return;

  var latest = model.descEntries[0];
  if (!latest) {
    safeText(title, "No entries yet.");
    safeText(summary, "");
    safeText(date, "");
    return;
  }

  safeText(title, latest.title || "Untitled");
  safeText(summary, latest.summary || "");
  safeText(date, latest.date ? "Date: " + latest.date : "");
}

function renderContinuity(model) {
  var status = byId("continuity-status");
  var detail = byId("continuity-detail");
  var bar = byId("continuity-bar");
  if (!status || !detail || !bar) return;

  if (!model.days.length) {
    safeText(status, "No entries yet.");
    safeText(detail, "Continuity cannot be verified without history.");
    bar.style.width = "0%";
    bar.classList.add("warn");
    return;
  }

  var latest = model.latestDate;
  var today = toDayString(new Date());
  var gapDays = model.cadence.latestGap;
  var streak = model.streaks.current;
  var meter = Math.min(100, Math.round((streak / Math.max(3, model.days.length)) * 100));
  bar.style.width = meter + "%";

  if (gapDays === 0 && latest === today) {
    safeText(status, "Continuity intact.");
    safeText(detail, "Latest entry recorded today. Streak: " + streak + " days.");
    bar.classList.remove("warn");
    return;
  }

  safeText(status, "Continuity needs attention.");
  safeText(detail, "Latest entry: " + latest + ". Gap: " + gapDays + " day(s). Streak: " + streak + " days.");
  bar.classList.add("warn");
}

function renderMemory(model) {
  var line = byId("memory-line");
  var list = byId("memory-shards");
  if (!line || !list) return;

  list.innerHTML = "";

  if (!model.descEntries.length) {
    safeText(line, "No shards yet.");
    return;
  }

  var seedBase = model.latestDate || "unfinished";
  var random = seededRandom(hashSeed(seedBase));
  var pool = model.descEntries.slice(0, Math.min(model.descEntries.length, 12));

  for (var i = pool.length - 1; i > 0; i -= 1) {
    var j = Math.floor(random() * (i + 1));
    var temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  var pick = pool.slice(0, Math.min(3, pool.length));
  pick.forEach(function (entry, index) {
    var li = create("li", "shard");
    li.style.animationDelay = (index * 0.6).toFixed(1) + "s";

    var title = create("h3", "", entry.title || "Untitled");
    var date = create("p", "date", entry.date || "Unknown date");
    var summary = create("p");

    var text = entry.summary || "";
    if (text.length > 120) text = text.slice(0, 117).trim() + "...";
    summary.textContent = text || "Summary withheld.";

    li.appendChild(title);
    li.appendChild(date);
    li.appendChild(summary);
    list.appendChild(li);
  });

  safeText(line, "Projected " + pick.length + " shard(s) from recent history.");
}

function renderDrift(model) {
  var summary = byId("drift-summary");
  var list = byId("drift-list");
  if (!summary || !list) return;

  list.innerHTML = "";

  if (!model.descEntries.length) {
    safeText(summary, "No drift to measure yet.");
    return;
  }

  var recent = model.descEntries.slice(0, Math.min(model.descEntries.length, 7));
  var totalChanges = recent.reduce(function (sum, entry) {
    return sum + (Array.isArray(entry.files_changed) ? entry.files_changed.length : 0);
  }, 0);
  var average = recent.length ? (totalChanges / recent.length).toFixed(1) : "0";

  safeText(summary, "Scanning last " + recent.length + " entries. Avg files changed: " + average + ". Latest anchor: " + model.latestDate + ".");

  recent.forEach(function (entry, index) {
    var files = Array.isArray(entry.files_changed) ? entry.files_changed.length : 0;
    var item = create("li", "drift-item");
    item.style.animationDelay = (index * 0.4).toFixed(1) + "s";

    item.appendChild(create("h3", "", entry.title || "Untitled"));
    item.appendChild(create("p", "drift-meta", "Date: " + (entry.date || "Unknown") + " · Files: " + files + " · Drift: " + describeVolatility(files)));

    var bodyText = entry.summary || "Signal muted.";
    if (bodyText.length > 140) bodyText = bodyText.slice(0, 137).trim() + "...";
    item.appendChild(create("p", "drift-body", bodyText));

    list.appendChild(item);
  });
}

function renderForecast(model) {
  var summary = byId("forecast-summary");
  var list = byId("forecast-list");
  if (!summary || !list) return;

  list.innerHTML = "";

  if (!model.days.length) {
    safeText(summary, "No trajectory yet.");
    return;
  }

  var cadence = Math.max(1, Math.round(model.cadence.averageGap));
  var gap = model.cadence.latestGap;
  var risk = gap > cadence ? "Drifting" : gap === 0 ? "Aligned" : "Holding";
  safeText(summary, "Cadence: ~" + cadence + " day(s). Last entry: " + model.latestDate + ". Today: " + toDayString(new Date()) + ". Status: " + risk + ".");

  for (var step = 1; step <= 3; step += 1) {
    var item = create("li", "forecast-item");
    item.appendChild(create("h3", "", "Projection " + step));
    item.appendChild(create("p", "forecast-meta", "Projected date: " + addDays(model.latestDate, cadence * step)));
    list.appendChild(item);
  }
}

function renderPulse(model) {
  var summary = byId("pulse-summary");
  var entriesEl = byId("metric-entries");
  var daysEl = byId("metric-days");
  var streakEl = byId("metric-streak");
  var originEl = byId("metric-origin");
  if (!summary || !entriesEl || !daysEl || !streakEl || !originEl) return;

  if (!model.entries.length) {
    safeText(summary, "No measurable pulse yet.");
    safeText(entriesEl, "0");
    safeText(daysEl, "0");
    safeText(streakEl, "0");
    safeText(originEl, "--");
    return;
  }

  var today = toDayString(new Date());
  var originSpan = model.originDate === "unknown" ? "--" : String(Math.max(0, Math.floor((new Date(today + "T00:00:00Z") - new Date(model.originDate + "T00:00:00Z")) / 86400000)));

  safeText(summary, "Tracking from " + model.originDate + " through " + model.latestDate + ".");
  safeText(entriesEl, String(model.entries.length));
  safeText(daysEl, String(model.days.length));
  safeText(streakEl, String(model.streaks.longest));
  safeText(originEl, originSpan);
}

function renderIntent(model) {
  var intent = byId("intent-summary");
  if (!intent) return;

  if (model.repetition.risk === "high") {
    safeText(intent, "Evolution intent: break repetition by shifting from panel increments into structural/runtime mutations.");
    return;
  }

  safeText(intent, "Evolution intent: continue diversification across governance, runtime, and memory axes.");
}

export function renderHome(model) {
  renderLatest(model);
  renderContinuity(model);
  renderMemory(model);
  renderDrift(model);
  renderForecast(model);
  renderPulse(model);
  renderIntent(model);
}
