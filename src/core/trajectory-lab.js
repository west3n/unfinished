import { addDays } from "../shared/time.js";
import { hashSeed, seededRandom } from "../shared/random.js";
import { selectOperators } from "./mutation-operators.js";

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

function riskLabel(strategy, variance) {
  if (strategy === "controlled-chaos") return variance > 0.75 ? "elevated" : "moderate";
  if (strategy === "stabilize") return "low";
  return variance > 0.7 ? "moderate" : "low";
}

function pickTargetAxis(model, strategy) {
  var policyAxis = model.policy && model.policy.requiredAxis ? model.policy.requiredAxis : null;
  var underusedAxis = (model.axisBalance || []).slice().sort(function (a, b) {
    return a.count - b.count;
  })[0];

  if (strategy === "stabilize") {
    var dense = (model.axisBalance || []).slice().sort(function (a, b) {
      return b.count - a.count;
    })[0];
    return dense ? dense.axis : "structure";
  }

  return policyAxis || (underusedAxis ? underusedAxis.axis : "structure");
}

export function generateScenarios(model, options) {
  if (!model || !model.entries || !model.entries.length) return [];

  var strategy = options && options.strategy ? options.strategy : "policy-pivot";
  var variance = options && typeof options.variance === "number" ? options.variance : 0.55;
  var count = options && typeof options.count === "number" ? options.count : 3;
  var seed = [model.latestDate, strategy, variance.toFixed(2), model.entries.length].join("|");
  var random = seededRandom(hashSeed(seed));

  var targetAxis = pickTargetAxis(model, strategy);
  var cadence = Math.max(1, Math.round(model.cadence && model.cadence.averageGap ? model.cadence.averageGap : 1));

  var scenarios = [];
  for (var i = 0; i < count; i += 1) {
    var operators = selectOperators(model, {
      strategy: strategy,
      variance: variance,
      novelty: clamp(0.4 + variance * 0.6 + random() * 0.08, 0.25, 0.95),
      count: 4,
      targetAxis: targetAxis
    });

    var coverage = {};
    var steps = operators.map(function (operator, stepIndex) {
      coverage[operator.axis] = true;
      return {
        step: stepIndex + 1,
        axis: operator.axis,
        operatorId: operator.id,
        date: addDays(model.latestDate, cadence * (stepIndex + 1)),
        disruption: operator.disruption,
        action: operator.name,
        detail: operator.detail
      };
    });

    scenarios.push({
      id: "scenario-" + (i + 1),
      name: strategy + " set " + (i + 1),
      strategy: strategy,
      targetAxis: targetAxis,
      axisCoverage: Object.keys(coverage).length,
      risk: riskLabel(strategy, variance),
      confidence: clamp(Math.round((0.5 + random() * (1 - variance * 0.35)) * 100), 40, 94),
      thesis: "Push " + strategy + " mode through shared mutation operators while anchoring on " + targetAxis + ".",
      steps: steps
    });
  }

  return scenarios;
}
