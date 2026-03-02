import { byId, create, safeText } from "../shared/dom.js";

function formatType(type) {
  return String(type || "event.unknown").replace(/\./g, " -> ");
}

function renderEventList(events) {
  var list = byId("ledger-events");
  if (!list) return;
  list.innerHTML = "";

  if (!events.length) {
    list.appendChild(create("p", "muted", "No events available."));
    return;
  }

  events.forEach(function (event) {
    var item = create("article", "ledger-event");
    item.appendChild(create("h3", "", event.note || event.type || "Untitled event"));
    item.appendChild(create("p", "ledger-meta", event.date + " · " + formatType(event.type) + " · axis " + event.axis + " · intensity " + event.intensity));

    if (Array.isArray(event.touchpoints) && event.touchpoints.length) {
      var files = create("ul", "files");
      event.touchpoints.forEach(function (file) {
        files.appendChild(create("li", "", file));
      });
      item.appendChild(files);
    }

    list.appendChild(item);
  });
}

export function renderLedger(model) {
  var summary = byId("ledger-summary");
  var schema = byId("ledger-schema");
  var semantics = byId("ledger-semantics");
  var typeCount = byId("ledger-types");
  var axisFilter = byId("ledger-axis-filter");

  if (!summary || !schema || !semantics || !typeCount) return;

  safeText(summary, "Event ledger contains " + model.eventSummary.count + " event(s), latest at " + model.eventSummary.latestDate + ".");
  safeText(schema, model.ledgerSchema);
  safeText(semantics, model.ledgerSemantics);
  safeText(typeCount, String(Object.keys(model.eventSummary.byType).length));

  function refresh() {
    var axis = axisFilter ? axisFilter.value : "all";
    var events = model.eventSummary.recent.filter(function (event) {
      return axis === "all" || event.axis === axis;
    });
    renderEventList(events);
  }

  if (axisFilter) {
    axisFilter.addEventListener("change", refresh);
  }

  refresh();
}
