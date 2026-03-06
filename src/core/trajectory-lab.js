import { addDays } from "../shared/time.js";
import { hashSeed, seededRandom } from "../shared/random.js";

var AXES = ["governance", "memory", "runtime", "interface", "structure"];

function averageFileLoad(entries) {
  if (!entries.length) return 0;
  var total = entries.reduce(function (sum, entry) {
    var files = Array.isArray(entry.files_changed) ? entry.files_changed.length : 0;
    return sum + files;
  }, 0);
  return total / entries.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dominantAxis(entries) {
  var counts = entries.reduce(function (acc, entry) {
    var axis = entry.axis || "structure";
    acc[axis] = (acc[axis] || 0) + 1;
    return acc;
  }, {});

  return AXES.slice().sort(function (a, b) {
    return (counts[b] || 0) - (counts[a] || 0);
  })[0] || "structure";
}

function describePhase(phase, index) {
  var axis = phase.dominantAxis;
  var files = phase.avgFiles;
  var intensity = files >= 10 ? "high" : files >= 6 ? "medium" : "low";

  if (index === 0) return "Bootstrapping phase with " + intensity + " change intensity.";
  if (axis === "runtime") return "Runtime-heavy phase consolidating execution flow.";
  if (axis === "memory") return "Memory phase refining history semantics and projection rules.";
  if (axis === "governance") return "Governance phase formalizing adaptive constraints.";
  if (axis === "interface") return "Interface phase emphasizing observer readability.";
  return "Structural phase rebalancing system topology.";
}

export function derivePhases(entries) {
  if (!Array.isArray(entries) || !entries.length) return [];

  var phases = [];
  var open = null;

  entries.forEach(function (entry) {
    if (!open) {
      open = {
        startDate: entry.date,
        endDate: entry.date,
        entries: [entry]
      };
      return;
    }

    var currentAxis = entry.axis || "structure";
    var openAxis = dominantAxis(open.entries);
    var openLoad = averageFileLoad(open.entries);
    var entryLoad = Array.isArray(entry.files_changed) ? entry.files_changed.length : 0;

    var axisShift = currentAxis !== openAxis;
    var pressureShift = Math.abs(entryLoad - openLoad) >= 4;
    var maxSpan = open.entries.length >= 3;

    if ((axisShift && maxSpan) || (pressureShift && open.entries.length >= 2)) {
      phases.push(open);
      open = {
        startDate: entry.date,
        endDate: entry.date,
        entries: [entry]
      };
      return;
    }

    open.entries.push(entry);
    open.endDate = entry.date;
  });

  if (open) phases.push(open);

  return phases.map(function (phase, index) {
    var avgFiles = averageFileLoad(phase.entries);
    var domAxis = dominantAxis(phase.entries);
    var novelty = clamp(Math.round((avgFiles / 12) * 100) + phase.entries.length * 8, 12, 96);

    return {
      id: "phase-" + String(index + 1).padStart(2, "0"),
      label: "Phase " + (index + 1),
      startDate: phase.startDate,
      endDate: phase.endDate,
      runCount: phase.entries.length,
      dominantAxis: domAxis,
      avgFiles: Number(avgFiles.toFixed(1)),
      novelty: novelty,
      summary: describePhase({ dominantAxis: domAxis, avgFiles: avgFiles }, index)
    };
  });
}

function axisPriority(model, targetAxis, variance) {
  var byAxis = {};
  AXES.forEach(function (axis) {
    byAxis[axis] = 1;
  });

  (model.axisBalance || []).forEach(function (item) {
    byAxis[item.axis] = Math.max(1, 6 - item.count);
  });

  byAxis[targetAxis] = byAxis[targetAxis] + 4;

  if (model.intent && Array.isArray(model.intent.tracks)) {
    model.intent.tracks.forEach(function (track) {
      if (!track || !track.axis) return;
      var weight = Math.max(1, Math.round(Number(track.urgency || 0) / 30));
      byAxis[track.axis] = (byAxis[track.axis] || 1) + weight;
    });
  }

  if (variance > 0.65) {
    AXES.forEach(function (axis) {
      byAxis[axis] = byAxis[axis] + 1;
    });
  }

  return byAxis;
}

function pickAxis(weights, random) {
  var total = Object.keys(weights).reduce(function (sum, key) {
    return sum + weights[key];
  }, 0);

  var cursor = random() * total;
  var keys = Object.keys(weights);

  for (var i = 0; i < keys.length; i += 1) {
    var axis = keys[i];
    cursor -= weights[axis];
    if (cursor <= 0) return axis;
  }

  return keys[keys.length - 1] || "structure";
}

function planAction(axis, step, strategy) {
  if (axis === "runtime") return "Restructure runtime pipeline stage " + step + " for " + strategy + " mode.";
  if (axis === "memory") return "Evolve ledger semantics with migration-safe memory rule " + step + ".";
  if (axis === "governance") return "Rewrite policy clauses to enforce adaptive threshold set " + step + ".";
  if (axis === "interface") return "Introduce alternate observer layer " + step + " without core coupling.";
  return "Recompose repository structure cluster " + step + " to unlock optionality.";
}

function riskLabel(strategy, variance) {
  if (strategy === "controlled-chaos") return variance > 0.75 ? "elevated" : "moderate";
  if (strategy === "stabilize") return "low";
  return variance > 0.7 ? "moderate" : "low";
}

export function generateScenarios(model, options) {
  if (!model || !model.entries || !model.entries.length) return [];

  var strategy = options && options.strategy ? options.strategy : "policy-pivot";
  var variance = options && typeof options.variance === "number" ? options.variance : 0.55;
  var count = options && typeof options.count === "number" ? options.count : 3;
  var seed = [model.latestDate, strategy, variance.toFixed(2), model.entries.length].join("|");
  var random = seededRandom(hashSeed(seed));

  var policyAxis = model.policy && model.policy.requiredAxis ? model.policy.requiredAxis : null;
  var underusedAxis = (model.axisBalance || []).slice().sort(function (a, b) {
    return a.count - b.count;
  })[0];
  var targetAxis = strategy === "stabilize"
    ? (model.axisBalance || []).slice().sort(function (a, b) { return b.count - a.count; })[0].axis
    : (policyAxis || (underusedAxis ? underusedAxis.axis : "structure"));

  var weights = axisPriority(model, targetAxis, variance);
  var cadence = Math.max(1, Math.round(model.cadence && model.cadence.averageGap ? model.cadence.averageGap : 1));

  var scenarios = [];
  for (var i = 0; i < count; i += 1) {
    var steps = [];
    var coverage = {};

    for (var step = 1; step <= 4; step += 1) {
      var axis = pickAxis(weights, random);
      coverage[axis] = true;
      var date = addDays(model.latestDate, cadence * step);
      var action = planAction(axis, step, strategy);
      var disruption = clamp(Math.round((2 + variance * 4) + random() * 2), 1, 6);

      steps.push({
        step: step,
        axis: axis,
        date: date,
        disruption: disruption,
        action: action
      });

      if (strategy === "stabilize") {
        weights[axis] = Math.max(1, weights[axis] - 1);
      } else {
        weights[axis] = weights[axis] + (variance > 0.7 ? 1 : 0);
      }
    }

    scenarios.push({
      id: "scenario-" + (i + 1),
      name: strategy + " set " + (i + 1),
      strategy: strategy,
      targetAxis: targetAxis,
      axisCoverage: Object.keys(coverage).length,
      risk: riskLabel(strategy, variance),
      confidence: clamp(Math.round((0.5 + random() * (1 - variance * 0.35)) * 100), 40, 94),
      thesis: "Push the system through " + strategy + " mode while anchoring on " + targetAxis + " and reducing intent debt.",
      steps: steps
    });
  }

  return scenarios;
}
