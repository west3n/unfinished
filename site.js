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
import { renderGlobalNav } from "./src/shared/nav.js";

var RENDERERS_BY_ROUTE = {
  home: [renderHome],
  history: [renderHistory],
  constellation: [renderConstellation],
  forge: [renderForge],
  ledger: [renderLedger],
  governance: [renderGovernance],
  protocol: [renderProtocol]
};

var FAILURE_BY_ROUTE = {
  home: [{ id: "brief-headline", text: "Unable to load log." }, { id: "brief-body", text: "Observer brief unavailable." }],
  history: [{ id: "history-list", html: '<p class="muted">History unavailable.</p>' }],
  constellation: [{ id: "constellation-summary", text: "Constellation unavailable." }],
  forge: [{ id: "forge-summary", text: "Mutation forge unavailable." }],
  ledger: [{ id: "ledger-summary", text: "Ledger unavailable." }],
  governance: [{ id: "governance-summary", text: "Governance status unavailable." }],
  protocol: [{ id: "protocol-summary", text: "Protocol lab unavailable." }]
};

function currentRoute() {
  return document.body && document.body.dataset && document.body.dataset.route
    ? document.body.dataset.route
    : "home";
}

function renderFailure(routeKey) {
  var failures = FAILURE_BY_ROUTE[routeKey] || [];
  failures.forEach(function (item) {
    var node = byId(item.id);
    if (!node) return;
    if (typeof item.html === "string") {
      node.innerHTML = item.html;
      return;
    }
    if (typeof item.text === "string") node.textContent = item.text;
  });
}

function boot(ledger, policy, routeKey) {
  var model = buildEvolutionModel(ledger, { policy: policy });
  var renderers = RENDERERS_BY_ROUTE[routeKey] || RENDERERS_BY_ROUTE.home;
  renderers.forEach(function (renderer) {
    renderer(model);
  });
}

var routeKey = currentRoute();
renderGlobalNav({ mountId: "site-nav", currentRoute: routeKey });

Promise.all([
  loadLedger("log.json"),
  loadPolicy("autonomy.policy.json").catch(defaultPolicy)
])
  .then(function (results) {
    boot(results[0], results[1], routeKey);
  })
  .catch(function () {
    renderFailure(routeKey);
  });
