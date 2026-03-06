var AXES = ["governance", "memory", "runtime", "interface", "structure"];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toMap(axisBalance) {
  var map = {};
  AXES.forEach(function (axis) {
    map[axis] = 0;
  });

  (axisBalance || []).forEach(function (item) {
    if (!item || !item.axis) return;
    map[item.axis] = Number(item.count || 0);
  });

  return map;
}

function underusedAxes(axisBalance) {
  return (axisBalance || [])
    .slice()
    .sort(function (a, b) {
      return a.count - b.count;
    })
    .slice(0, 2)
    .map(function (item) {
      return item.axis;
    });
}

function continuityPressure(cadence) {
  var latestGap = cadence && typeof cadence.latestGap === "number" ? cadence.latestGap : 0;
  var averageGap = cadence && typeof cadence.averageGap === "number" ? cadence.averageGap : 1;
  var ratio = averageGap > 0 ? latestGap / averageGap : latestGap;
  return clamp(Math.round(ratio * 55), 0, 100);
}

function noveltyDebt(repetition, axisBalance) {
  var base = repetition && repetition.risk === "high"
    ? 65
    : repetition && repetition.risk === "medium"
      ? 40
      : 20;

  var map = toMap(axisBalance);
  var spread = Object.keys(map).reduce(function (acc, axis) {
    return acc + (map[axis] === 0 ? 1 : 0);
  }, 0);

  return clamp(base + spread * 10, 0, 100);
}

function deriveTrack(seed) {
  var axis = seed.axis;
  var urgency = seed.urgency;

  if (axis === "runtime") {
    return {
      id: "intent-runtime-pipeline",
      axis: axis,
      label: "Runtime decomposition",
      urgency: urgency,
      reason: "Decouple data transforms and planners so behavior can mutate without route churn."
    };
  }

  if (axis === "memory") {
    return {
      id: "intent-memory-semantic",
      axis: axis,
      label: "Memory semantic expansion",
      urgency: urgency,
      reason: "Increase memory expressiveness by tracking declared intents alongside entries and events."
    };
  }

  if (axis === "governance") {
    return {
      id: "intent-governance-adaptive",
      axis: axis,
      label: "Adaptive governance",
      urgency: urgency,
      reason: "Shift policy from static thresholds to intent-aware checks and response modes."
    };
  }

  if (axis === "interface") {
    return {
      id: "intent-interface-diversify",
      axis: axis,
      label: "Perception diversification",
      urgency: urgency,
      reason: "Avoid metric-panel repetition by rotating representation modes across existing routes."
    };
  }

  return {
    id: "intent-structure-optionality",
    axis: "structure",
    label: "Structural optionality",
    urgency: urgency,
    reason: "Preserve pivot freedom with modular boundaries and low-friction component movement."
  };
}

function normalizeDeclaredIntent(intent, index) {
  var id = String(intent && intent.id ? intent.id : "declared-intent-" + String(index + 1).padStart(2, "0"));
  var axis = String(intent && intent.axis ? intent.axis : "structure");
  return {
    id: id,
    axis: axis,
    label: String(intent && intent.label ? intent.label : "Unnamed intent"),
    urgency: clamp(Math.round(Number(intent && intent.urgency ? intent.urgency : 50)), 1, 100),
    reason: String(intent && intent.reason ? intent.reason : "No reason supplied."),
    source: "declared"
  };
}

export function deriveIntentSignals(model) {
  var axisBalance = model && Array.isArray(model.axisBalance) ? model.axisBalance : [];
  var repetition = model && model.repetition ? model.repetition : { risk: "low" };
  var cadence = model && model.cadence ? model.cadence : { latestGap: 0, averageGap: 1 };
  var declared = model && Array.isArray(model.intents) ? model.intents : [];

  var continuity = continuityPressure(cadence);
  var debt = noveltyDebt(repetition, axisBalance);
  var diversificationNeed = clamp(Math.round((continuity * 0.35) + (debt * 0.65)), 0, 100);

  var candidates = underusedAxes(axisBalance).map(function (axis, index) {
    return deriveTrack({
      axis: axis,
      urgency: clamp(Math.round(diversificationNeed - index * 12), 25, 95)
    });
  });

  var defaultTrack = deriveTrack({
    axis: "runtime",
    urgency: clamp(Math.round(50 + debt * 0.3), 35, 90)
  });

  var derived = candidates.length ? candidates : [defaultTrack];

  var declaredNormalized = declared.map(normalizeDeclaredIntent);
  var merged = declaredNormalized.concat(derived)
    .reduce(function (acc, item) {
      if (!acc.some(function (existing) { return existing.id === item.id; })) {
        acc.push(item);
      }
      return acc;
    }, [])
    .sort(function (a, b) {
      return b.urgency - a.urgency;
    })
    .slice(0, 4);

  return {
    continuityPressure: continuity,
    noveltyDebt: debt,
    diversificationNeed: diversificationNeed,
    tracks: merged,
    primaryAxis: merged.length ? merged[0].axis : "structure",
    alignmentScore: clamp(100 - Math.round((continuity * 0.4) + (debt * 0.5)), 0, 100)
  };
}
