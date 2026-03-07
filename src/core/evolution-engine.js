import { computeStreaks, detectRepetition, sortByDateAsc, sortByDateDesc, summarizeCadence, uniqueDays } from "./log-data.js";
import { hashSeed, seededRandom } from "../shared/random.js";
import { inferAxis } from "./memory-ledger.js";
import { evaluatePolicy } from "./policy-engine.js";
import { derivePhases, generateScenarios } from "./trajectory-lab.js";
import { deriveIntentSignals } from "./intent-engine.js";
import { resolvePrograms } from "./program-engine.js";

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

function summarizeEvents(events) {
  var sorted = events.slice().sort(function (a, b) {
    return String(a.date || "").localeCompare(String(b.date || ""));
  });

  var byType = sorted.reduce(function (acc, event) {
    var type = event.type || "event.unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  var byAxis = sorted.reduce(function (acc, event) {
    var axis = event.axis || "structure";
    acc[axis] = (acc[axis] || 0) + 1;
    return acc;
  }, {});

  return {
    count: sorted.length,
    latestDate: sorted.length ? sorted[sorted.length - 1].date : "unknown",
    recent: sorted.slice(-8).reverse(),
    byType: byType,
    byAxis: byAxis
  };
}

function mutationFromPrograms(model, options) {
  var novelty = options && typeof options.novelty === "number" ? options.novelty : 0.7;
  var count = options && typeof options.count === "number" ? options.count : 4;
  var random = seededRandom(hashSeed(model.latestDate + "|program-mutation|" + novelty.toFixed(2)));

  var strategy = novelty > 0.78
    ? "controlled-chaos"
    : novelty > 0.52
      ? "policy-pivot"
      : "stabilize";

  var orderedPrograms = (model.programs || []).slice().sort(function (a, b) {
    return b.confidence - a.confidence;
  });

  var chosen = orderedPrograms.find(function (program) {
    return program.strategy === strategy;
  }) || orderedPrograms[0];

  if (!chosen || !Array.isArray(chosen.steps) || !chosen.steps.length) {
    return [];
  }

  var candidates = [];
  for (var i = 0; i < count; i += 1) {
    var step = chosen.steps[i % chosen.steps.length];
    var impactBias = chosen.confidence / 100;
    var disruption = Math.max(1, Math.min(6, Math.round(step.disruption + random() * 2 - 0.5)));

    candidates.push({
      id: "mutation-" + (i + 1),
      axis: step.axis,
      title: step.action,
      rationale: step.detail || chosen.thesis,
      predictedImpact: Math.max(20, Math.round((0.42 + (impactBias * 0.45) + (random() * novelty * 0.18)) * 100)),
      disruption: disruption,
      files: Array.isArray(step.files) && step.files.length ? step.files.slice(0, 4) : ["src/core/program-engine.js"]
    });
  }

  return candidates;
}

export function buildEvolutionModel(ledgerOrEntries, options) {
  var ledger = Array.isArray(ledgerOrEntries)
    ? { schema: "legacy-log@1", semantics: "entries-only", entries: ledgerOrEntries, events: [], intents: [], programs: [] }
    : (ledgerOrEntries && typeof ledgerOrEntries === "object"
      ? ledgerOrEntries
      : { schema: "unknown", semantics: "unknown", entries: [], events: [], intents: [], programs: [] });

  var entries = Array.isArray(ledger.entries) ? ledger.entries : [];
  var events = Array.isArray(ledger.events) ? ledger.events : [];
  var intents = Array.isArray(ledger.intents) ? ledger.intents : [];

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
      axis: inferAxis(entry),
      raw: entry
    };
  });

  var baseModel = {
    ledger: ledger,
    ledgerSchema: ledger.schema || "unknown",
    ledgerSemantics: ledger.semantics || "unknown",
    entries: entries,
    events: events,
    intents: intents,
    programs: Array.isArray(ledger.programs) ? ledger.programs : [],
    eventSummary: summarizeEvents(events),
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

  baseModel.phases = derivePhases(baseModel.ascEntries);
  baseModel.intent = deriveIntentSignals(baseModel);

  var declaredPrograms = Array.isArray(baseModel.programs) ? baseModel.programs : [];
  var resolved = resolvePrograms(declaredPrograms, baseModel);
  baseModel.programs = resolved.programs;
  baseModel.programSummary = resolved.summary;

  var policy = options && options.policy ? options.policy : null;
  baseModel.policy = policy ? evaluatePolicy(baseModel, policy) : null;
  if (!declaredPrograms.length && policy) {
    resolved = resolvePrograms([], baseModel);
    baseModel.programs = resolved.programs;
    baseModel.programSummary = resolved.summary;
    baseModel.policy = evaluatePolicy(baseModel, policy);
  }

  return baseModel;
}

export function generateMutations(model, options) {
  if (!model || !Array.isArray(model.entries) || !model.entries.length) {
    return [];
  }
  return mutationFromPrograms(model, options || {});
}

export { generateScenarios };
