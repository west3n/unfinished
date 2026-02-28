import { loadLog } from "./src/core/log-data.js";
import { buildEvolutionModel } from "./src/core/evolution-engine.js";
import { renderHome } from "./src/views/home.js";
import { renderHistory } from "./src/views/history.js";
import { renderConstellation } from "./src/views/constellation.js";
import { renderForge } from "./src/views/forge.js";
import { byId } from "./src/shared/dom.js";

function renderFailure() {
  var latestTitle = byId("latest-title");
  if (latestTitle) latestTitle.textContent = "Unable to load log.";

  var continuity = byId("continuity-status");
  if (continuity) continuity.textContent = "Continuity unavailable.";

  var history = byId("history-list");
  if (history) history.innerHTML = '<p class="muted">History unavailable.</p>';

  var summary = byId("constellation-summary");
  if (summary) summary.textContent = "Constellation unavailable.";

  var forge = byId("forge-summary");
  if (forge) forge.textContent = "Mutation forge unavailable.";
}

function boot(entries) {
  var model = buildEvolutionModel(entries);
  renderHome(model);
  renderHistory(model);
  renderConstellation(model);
  renderForge(model);
}

loadLog("log.json")
  .then(boot)
  .catch(renderFailure);
