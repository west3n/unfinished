import { addDays } from "../shared/time.js";
import { hashSeed, seededRandom } from "../shared/random.js";
import { selectOperators } from "./mutation-operators.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeProgram(program, index) {
  var steps = Array.isArray(program && program.steps) ? program.steps : [];
  return {
    id: String(program && program.id ? program.id : "program-" + String(index + 1).padStart(2, "0")),
    name: String(program && program.name ? program.name : "Unnamed program"),
    strategy: String(program && program.strategy ? program.strategy : "policy-pivot"),
    axis: String(program && program.axis ? program.axis : "structure"),
    confidence: clamp(Math.round(Number(program && program.confidence ? program.confidence : 60)), 1, 100),
    disruption: clamp(Math.round(Number(program && program.disruption ? program.disruption : 3)), 1, 6),
    thesis: String(program && program.thesis ? program.thesis : ""),
    steps: steps.map(function (step, stepIndex) {
      return {
        step: Math.max(1, Number(step && step.step ? step.step : stepIndex + 1)),
        axis: String(step && step.axis ? step.axis : "structure"),
        date: String(step && step.date ? step.date : "unknown").slice(0, 10),
        action: String(step && step.action ? step.action : ""),
        detail: String(step && step.detail ? step.detail : ""),
        files: Array.isArray(step && step.files)
          ? step.files.filter(function (file) { return typeof file === "string" && file.length > 0; })
          : [],
        disruption: clamp(Math.round(Number(step && step.disruption ? step.disruption : 3)), 1, 6)
      };
    })
  };
}

function preferredAxis(model, strategy) {
  if (model.policy && model.policy.requiredAxis && strategy !== "stabilize") {
    return model.policy.requiredAxis;
  }

  var axis = "structure";
  var balance = Array.isArray(model.axisBalance) ? model.axisBalance.slice() : [];
  if (!balance.length) return axis;

  if (strategy === "stabilize") {
    return balance.sort(function (a, b) { return b.count - a.count; })[0].axis;
  }

  if (strategy === "controlled-chaos") {
    return balance.sort(function (a, b) { return a.count - b.count; })[0].axis;
  }

  return balance.sort(function (a, b) { return a.count - b.count; })[0].axis;
}

function buildProgram(model, strategy, index, random) {
  var cadence = Math.max(1, Math.round(model.cadence && model.cadence.averageGap ? model.cadence.averageGap : 1));
  var targetAxis = preferredAxis(model, strategy);
  var novelty = strategy === "controlled-chaos" ? 0.84 : strategy === "stabilize" ? 0.48 : 0.67;
  var variance = strategy === "controlled-chaos" ? 0.82 : strategy === "stabilize" ? 0.35 : 0.58;

  var operators = selectOperators(model, {
    strategy: strategy,
    targetAxis: targetAxis,
    novelty: novelty,
    variance: variance,
    count: 4
  });

  var steps = operators.map(function (operator, stepIndex) {
    return {
      step: stepIndex + 1,
      axis: operator.axis,
      date: addDays(model.latestDate, cadence * (stepIndex + 1)),
      action: operator.name,
      detail: operator.detail,
      files: operator.files,
      disruption: operator.disruption
    };
  });

  var dominant = steps.reduce(function (acc, step) {
    acc[step.axis] = (acc[step.axis] || 0) + 1;
    return acc;
  }, {});

  var dominantAxis = Object.keys(dominant).sort(function (a, b) {
    return dominant[b] - dominant[a];
  })[0] || targetAxis;

  var averageImpact = operators.length
    ? operators.reduce(function (sum, operator) { return sum + operator.impact; }, 0) / operators.length
    : 55;
  var confidenceBase = strategy === "stabilize" ? 74 : strategy === "policy-pivot" ? 68 : 62;
  var confidence = clamp(Math.round(confidenceBase + (averageImpact - 58) * 0.35 + random() * 8), 45, 96);
  var disruption = clamp(Math.round(steps.reduce(function (sum, step) {
    return sum + step.disruption;
  }, 0) / Math.max(1, steps.length)), 1, 6);

  return {
    id: "program-" + (index + 1),
    name: strategy + " operator program " + (index + 1),
    strategy: strategy,
    axis: dominantAxis,
    confidence: confidence,
    disruption: disruption,
    thesis: "Execute " + strategy + " via shared mutation operators with a " + dominantAxis + " center of gravity.",
    steps: steps
  };
}

function strategyOrder(model) {
  var policyMode = model.policy && model.policy.actionMode ? model.policy.actionMode : "maintain-diversification";
  if (policyMode === "force-structural-pivot") {
    return ["policy-pivot", "controlled-chaos", "stabilize"];
  }
  if (policyMode === "prioritize-underused-axis") {
    return ["policy-pivot", "stabilize", "controlled-chaos"];
  }
  return ["stabilize", "policy-pivot", "controlled-chaos"];
}

function summarizePrograms(programs) {
  var byStrategy = programs.reduce(function (acc, program) {
    acc[program.strategy] = (acc[program.strategy] || 0) + 1;
    return acc;
  }, {});

  var primary = programs.slice().sort(function (a, b) {
    return b.confidence - a.confidence;
  })[0] || null;

  return {
    count: programs.length,
    byStrategy: byStrategy,
    primary: primary,
    averageConfidence: programs.length
      ? Math.round(programs.reduce(function (sum, program) { return sum + program.confidence; }, 0) / programs.length)
      : 0
  };
}

export function compilePrograms(model, options) {
  if (!model || !Array.isArray(model.entries) || !model.entries.length) return [];

  var count = options && typeof options.count === "number" ? Math.max(1, options.count) : 3;
  var seed = [model.latestDate, model.entries.length, model.repetition ? model.repetition.risk : "low", count].join("|");
  var random = seededRandom(hashSeed(seed));
  var strategies = strategyOrder(model);

  var programs = [];
  for (var i = 0; i < count; i += 1) {
    var strategy = strategies[i % strategies.length];
    programs.push(buildProgram(model, strategy, i, random));
  }

  return programs;
}

export function resolvePrograms(declaredPrograms, model) {
  var normalized = Array.isArray(declaredPrograms)
    ? declaredPrograms.map(normalizeProgram)
    : [];

  if (normalized.length) {
    return {
      programs: normalized,
      summary: summarizePrograms(normalized)
    };
  }

  var compiled = compilePrograms(model, { count: 3 });
  return {
    programs: compiled,
    summary: summarizePrograms(compiled)
  };
}
