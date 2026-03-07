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

function renderIntentList(intents) {
  var list = byId("ledger-intents");
  if (!list) return;
  list.innerHTML = "";

  if (!intents.length) {
    list.appendChild(create("p", "muted", "No declared intents available."));
    return;
  }

  intents.forEach(function (intent) {
    var item = create("article", "ledger-event");
    item.appendChild(create("h3", "", intent.label || "Unnamed intent"));
    item.appendChild(create("p", "ledger-meta", intent.date + " · axis " + intent.axis + " · urgency " + intent.urgency));
    if (intent.reason) {
      item.appendChild(create("p", "", intent.reason));
    }
    list.appendChild(item);
  });
}

function renderProgramList(programs, axis) {
  var list = byId("ledger-intents");
  if (!list) return;

  if (!programs.length) return;

  var filtered = programs.filter(function (program) {
    return axis === "all" || program.axis === axis;
  });

  filtered.forEach(function (program) {
    var item = create("article", "ledger-event");
    item.appendChild(create("h3", "", "Program: " + program.name));
    item.appendChild(create("p", "ledger-meta", "axis " + program.axis + " · strategy " + program.strategy + " · confidence " + program.confidence + " · disruption " + program.disruption));
    if (program.thesis) {
      item.appendChild(create("p", "", program.thesis));
    }
    list.appendChild(item);
  });
}

export function renderLedger(model) {
  var summary = byId("ledger-summary");
  var schema = byId("ledger-schema");
  var semantics = byId("ledger-semantics");
  var typeCount = byId("ledger-types");
  var intentCount = byId("ledger-intent-count");
  var axisFilter = byId("ledger-axis-filter");

  if (!summary || !schema || !semantics || !typeCount || !intentCount) return;

  safeText(summary, "Quad-ledger tracks " + model.eventSummary.count + " event(s), " + model.intents.length + " intent(s), and " + model.programs.length + " program(s). Latest event: " + model.eventSummary.latestDate + ".");
  safeText(schema, model.ledgerSchema);
  safeText(semantics, model.ledgerSemantics);
  safeText(typeCount, String(Object.keys(model.eventSummary.byType).length));
  safeText(intentCount, String(model.intents.length));

  function refresh() {
    var axis = axisFilter ? axisFilter.value : "all";
    var events = model.eventSummary.recent.filter(function (event) {
      return axis === "all" || event.axis === axis;
    });
    renderEventList(events);

    var intents = model.intents
      .slice()
      .sort(function (a, b) {
        return Number(b.urgency || 0) - Number(a.urgency || 0);
      })
      .filter(function (intent) {
        return axis === "all" || intent.axis === axis;
      });
    renderIntentList(intents);
    renderProgramList(model.programs || [], axis);
  }

  if (axisFilter) {
    axisFilter.addEventListener("change", refresh);
  }

  refresh();
}
