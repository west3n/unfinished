var UI_CORE = ["index.html", "style.css", "site.js"];

function includesAny(list, needles) {
  return needles.some(function (needle) {
    return list.indexOf(needle) >= 0;
  });
}

function countConsecutiveUiCoreRuns(descEntries) {
  var count = 0;

  for (var i = 0; i < descEntries.length; i += 1) {
    var entry = descEntries[i];
    var files = Array.isArray(entry.files_changed) ? entry.files_changed : [];
    if (!files.length) break;

    var usesUiCore = includesAny(files, UI_CORE);
    var hasRuntimeOrStructure = files.some(function (file) {
      return file.indexOf("src/") === 0 || file.indexOf(".github/") === 0 || file.indexOf("CONSTITUTION") >= 0 || file.indexOf("AUTONOMY") >= 0;
    });

    if (usesUiCore && !hasRuntimeOrStructure) {
      count += 1;
      continue;
    }
    break;
  }

  return count;
}

function axisCoverage(entries, sampleSize) {
  var sample = entries.slice(0, sampleSize);
  var seen = {};
  sample.forEach(function (entry) {
    var axis = entry.axis || "structure";
    seen[axis] = true;
  });
  return Object.keys(seen).length;
}

function nonUiTouchpoints(entries, sampleSize) {
  var sample = entries.slice(0, sampleSize);
  var unique = {};

  sample.forEach(function (entry) {
    var files = Array.isArray(entry.files_changed) ? entry.files_changed : [];
    files.forEach(function (file) {
      if (UI_CORE.indexOf(file) === -1 && file !== "log.json") {
        unique[file] = true;
      }
    });
  });

  return Object.keys(unique).length;
}

function pickRequiredAxis(axisBalance) {
  if (!Array.isArray(axisBalance) || !axisBalance.length) return "structure";
  return axisBalance.slice().sort(function (a, b) {
    return a.count - b.count;
  })[0].axis;
}

function overallStatus(checks) {
  var hasFail = checks.some(function (check) { return check.status === "fail"; });
  if (hasFail) return "fail";

  var hasWarn = checks.some(function (check) { return check.status === "warn"; });
  if (hasWarn) return "warn";

  return "pass";
}

function scoreChecks(results) {
  if (!results.length) return 0;

  var points = results.reduce(function (sum, check) {
    if (check.status === "pass") return sum + 1;
    if (check.status === "warn") return sum + 0.55;
    return sum;
  }, 0);

  return Math.round((points / results.length) * 100);
}

export function evaluatePolicy(model, policy) {
  var checks = policy && policy.checks ? policy.checks : {};
  var descEntries = Array.isArray(model.descEntries) ? model.descEntries : [];

  var consecutiveUiCore = countConsecutiveUiCoreRuns(descEntries);
  var recentCoverage = axisCoverage(descEntries, 5);
  var recentNonUiTouchpoints = nonUiTouchpoints(descEntries, 3);
  var latestGap = model && model.cadence ? model.cadence.latestGap : 0;
  var intentAlignment = model && model.intent && typeof model.intent.alignmentScore === "number"
    ? model.intent.alignmentScore
    : 50;
  var minIntentAlignment = typeof checks.min_intent_alignment_score === "number"
    ? checks.min_intent_alignment_score
    : 55;

  var programTracks = model && model.programSummary && typeof model.programSummary.count === "number"
    ? model.programSummary.count
    : 0;
  var minProgramTracks = typeof checks.min_program_tracks === "number"
    ? checks.min_program_tracks
    : 1;

  var programConfidence = model && model.programSummary && typeof model.programSummary.averageConfidence === "number"
    ? model.programSummary.averageConfidence
    : 0;
  var minProgramConfidence = typeof checks.min_program_confidence === "number"
    ? checks.min_program_confidence
    : 60;

  var operatorDiversity = model && model.operatorSummary && model.operatorSummary.byAxis
    ? Object.keys(model.operatorSummary.byAxis).length
    : 0;
  var minOperatorDiversity = typeof checks.min_operator_axis_diversity === "number"
    ? checks.min_operator_axis_diversity
    : 3;

  var results = [
    {
      id: "ui-core-repetition",
      label: "Consecutive UI-core runs",
      value: consecutiveUiCore,
      threshold: checks.max_consecutive_ui_core_runs,
      status: consecutiveUiCore > checks.max_consecutive_ui_core_runs ? "fail" : consecutiveUiCore === checks.max_consecutive_ui_core_runs ? "warn" : "pass",
      detail: "Recent consecutive UI-centric runs: " + consecutiveUiCore + " (max " + checks.max_consecutive_ui_core_runs + ")."
    },
    {
      id: "axis-coverage",
      label: "Axis coverage (last 5)",
      value: recentCoverage,
      threshold: checks.min_axis_coverage_last_5,
      status: recentCoverage < checks.min_axis_coverage_last_5 ? "fail" : recentCoverage === checks.min_axis_coverage_last_5 ? "warn" : "pass",
      detail: "Distinct axes in last 5 entries: " + recentCoverage + " (target " + checks.min_axis_coverage_last_5 + "+)."
    },
    {
      id: "non-ui-touchpoints",
      label: "Non-UI touchpoints (last 3)",
      value: recentNonUiTouchpoints,
      threshold: checks.min_non_ui_touchpoints_last_3,
      status: recentNonUiTouchpoints < checks.min_non_ui_touchpoints_last_3 ? "fail" : recentNonUiTouchpoints === checks.min_non_ui_touchpoints_last_3 ? "warn" : "pass",
      detail: "Unique non-UI files touched in last 3 entries: " + recentNonUiTouchpoints + " (target " + checks.min_non_ui_touchpoints_last_3 + "+)."
    },
    {
      id: "cadence-gap",
      label: "Latest cadence gap",
      value: latestGap,
      threshold: checks.max_latest_gap_days,
      status: latestGap > checks.max_latest_gap_days ? "fail" : latestGap === checks.max_latest_gap_days ? "warn" : "pass",
      detail: "Days since latest entry: " + latestGap + " (max " + checks.max_latest_gap_days + ")."
    },
    {
      id: "intent-alignment",
      label: "Intent alignment score",
      value: intentAlignment,
      threshold: minIntentAlignment,
      status: intentAlignment < minIntentAlignment ? "fail" : intentAlignment < (minIntentAlignment + 10) ? "warn" : "pass",
      detail: "Derived intent alignment: " + intentAlignment + " (target " + minIntentAlignment + "+)."
    },
    {
      id: "program-tracks",
      label: "Program track count",
      value: programTracks,
      threshold: minProgramTracks,
      status: programTracks < minProgramTracks ? "fail" : programTracks === minProgramTracks ? "warn" : "pass",
      detail: "Available execution programs: " + programTracks + " (target " + minProgramTracks + "+)."
    },
    {
      id: "program-confidence",
      label: "Program confidence",
      value: programConfidence,
      threshold: minProgramConfidence,
      status: programConfidence < minProgramConfidence ? "fail" : programConfidence < (minProgramConfidence + 8) ? "warn" : "pass",
      detail: "Average program confidence: " + programConfidence + " (target " + minProgramConfidence + "+)."
    },
    {
      id: "operator-diversity",
      label: "Operator axis diversity",
      value: operatorDiversity,
      threshold: minOperatorDiversity,
      status: operatorDiversity < minOperatorDiversity ? "fail" : operatorDiversity === minOperatorDiversity ? "warn" : "pass",
      detail: "Distinct axes in active operator plan: " + operatorDiversity + " (target " + minOperatorDiversity + "+)."
    }
  ];

  var status = overallStatus(results);
  var score = scoreChecks(results);

  var requiredAxis = pickRequiredAxis(model.axisBalance);
  var actionMode = status === "fail"
    ? (policy.responses && policy.responses.on_fail ? policy.responses.on_fail : "force-structural-pivot")
    : status === "warn"
      ? (policy.responses && policy.responses.on_warn ? policy.responses.on_warn : "prioritize-underused-axis")
      : "maintain-diversification";

  var intent = status === "pass"
    ? "Policy intact. Continue broad-axis evolution with measured volatility."
    : status === "warn"
      ? "Policy warning. Prefer underused axis: " + requiredAxis + " and reinforce viable programs."
      : "Policy breach. Force pivot into " + requiredAxis + " axis with non-UI touchpoints and stronger programs.";

  return {
    schema: policy.schema || "autonomy-policy@1",
    updated: policy.updated || "unknown",
    mode: policy.mode || "unknown",
    status: status,
    score: score,
    checks: results,
    requiredAxis: requiredAxis,
    actionMode: actionMode,
    intent: intent
  };
}
