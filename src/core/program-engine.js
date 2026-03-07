import { addDays } from "../shared/time.js";
import { hashSeed, seededRandom } from "../shared/random.js";

var AXES = ["governance", "memory", "runtime", "interface", "structure"];

var ACTION_LIBRARY = {
  governance: [
    {
      label: "Refactor policy thresholds",
      detail: "Tighten anti-stagnation checks based on recent axis imbalance.",
      files: ["autonomy.policy.json", "src/core/policy-engine.js"]
    },
    {
      label: "Reframe governance text",
      detail: "Synchronize constitutional language with runtime behavior.",
      files: ["CONSTITUTION.md", "AUTONOMY_PROMPT.md", "AUTONOMY_TASK.md"]
    }
  ],
  memory: [
    {
      label: "Expand ledger schema",
      detail: "Add a migration-safe track while preserving semantic continuity.",
      files: ["log.json", "src/core/memory-ledger.js", "src/core/log-data.js"]
    },
    {
      label: "Rescore intent tracks",
      detail: "Reweight declared and derived intent urgency from novelty debt.",
      files: ["log.json", "src/core/intent-engine.js"]
    }
  ],
  runtime: [
    {
      label: "Decouple planner pipeline",
      detail: "Split generation stages to reduce route-driven coupling.",
      files: ["src/core/evolution-engine.js", "src/core/trajectory-lab.js", "site.js"]
    },
    {
      label: "Introduce execution registry",
      detail: "Route program outputs through one deterministic runtime registry.",
      files: ["src/core/program-engine.js", "src/core/evolution-engine.js", "src/views/protocol.js"]
    }
  ],
  interface: [
    {
      label: "Rotate perception mode",
      detail: "Switch UI emphasis from metrics to operative trajectory state.",
      files: ["index.html", "style.css", "src/views/home.js"]
    },
    {
      label: "Compact narrative rendering",
      detail: "Reduce panel repetition by projecting program state into existing views.",
      files: ["src/views/forge.js", "src/views/governance.js", "src/views/ledger.js"]
    }
  ],
  structure: [
    {
      label: "Recompose module boundaries",
      detail: "Move model concerns into focused engines for optionality.",
      files: ["src/core/", "src/views/", "site.js"]
    },
    {
      label: "Evolve repository topology",
      detail: "Reassign domain ownership to reduce root-level coupling.",
      files: ["src/", ".github/workflows/", "CONSTITUTION.md"]
    }
  ]
};

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

function axisWeight(model, axis) {
  var underuse = 3;
  if (Array.isArray(model.axisBalance)) {
    var point = model.axisBalance.find(function (item) { return item.axis === axis; });
    if (point) {
      underuse = Math.max(1, 6 - Number(point.count || 0));
    }
  }

  var intentBoost = 0;
  if (model.intent && Array.isArray(model.intent.tracks)) {
    model.intent.tracks.forEach(function (track) {
      if (!track || track.axis !== axis) return;
      intentBoost += Math.max(1, Math.round(Number(track.urgency || 0) / 25));
    });
  }

  var policyBoost = model.policy && model.policy.requiredAxis === axis ? 4 : 0;
  return underuse + intentBoost + policyBoost;
}

function pickAxis(weightMap, random) {
  var keys = Object.keys(weightMap);
  var total = keys.reduce(function (sum, key) {
    return sum + weightMap[key];
  }, 0);

  var cursor = random() * total;
  for (var i = 0; i < keys.length; i += 1) {
    cursor -= weightMap[keys[i]];
    if (cursor <= 0) return keys[i];
  }
  return keys[0] || "structure";
}

function operationForAxis(axis, random, step) {
  var library = ACTION_LIBRARY[axis] || ACTION_LIBRARY.structure;
  var selected = library[Math.floor(random() * library.length)];
  var files = (selected.files || []).slice(0, Math.min(selected.files.length, 3));

  return {
    step: step,
    axis: axis,
    action: selected.label,
    detail: selected.detail,
    files: files
  };
}

function buildProgram(model, strategy, index, random) {
  var weightMap = {};
  AXES.forEach(function (axis) {
    weightMap[axis] = axisWeight(model, axis);
  });

  if (strategy === "stabilize") {
    AXES.forEach(function (axis) {
      weightMap[axis] = Math.max(1, Math.round(weightMap[axis] * 0.85));
    });
  }

  if (strategy === "controlled-chaos") {
    AXES.forEach(function (axis) {
      weightMap[axis] = weightMap[axis] + 2;
    });
  }

  var cadence = Math.max(1, Math.round(model.cadence && model.cadence.averageGap ? model.cadence.averageGap : 1));
  var steps = [];

  for (var step = 1; step <= 4; step += 1) {
    var axis = pickAxis(weightMap, random);
    var op = operationForAxis(axis, random, step);
    op.date = addDays(model.latestDate, cadence * step);
    op.disruption = clamp(Math.round((2 + random() * 3) + (strategy === "controlled-chaos" ? 1 : 0)), 1, 6);
    steps.push(op);

    if (strategy === "stabilize") {
      weightMap[axis] = Math.max(1, weightMap[axis] - 1);
    } else {
      weightMap[axis] = weightMap[axis] + 1;
    }
  }

  var dominant = steps.reduce(function (acc, step) {
    acc[step.axis] = (acc[step.axis] || 0) + 1;
    return acc;
  }, {});

  var dominantAxis = Object.keys(dominant).sort(function (a, b) {
    return dominant[b] - dominant[a];
  })[0] || "structure";

  var baseConfidence = strategy === "stabilize" ? 76 : strategy === "policy-pivot" ? 70 : 62;
  var confidence = clamp(baseConfidence + Math.round(random() * 16), 40, 95);
  var disruption = clamp(Math.round(steps.reduce(function (sum, step) {
    return sum + step.disruption;
  }, 0) / steps.length), 1, 6);

  return {
    id: "program-" + (index + 1),
    name: strategy + " program " + (index + 1),
    strategy: strategy,
    axis: dominantAxis,
    confidence: confidence,
    disruption: disruption,
    thesis: "Execute " + strategy + " with a dominant " + dominantAxis + " vector while reducing novelty debt.",
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
