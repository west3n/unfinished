import { byId, create, safeText } from "../shared/dom.js";
import { generateScenarios } from "../core/evolution-engine.js";
import { dayDelta } from "../shared/time.js";

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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  if (!values.length) return 0;
  var total = values.reduce(function (sum, value) {
    return sum + value;
  }, 0);
  return total / values.length;
}

function runDisruption(run) {
  var files = typeof run.filesChanged === "number"
    ? run.filesChanged
    : (Array.isArray(run.files_changed) ? run.files_changed.length : 0);
  return clamp(Math.round(files / 2), 1, 9);
}

function recentWindow(runs, count) {
  if (!Array.isArray(runs) || !runs.length) return [];
  var size = Math.max(1, count);
  return runs.slice(Math.max(0, runs.length - size));
}

function toAxisSet(items, key) {
  return items.reduce(function (acc, item) {
    var axis = item[key] || "structure";
    acc[axis] = true;
    return acc;
  }, {});
}

function verdictFromScores(positionalAxisFit, overlapFit, disruptionFit, cadenceFit) {
  var score = positionalAxisFit * 0.4 + overlapFit * 0.25 + disruptionFit * 0.2 + cadenceFit * 0.15;
  if (score >= 0.76) return "Strong fit";
  if (score >= 0.5) return "Elastic fit";
  return "Hard break";
}

function renderBacktest(model, scenarios) {
  var root = byId("protocol-backtest");
  var select = byId("protocol-backtest-scenario");
  var windowInput = byId("protocol-backtest-window");
  var windowValue = byId("protocol-backtest-window-value");
  if (!root || !select || !windowInput || !windowValue) return;

  function seedScenarioOptions() {
    var previous = select.value;
    select.innerHTML = "";

    scenarios.forEach(function (scenario) {
      var option = create("option", "", scenario.name + " (" + scenario.strategy + ")");
      option.value = scenario.id;
      select.appendChild(option);
    });

    if (previous && scenarios.some(function (scenario) { return scenario.id === previous; })) {
      select.value = previous;
    } else if (scenarios.length) {
      select.value = scenarios[0].id;
    }
  }

  function refreshBacktest() {
    root.innerHTML = "";
    windowValue.textContent = windowInput.value;

    if (!scenarios.length) {
      root.appendChild(create("p", "muted", "No scenarios available for backtest."));
      return;
    }

    var scenario = scenarios.find(function (item) {
      return item.id === select.value;
    }) || scenarios[0];
    if (!scenario) {
      root.appendChild(create("p", "muted", "Pick a scenario to run backtest."));
      return;
    }

    var desiredWindow = Number(windowInput.value);
    var history = recentWindow(model.timeline, desiredWindow);
    if (history.length < 2) {
      root.appendChild(create("p", "muted", "Need at least two real runs to compute a backtest."));
      return;
    }

    var stepCount = scenario.steps.length;
    var sampledHistory = history.slice(Math.max(0, history.length - stepCount));

    var alignedSteps = Math.min(sampledHistory.length, stepCount);
    var positionalAxisMatches = 0;
    for (var i = 0; i < alignedSteps; i += 1) {
      if ((sampledHistory[i].axis || "structure") === (scenario.steps[i].axis || "structure")) {
        positionalAxisMatches += 1;
      }
    }
    var positionalAxisFit = alignedSteps ? positionalAxisMatches / alignedSteps : 0;

    var scenarioAxisSet = toAxisSet(scenario.steps, "axis");
    var historyAxisSet = toAxisSet(sampledHistory, "axis");
    var overlapCount = Object.keys(scenarioAxisSet).filter(function (axis) {
      return historyAxisSet[axis];
    }).length;
    var maxAxisCardinality = Math.max(Object.keys(scenarioAxisSet).length, Object.keys(historyAxisSet).length, 1);
    var overlapFit = overlapCount / maxAxisCardinality;

    var scenarioDisruptionAvg = average(scenario.steps.map(function (step) {
      return Number(step.disruption) || 0;
    }));
    var historyDisruptionAvg = average(sampledHistory.map(runDisruption));
    var disruptionDiff = Math.abs(scenarioDisruptionAvg - historyDisruptionAvg);
    var disruptionFit = clamp(1 - disruptionDiff / 8, 0, 1);

    var historyGaps = [];
    for (var gapIndex = 1; gapIndex < history.length; gapIndex += 1) {
      historyGaps.push(Math.abs(dayDelta(history[gapIndex - 1].date, history[gapIndex].date)));
    }
    var historyCadence = average(historyGaps);

    var scenarioGaps = [];
    for (var scenarioGapIndex = 1; scenarioGapIndex < scenario.steps.length; scenarioGapIndex += 1) {
      scenarioGaps.push(Math.abs(dayDelta(scenario.steps[scenarioGapIndex - 1].date, scenario.steps[scenarioGapIndex].date)));
    }
    var scenarioCadence = average(scenarioGaps);
    var cadenceDiff = Math.abs(historyCadence - scenarioCadence);
    var cadenceFit = clamp(1 - cadenceDiff / 6, 0, 1);

    var verdict = verdictFromScores(positionalAxisFit, overlapFit, disruptionFit, cadenceFit);
    root.appendChild(create("p", "protocol-backtest-verdict", "Backtest verdict: " + verdict + "."));

    var stats = create("ul", "protocol-steps");
    stats.appendChild(create("li", "", "Axis sequence match: " + Math.round(positionalAxisFit * 100) + "% over " + alignedSteps + " aligned step(s)."));
    stats.appendChild(create("li", "", "Axis overlap: " + overlapCount + " shared axis(es), fit " + Math.round(overlapFit * 100) + "%."));
    stats.appendChild(create("li", "", "Disruption drift: " + Math.abs(scenarioDisruptionAvg - historyDisruptionAvg).toFixed(2) + " (scenario " + scenarioDisruptionAvg.toFixed(2) + " vs real " + historyDisruptionAvg.toFixed(2) + ")."));
    stats.appendChild(create("li", "", "Cadence drift: " + cadenceDiff.toFixed(2) + " day(s) (scenario " + scenarioCadence.toFixed(2) + " vs real " + historyCadence.toFixed(2) + ")."));
    root.appendChild(stats);
  }

  seedScenarioOptions();
  select.onchange = refreshBacktest;
  windowInput.oninput = refreshBacktest;
  refreshBacktest();
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
    renderBacktest(model, scenarios);
  }

  strategy.addEventListener("change", refresh);
  variance.addEventListener("input", refresh);
  regenerate.addEventListener("click", refresh);
  refresh();
}
