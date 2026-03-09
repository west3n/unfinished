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

function renderScenarioCards(scenarios, program) {
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

    if (program) {
      card.appendChild(create("p", "muted", "Execution program: " + program.name + " · " + program.strategy + " · confidence " + program.confidence + "."));
    }

    var list = create("ol", "protocol-steps");
    scenario.steps.forEach(function (step, index) {
      var merged = null;
      if (program && Array.isArray(program.steps) && program.steps.length) {
        merged = program.steps[index % program.steps.length];
      }

      var item = create("li", "");
      if (merged) {
        item.textContent = step.date + " · " + step.axis + " · D" + step.disruption + " · " + step.action +
          " | Program: " + merged.action + " [" + merged.axis + "]";
      } else {
        item.textContent = step.date + " · " + step.axis + " · D" + step.disruption + " · " + step.action;
      }
      if (step.operatorId) {
        item.textContent += " · op " + step.operatorId;
      }
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
  var leadIntent = model.intent && Array.isArray(model.intent.tracks) && model.intent.tracks.length
    ? model.intent.tracks[0].label + " (" + model.intent.tracks[0].axis + ")"
    : "none";
  var programCount = model.programSummary ? model.programSummary.count : 0;
  safeText(
    summary,
    "Detected " + phaseCount + " historical phase(s). Current policy mode: " +
    (model.policy ? model.policy.actionMode : "unconstrained") + ". Lead intent: " + leadIntent +
    ". Program tracks: " + programCount + "."
  );

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
    var program = model.programs && model.programs.find(function (item) {
      return item.strategy === selected;
    });
    if (!program && model.programSummary) {
      program = model.programSummary.primary;
    }
    renderScenarioCards(scenarios, program);
  }

  strategy.addEventListener("change", refresh);
  variance.addEventListener("input", refresh);
  regenerate.addEventListener("click", refresh);
  refresh();
}
