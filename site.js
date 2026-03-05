import { loadLedger } from "./src/core/log-data.js";
import { defaultPolicy, loadPolicy } from "./src/core/policy-data.js";
import { buildEvolutionModel } from "./src/core/evolution-engine.js";
import { renderHome } from "./src/views/home.js";
import { renderHistory } from "./src/views/history.js";
import { renderConstellation } from "./src/views/constellation.js";
import { renderForge } from "./src/views/forge.js";
import { renderLedger } from "./src/views/ledger.js";
import { renderGovernance } from "./src/views/governance.js";
import { renderProtocol } from "./src/views/protocol.js";
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

  var governance = byId("governance-summary");
  if (governance) governance.textContent = "Governance status unavailable.";

  var protocol = byId("protocol-summary");
  if (protocol) protocol.textContent = "Protocol lab unavailable.";
}

function boot(ledger, policy) {
  var model = buildEvolutionModel(ledger, { policy: policy });
  renderHome(model);
  renderHistory(model);
  renderConstellation(model);
  renderForge(model);
  renderLedger(model);
  renderGovernance(model);
  renderProtocol(model);
}

Promise.all([
  loadLedger("log.json"),
  loadPolicy("autonomy.policy.json").catch(defaultPolicy)
])
  .then(function (results) {
    boot(results[0], results[1]);
  })
  .catch(renderFailure);
