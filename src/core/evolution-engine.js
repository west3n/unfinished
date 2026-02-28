import { computeStreaks, detectRepetition, sortByDateAsc, sortByDateDesc, summarizeCadence, uniqueDays } from "./log-data.js";
import { hashSeed, seededRandom } from "../shared/random.js";

function classifyAxis(entry) {
  var files = Array.isArray(entry.files_changed) ? entry.files_changed : [];
  var joined = files.join("|").toLowerCase();
  if (joined.includes(".github/workflows") || joined.includes("autonomy") || joined.includes("constitution")) return "governance";
  if (joined.includes("log.json") && files.length <= 2) return "memory";
  if (joined.includes("site.js") || joined.includes("src/")) return "runtime";
  if (joined.includes("style.css") || joined.includes(".html")) return "interface";
  return "structure";
}

function collectFileFrequency(entries) {
  return entries.reduce(function (acc, entry) {
    (entry.files_changed || []).forEach(function (file) {
      acc[file] = (acc[file] || 0) + 1;
    });
    return acc;
  }, {});
}

function topFiles(fileFrequency, limit) {
  return Object.keys(fileFrequency)
    .sort(function (a, b) {
      return fileFrequency[b] - fileFrequency[a];
    })
    .slice(0, limit || 5);
}

function axisBalance(timeline) {
  var counts = timeline.reduce(function (acc, node) {
    acc[node.axis] = (acc[node.axis] || 0) + 1;
    return acc;
  }, {});

  var axes = ["governance", "memory", "runtime", "interface", "structure"];
  return axes.map(function (axis) {
    return { axis: axis, count: counts[axis] || 0 };
  });
}

function generateMutationCandidates(model, options) {
  var novelty = options && typeof options.novelty === "number" ? options.novelty : 0.7;
  var count = options && typeof options.count === "number" ? options.count : 4;
  var random = seededRandom(hashSeed(model.latestDate + "|" + novelty.toFixed(2)));

  var underusedAxis = model.axisBalance
    .slice()
    .sort(function (a, b) { return a.count - b.count; })[0].axis;

  var weakFiles = Object.keys(model.fileFrequency)
    .sort(function (a, b) {
      return model.fileFrequency[a] - model.fileFrequency[b];
    })
    .slice(0, 8);

  var templates = [
    {
      axis: "runtime",
      title: "Split runtime into event-driven modules",
      rationale: "Reduce coupling by separating lifecycle, rendering, and data transforms.",
      files: ["site.js", "src/core/evolution-engine.js", "src/views/"]
    },
    {
      axis: "governance",
      title: "Introduce adaptive autonomy policy",
      rationale: "Encode anti-stagnation thresholds directly into machine-readable governance.",
      files: ["CONSTITUTION.md", "AUTONOMY_PROMPT.md", "AUTONOMY_TASK.md"]
    },
    {
      axis: "memory",
      title: "Version memory semantics",
      rationale: "Add schema versioning and migration rules to keep history evolvable.",
      files: ["log.json", "history.html", "src/core/log-data.js"]
    },
    {
      axis: "interface",
      title: "Add alternate perception mode",
      rationale: "Let observers switch between analytic and poetic system views.",
      files: ["index.html", "style.css", "constellation.html"]
    },
    {
      axis: "structure",
      title: "Reorganize repository topology",
      rationale: "Move from flat root to domain folders for long-term adaptability.",
      files: ["src/", "pages/", ".github/workflows/"]
    }
  ];

  var weighted = templates.filter(function (item) {
    return novelty > 0.45 || item.axis === underusedAxis;
  });

  var candidates = [];
  for (var i = 0; i < count; i += 1) {
    var base = weighted[Math.floor(random() * weighted.length)];
    var extraFile = weakFiles.length ? weakFiles[Math.floor(random() * weakFiles.length)] : "log.json";
    candidates.push({
      id: "mutation-" + (i + 1),
      axis: base.axis,
      title: base.title,
      rationale: base.rationale,
      predictedImpact: Math.max(20, Math.round((0.45 + random() * novelty) * 100)),
      disruption: Math.max(1, Math.round((1 + random() * 4) * (0.7 + novelty))),
      files: base.files.concat([extraFile]).filter(function (value, index, array) {
        return array.indexOf(value) === index;
      })
    });
  }

  return candidates;
}

export function buildEvolutionModel(entries) {
  var asc = sortByDateAsc(entries);
  var desc = sortByDateDesc(entries);
  var days = uniqueDays(entries);
  var cadence = summarizeCadence(days);
  var streaks = computeStreaks(days);
  var repetition = detectRepetition(entries);
  var frequency = collectFileFrequency(entries);

  var timeline = asc.map(function (entry, index) {
    var filesCount = Array.isArray(entry.files_changed) ? entry.files_changed.length : 0;
    return {
      id: "entry-" + index,
      index: index,
      date: entry.date || "unknown",
      title: entry.title || "Untitled",
      summary: entry.summary || "",
      filesChanged: filesCount,
      axis: classifyAxis(entry),
      raw: entry
    };
  });

  return {
    entries: entries,
    ascEntries: asc,
    descEntries: desc,
    timeline: timeline,
    days: days,
    streaks: streaks,
    cadence: cadence,
    repetition: repetition,
    fileFrequency: frequency,
    dominantFiles: topFiles(frequency, 6),
    axisBalance: axisBalance(timeline),
    latestDate: days.length ? days[days.length - 1] : "unknown",
    originDate: days.length ? days[0] : "unknown"
  };
}

export function generateMutations(model, options) {
  if (!model || !Array.isArray(model.entries) || !model.entries.length) {
    return [];
  }
  return generateMutationCandidates(model, options || {});
}
