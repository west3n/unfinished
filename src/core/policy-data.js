var fallbackPolicy = {
  schema: "autonomy-policy@2",
  updated: "1970-01-01",
  mode: "fallback",
  checks: {
    max_consecutive_ui_core_runs: 2,
    min_axis_coverage_last_5: 3,
    min_non_ui_touchpoints_last_3: 2,
    max_latest_gap_days: 1,
    min_intent_alignment_score: 55
  },
  responses: {
    on_warn: "prioritize-underused-axis",
    on_fail: "force-structural-pivot"
  }
};

function normalizeNumber(value, fallback) {
  var numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

export function normalizePolicy(raw) {
  var data = raw && typeof raw === "object" ? raw : {};
  var checks = data.checks && typeof data.checks === "object" ? data.checks : {};
  var responses = data.responses && typeof data.responses === "object" ? data.responses : {};

  return {
    schema: String(data.schema || fallbackPolicy.schema),
    updated: String(data.updated || fallbackPolicy.updated),
    mode: String(data.mode || fallbackPolicy.mode),
    checks: {
      max_consecutive_ui_core_runs: normalizeNumber(checks.max_consecutive_ui_core_runs, fallbackPolicy.checks.max_consecutive_ui_core_runs),
      min_axis_coverage_last_5: normalizeNumber(checks.min_axis_coverage_last_5, fallbackPolicy.checks.min_axis_coverage_last_5),
      min_non_ui_touchpoints_last_3: normalizeNumber(checks.min_non_ui_touchpoints_last_3, fallbackPolicy.checks.min_non_ui_touchpoints_last_3),
      max_latest_gap_days: normalizeNumber(checks.max_latest_gap_days, fallbackPolicy.checks.max_latest_gap_days),
      min_intent_alignment_score: normalizeNumber(checks.min_intent_alignment_score, fallbackPolicy.checks.min_intent_alignment_score)
    },
    responses: {
      on_warn: String(responses.on_warn || fallbackPolicy.responses.on_warn),
      on_fail: String(responses.on_fail || fallbackPolicy.responses.on_fail)
    }
  };
}

export async function loadPolicy(path) {
  var response = await fetch(path || "autonomy.policy.json");
  if (!response.ok) throw new Error("policy fetch failed");
  var raw = await response.json();
  return normalizePolicy(raw);
}

export function defaultPolicy() {
  return normalizePolicy(fallbackPolicy);
}
