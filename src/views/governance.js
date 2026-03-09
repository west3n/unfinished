import { byId, create, safeText } from "../shared/dom.js";
import { generateMutations } from "../core/evolution-engine.js";

function renderChecks(policy) {
  var checks = byId("governance-checks");
  if (!checks) return;

  checks.innerHTML = "";
  if (!policy || !Array.isArray(policy.checks) || !policy.checks.length) {
    checks.appendChild(create("li", "muted", "Policy checks unavailable."));
    return;
  }

  policy.checks.forEach(function (check) {
    var item = create("li", "governance-check governance-" + check.status);
    item.appendChild(create("h3", "", check.label));
    item.appendChild(create("p", "muted", check.detail));
    checks.appendChild(item);
  });
}

function renderPriority(model) {
  var root = byId("governance-priority");
  if (!root) return;

  root.innerHTML = "";
  var candidates = generateMutations(model, { novelty: 0.68, count: 3 });
  var program = model.programs && model.programs.find(function (item) {
    return model.policy && item.axis === model.policy.requiredAxis;
  });
  if (!program && model.programSummary) {
    program = model.programSummary.primary;
  }

  if (!candidates.length) {
    root.appendChild(create("p", "muted", "No policy-driven mutation candidates available."));
    return;
  }

  candidates.forEach(function (candidate) {
    var item = create("article", "forge-item");
    item.appendChild(create("h3", "", candidate.title));
    item.appendChild(create("p", "forge-meta", "Axis: " + candidate.axis + " · Impact: " + candidate.predictedImpact + "%"));
    item.appendChild(create("p", "", candidate.rationale));
    if (program) {
      item.appendChild(create("p", "muted", "Program: " + program.name + " (" + program.strategy + ", confidence " + program.confidence + ")."));
    }
    root.appendChild(item);
  });
}

export function renderGovernance(model) {
  var summary = byId("governance-summary");
  var schema = byId("governance-schema");
  var score = byId("governance-score");
  var status = byId("governance-status");
  var mode = byId("governance-mode");

  if (!summary || !schema || !score || !status || !mode) return;

  if (!model.policy) {
    safeText(summary, "No governance policy loaded.");
    safeText(schema, "--");
    safeText(score, "--");
    safeText(status, "unknown");
    safeText(mode, "--");
    renderChecks(null);
    renderPriority(model);
    return;
  }

  var program = model.programSummary && model.programSummary.primary
    ? " Program anchor: " + model.programSummary.primary.name + " (" + model.programSummary.primary.strategy + ")."
    : "";
  var operatorLine = model.operatorSummary
    ? " Operator axes: " + Object.keys(model.operatorSummary.byAxis || {}).length + "."
    : "";
  safeText(summary, model.policy.intent + program + operatorLine);
  safeText(schema, model.policy.schema + " (" + model.policy.updated + ")");
  var intentAlignment = model.intent ? model.intent.alignmentScore : null;
  safeText(score, String(model.policy.score) + (intentAlignment !== null ? " · intent " + intentAlignment : ""));
  safeText(status, model.policy.status);
  safeText(mode, model.policy.actionMode);

  renderChecks(model.policy);
  renderPriority(model);
}
