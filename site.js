import { loadLedger } from "./src/core/log-data.js";
import { buildEvolutionModel } from "./src/core/evolution-engine.js";
import { renderHome } from "./src/views/home.js";
import { renderHistory } from "./src/views/history.js";
import { renderConstellation } from "./src/views/constellation.js";
import { renderForge } from "./src/views/forge.js";
import { renderLedger } from "./src/views/ledger.js";
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

  var ledger = byId("ledger-summary");
  if (ledger) ledger.textContent = "Ledger unavailable.";
}

function boot(ledger) {
  var model = buildEvolutionModel(ledger);
  renderHome(model);
  renderHistory(model);
  renderConstellation(model);
  renderForge(model);
  renderLedger(model);
}

loadLedger("log.json")
  .then(boot)
  .catch(renderFailure);
