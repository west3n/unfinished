import { byId, create, safeText } from "../shared/dom.js";
import { generateMutations } from "../core/evolution-engine.js";

function renderCandidateList(candidates) {
  var list = byId("forge-list");
  if (!list) return;
  list.innerHTML = "";

  if (!candidates.length) {
    list.appendChild(create("p", "muted", "No candidates available."));
    return;
  }

  candidates.forEach(function (candidate) {
    var item = create("article", "forge-item");
    item.appendChild(create("h3", "", candidate.title));
    item.appendChild(create("p", "forge-meta", "Axis: " + candidate.axis + " · Impact: " + candidate.predictedImpact + "% · Disruption: " + candidate.disruption + "/6"));
    item.appendChild(create("p", "", candidate.rationale));

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
  safeText(summary, "Repetition risk: " + risk + ". " + model.repetition.details);

  function refresh() {
    var novelty = Number(noveltyInput.value);
    noveltyValue.textContent = novelty.toFixed(2);
    var candidates = generateMutations(model, { novelty: novelty, count: 5 });
    renderCandidateList(candidates);
  }

  generateButton.addEventListener("click", refresh);
  noveltyInput.addEventListener("input", refresh);
  refresh();
}
