import { dayDelta, toDayString } from "../shared/time.js";

export function sortByDateAsc(entries) {
  return entries.slice().sort(function (a, b) {
    return String(a.date || "").localeCompare(String(b.date || ""));
  });
}

export function sortByDateDesc(entries) {
  return entries.slice().sort(function (a, b) {
    return String(b.date || "").localeCompare(String(a.date || ""));
  });
}

export function uniqueDays(entries) {
  return entries
    .map(function (entry) {
      return String(entry.date || "").slice(0, 10);
    })
    .filter(function (value, index, array) {
      return value && array.indexOf(value) === index;
    })
    .sort();
}

export function computeStreaks(days) {
  if (!days.length) return { current: 0, longest: 0 };
  var longest = 1;
  var current = 1;
  for (var i = 1; i < days.length; i += 1) {
    if (dayDelta(days[i - 1], days[i]) === 1) {
      current += 1;
    } else {
      if (current > longest) longest = current;
      current = 1;
    }
  }
  if (current > longest) longest = current;
  return { current: current, longest: longest };
}

export function detectRepetition(entries) {
  var recent = sortByDateDesc(entries).slice(0, 6);
  if (recent.length < 3) {
    return {
      risk: "low",
      repeatedCore: false,
      details: "Not enough recent data for strong repetition detection."
    };
  }

  var coreSignature = "index.html|style.css|site.js";
  var exactCoreMatches = recent.filter(function (entry) {
    var files = Array.isArray(entry.files_changed) ? entry.files_changed.slice().sort().join("|") : "";
    return files === coreSignature || files === "index.html|log.json|site.js|style.css";
  }).length;

  var panelLikeTitles = recent.filter(function (entry) {
    var title = String(entry.title || "").toLowerCase();
    return title.includes("meter") || title.includes("panel") || title.includes("pulse") || title.includes("forecast") || title.includes("drift");
  }).length;

  if (exactCoreMatches >= 3 || panelLikeTitles >= 4) {
    return {
      risk: "high",
      repeatedCore: true,
      details: "Recent runs repeatedly modified the same UI core files with metric/panel-style increments."
    };
  }

  return {
    risk: "medium",
    repeatedCore: false,
    details: "Some overlap exists, but not enough to classify as strong repetition."
  };
}

export async function loadLog(path) {
  var response = await fetch(path || "log.json");
  if (!response.ok) throw new Error("log fetch failed");
  var entries = await response.json();
  return Array.isArray(entries) ? entries : [];
}

export function summarizeCadence(days) {
  if (days.length < 2) {
    return { averageGap: 1, latestGap: 0 };
  }
  var total = 0;
  var count = 0;
  for (var i = 1; i < days.length; i += 1) {
    var delta = dayDelta(days[i - 1], days[i]);
    if (delta > 0) {
      total += delta;
      count += 1;
    }
  }
  var averageGap = count ? total / count : 1;
  var latest = days[days.length - 1];
  var today = toDayString(new Date());
  return {
    averageGap: averageGap,
    latestGap: Math.max(0, dayDelta(latest, today))
  };
}
