import { byId, create, safeText } from "../shared/dom.js";
import { generateScenarios } from "../core/evolution-engine.js";

function renderPhases(model) {
  var list = byId("protocol-phases");
  if (!list) return;

  list.innerHTML = "";
  if (!Array.isArray(model.phases) || !model.phases.length) {
    list.appendChild(create("p", "muted", "No phases detected."));
    return;
  }

  model.phases.forEach(function (phase) {
    var item = create("article", "protocol-phase");
    item.appendChild(create("h3", "", phase.label + " · " + phase.startDate + " -> " + phase.endDate));
    item.appendChild(create("p", "protocol-meta", "Axis: " + phase.dominantAxis + " · Runs: " + phase.runCount + " · Avg files: " + phase.avgFiles + " · Novelty: " + phase.novelty + "%"));
    item.appendChild(create("p", "", phase.summary));
    list.appendChild(item);
  });
}

function renderScenarioCards(scenarios) {
  var root = byId("protocol-scenarios");
  if (!root) return;

  root.innerHTML = "";
  if (!scenarios.length) {
    root.appendChild(create("p", "muted", "No scenarios available."));
    return;
  }

  scenarios.forEach(function (scenario) {
    var card = create("article", "protocol-scenario");
    card.appendChild(create("h3", "", scenario.name));
    card.appendChild(create("p", "protocol-meta", "Risk: " + scenario.risk + " · Confidence: " + scenario.confidence + "% · Axis coverage: " + scenario.axisCoverage));
    card.appendChild(create("p", "", scenario.thesis));

    var list = create("ol", "protocol-steps");
    scenario.steps.forEach(function (step) {
      var item = create("li", "");
      item.textContent = step.date + " · " + step.axis + " · D" + step.disruption + " · " + step.action;
      list.appendChild(item);
    });

    card.appendChild(list);
    root.appendChild(card);
  });
}

export function renderProtocol(model) {
  var summary = byId("protocol-summary");
  var strategy = byId("protocol-strategy");
  var variance = byId("protocol-variance");
  var varianceValue = byId("protocol-variance-value");
  var regenerate = byId("protocol-regenerate");

  if (!summary || !strategy || !variance || !varianceValue || !regenerate) return;

  var phaseCount = Array.isArray(model.phases) ? model.phases.length : 0;
  safeText(summary, "Detected " + phaseCount + " historical phase(s). Current policy mode: " + (model.policy ? model.policy.actionMode : "unconstrained") + ".");

  renderPhases(model);

  function refresh() {
    var selected = strategy.value;
    var varianceLevel = Number(variance.value);
    varianceValue.textContent = varianceLevel.toFixed(2);
    var scenarios = generateScenarios(model, {
      strategy: selected,
      variance: varianceLevel,
      count: 3
    });
    renderScenarioCards(scenarios);
  }

  strategy.addEventListener("change", refresh);
  variance.addEventListener("input", refresh);
  regenerate.addEventListener("click", refresh);
  refresh();
}
