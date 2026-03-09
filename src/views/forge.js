import { byId, create, safeText } from "../shared/dom.js";
import { generateMutations } from "../core/evolution-engine.js";

function renderCandidateList(candidates, program) {
  var list = byId("forge-list");
  if (!list) return;
  list.innerHTML = "";

  if (!candidates.length) {
    list.appendChild(create("p", "muted", "No candidates available."));
    return;
  }

  candidates.forEach(function (candidate, index) {
    var item = create("article", "forge-item");
    item.appendChild(create("h3", "", candidate.title));
    item.appendChild(create("p", "forge-meta", "Axis: " + candidate.axis + " · Impact: " + candidate.predictedImpact + "% · Disruption: " + candidate.disruption + "/6"));
    item.appendChild(create("p", "muted", "Operator: " + (candidate.operatorId || "unknown") + " · Window: " + (candidate.date || "unscheduled")));
    item.appendChild(create("p", "", candidate.rationale));

    if (program && Array.isArray(program.steps) && program.steps[index % program.steps.length]) {
      var scheduled = program.steps[index % program.steps.length];
      item.appendChild(create("p", "muted", "Program step " + scheduled.step + " · " + scheduled.date));
    }

    var filesLabel = create("p", "", "Proposed touchpoints:");
    var ul = create("ul", "files");
    candidate.files.forEach(function (file) {
      ul.appendChild(create("li", "", file));
    });

    item.appendChild(filesLabel);
    item.appendChild(ul);
    list.appendChild(item);
  });
}

export function renderForge(model) {
  var summary = byId("forge-summary");
  var noveltyInput = byId("forge-novelty");
  var noveltyValue = byId("forge-novelty-value");
  var generateButton = byId("forge-generate");
  if (!summary || !noveltyInput || !noveltyValue || !generateButton) return;

  var risk = model.repetition.risk;
  var intentLine = model.intent
    ? " Intent debt: " + model.intent.noveltyDebt + ". Primary axis: " + model.intent.primaryAxis + "."
    : "";
  var program = model.programSummary && model.programSummary.primary ? model.programSummary.primary : null;

  if (model.policy) {
    safeText(
      summary,
      "Policy status: " + model.policy.status + " (" + model.policy.score + "/100). Target axis: " + model.policy.requiredAxis + ". " +
      model.repetition.details + intentLine +
      (program ? " Program anchor: " + program.name + " [" + program.strategy + ", C" + program.confidence + "]." : "")
    );
  } else {
    safeText(
      summary,
      "Repetition risk: " + risk + ". " + model.repetition.details + intentLine +
      (program ? " Program anchor: " + program.name + " [" + program.strategy + ", C" + program.confidence + "]." : "")
    );
  }

  function refresh() {
    var novelty = Number(noveltyInput.value);
    noveltyValue.textContent = novelty.toFixed(2);
    var candidates = generateMutations(model, { novelty: novelty, count: 5 });
    renderCandidateList(candidates, program);
  }

  generateButton.addEventListener("click", refresh);
  noveltyInput.addEventListener("input", refresh);
  refresh();
}
