import { hashSeed, seededRandom } from "../shared/random.js";

var OPERATOR_LIBRARY = [
  {
    id: "gov-threshold-rewire",
    axis: "governance",
    name: "Rewire policy thresholds",
    detail: "Retune anti-stagnation thresholds against current axis pressure and cadence drift.",
    files: ["autonomy.policy.json", "src/core/policy-engine.js", "src/core/policy-data.js"],
    strategies: ["policy-pivot", "stabilize"],
    impact: 72,
    disruption: 3
  },
  {
    id: "gov-language-sync",
    axis: "governance",
    name: "Synchronize governance language",
    detail: "Align constitutional and autonomy prompts with executable behavior.",
    files: ["CONSTITUTION.md", "AUTONOMY_PROMPT.md", "AUTONOMY_TASK.md"],
    strategies: ["policy-pivot", "controlled-chaos"],
    impact: 61,
    disruption: 2
  },
  {
    id: "mem-schema-extension",
    axis: "memory",
    name: "Extend ledger schema track",
    detail: "Add a migration-safe memory track while preserving continuity of prior semantics.",
    files: ["log.json", "src/core/memory-ledger.js", "src/core/log-data.js"],
    strategies: ["policy-pivot", "controlled-chaos"],
    impact: 78,
    disruption: 4
  },
  {
    id: "mem-intent-reweight",
    axis: "memory",
    name: "Reweight intent tracks",
    detail: "Update declared urgency scoring to reflect novelty debt and continuity pressure.",
    files: ["log.json", "src/core/intent-engine.js"],
    strategies: ["stabilize", "policy-pivot"],
    impact: 66,
    disruption: 3
  },
  {
    id: "run-pipeline-decouple",
    axis: "runtime",
    name: "Decouple planner pipeline",
    detail: "Split planner stages to isolate generation, ranking, and projection responsibilities.",
    files: ["src/core/evolution-engine.js", "src/core/trajectory-lab.js", "site.js"],
    strategies: ["policy-pivot", "controlled-chaos"],
    impact: 79,
    disruption: 4
  },
  {
    id: "run-operator-mesh",
    axis: "runtime",
    name: "Route planning through operator mesh",
    detail: "Use one operator registry for mutation, program, and scenario synthesis.",
    files: ["src/core/mutation-operators.js", "src/core/program-engine.js", "src/core/evolution-engine.js"],
    strategies: ["policy-pivot", "controlled-chaos", "stabilize"],
    impact: 84,
    disruption: 4
  },
  {
    id: "run-noise-injection",
    axis: "runtime",
    name: "Inject bounded axis noise",
    detail: "Perturb planner selection under bounded variance to test resilience without collapse.",
    files: ["src/core/program-engine.js", "src/core/trajectory-lab.js", "src/core/mutation-operators.js"],
    strategies: ["controlled-chaos"],
    impact: 73,
    disruption: 5
  },
  {
    id: "ui-perception-rotation",
    axis: "interface",
    name: "Rotate observer perception mode",
    detail: "Rebalance interface emphasis from metrics toward trajectory operations.",
    files: ["index.html", "style.css", "src/views/home.js"],
    strategies: ["policy-pivot", "stabilize"],
    impact: 58,
    disruption: 2
  },
  {
    id: "ui-narrative-compaction",
    axis: "interface",
    name: "Compact narrative rendering",
    detail: "Reduce route-level repetition by projecting one shared operational narrative.",
    files: ["src/views/forge.js", "src/views/protocol.js", "src/views/governance.js"],
    strategies: ["stabilize", "policy-pivot"],
    impact: 56,
    disruption: 2
  },
  {
    id: "str-module-recluster",
    axis: "structure",
    name: "Recluster module ownership",
    detail: "Move engine boundaries to increase extraction optionality.",
    files: ["src/core/", "src/views/", "site.js"],
    strategies: ["controlled-chaos", "policy-pivot"],
    impact: 77,
    disruption: 5
  },
  {
    id: "str-topology-shift",
    axis: "structure",
    name: "Shift repository topology",
    detail: "Realign directory ownership and workflow coupling for long-term adaptability.",
    files: ["src/", ".github/workflows/", "CONSTITUTION.md"],
    strategies: ["controlled-chaos"],
    impact: 75,
    disruption: 5
  }
];

var AXES = ["governance", "memory", "runtime", "interface", "structure"];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function axisScarcity(model) {
  var scarcity = {};
  AXES.forEach(function (axis) {
    scarcity[axis] = 3;
  });

  if (model && Array.isArray(model.axisBalance)) {
    model.axisBalance.forEach(function (item) {
      scarcity[item.axis] = Math.max(1, 7 - Number(item.count || 0));
    });
  }

  return scarcity;
}

function scoreOperator(operator, context) {
  var score = operator.impact * 0.8;

  if (context.strategy && operator.strategies.indexOf(context.strategy) >= 0) {
    score += 24;
  }

  score += (context.scarcity[operator.axis] || 1) * 4;

  if (context.targetAxis && context.targetAxis === operator.axis) {
    score += 14;
  }

  if (context.requiredAxis && context.requiredAxis === operator.axis) {
    score += 12;
  }

  if (context.novelty >= 0.75) {
    score += operator.impact * 0.16 + operator.disruption * 2;
  } else {
    score += (7 - operator.disruption) * 3;
  }

  if (context.variance >= 0.72 && operator.disruption >= 4) {
    score += 8;
  }

  return score;
}

function pickWeighted(list, context, random) {
  var weighted = list.map(function (operator) {
    return {
      operator: operator,
      weight: Math.max(1, Math.round(scoreOperator(operator, context) + random() * 10))
    };
  });

  var total = weighted.reduce(function (sum, item) {
    return sum + item.weight;
  }, 0);

  var cursor = random() * total;
  for (var i = 0; i < weighted.length; i += 1) {
    cursor -= weighted[i].weight;
    if (cursor <= 0) return weighted[i].operator;
  }

  return weighted.length ? weighted[weighted.length - 1].operator : null;
}

export function selectOperators(model, options) {
  if (!model || !Array.isArray(model.entries) || !model.entries.length) return [];

  var strategy = options && options.strategy ? options.strategy : "policy-pivot";
  var count = options && typeof options.count === "number" ? Math.max(1, options.count) : 4;
  var novelty = options && typeof options.novelty === "number" ? options.novelty : 0.65;
  var variance = options && typeof options.variance === "number" ? options.variance : 0.55;
  var targetAxis = options && options.targetAxis ? options.targetAxis : null;
  var requiredAxis = model.policy ? model.policy.requiredAxis : null;

  var seed = [
    model.latestDate,
    strategy,
    novelty.toFixed(2),
    variance.toFixed(2),
    targetAxis || "none",
    model.entries.length
  ].join("|");
  var random = seededRandom(hashSeed(seed));

  var context = {
    strategy: strategy,
    novelty: novelty,
    variance: variance,
    targetAxis: targetAxis,
    requiredAxis: requiredAxis,
    scarcity: axisScarcity(model)
  };

  var pool = OPERATOR_LIBRARY.slice();
  var selected = [];

  while (selected.length < count && pool.length) {
    var picked = pickWeighted(pool, context, random);
    if (!picked) break;

    selected.push({
      id: picked.id,
      axis: picked.axis,
      name: picked.name,
      detail: picked.detail,
      files: picked.files.slice(0, 4),
      impact: clamp(Math.round(picked.impact + random() * 14 - 4), 35, 96),
      disruption: clamp(Math.round(picked.disruption + random() * 2 - 0.3), 1, 6),
      strategies: picked.strategies.slice(0)
    });

    pool = pool.filter(function (item) {
      return item.id !== picked.id;
    });
  }

  return selected;
}

export function summarizeOperators(operators) {
  var byAxis = {};
  var byStrategy = {};

  (operators || []).forEach(function (operator) {
    if (!operator) return;
    var axis = operator.axis || "structure";
    byAxis[axis] = (byAxis[axis] || 0) + 1;

    var strategies = Array.isArray(operator.strategies) ? operator.strategies : [];
    strategies.forEach(function (strategy) {
      byStrategy[strategy] = (byStrategy[strategy] || 0) + 1;
    });
  });

  return {
    count: Array.isArray(operators) ? operators.length : 0,
    byAxis: byAxis,
    byStrategy: byStrategy
  };
}

export function operatorLibrary() {
  return OPERATOR_LIBRARY.slice();
}
