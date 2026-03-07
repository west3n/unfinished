function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];
  return files.filter(function (file) {
    return typeof file === "string" && file.length > 0;
  });
}

function normalizeIntent(intent, index) {
  return {
    id: String(intent && intent.id ? intent.id : "intent-" + String(index + 1).padStart(3, "0")),
    axis: String(intent && intent.axis ? intent.axis : "structure"),
    label: String(intent && intent.label ? intent.label : "Unnamed intent"),
    urgency: Math.max(1, Math.min(100, Math.round(Number(intent && intent.urgency ? intent.urgency : 50)))),
    reason: String(intent && intent.reason ? intent.reason : ""),
    date: String(intent && intent.date ? intent.date : "unknown").slice(0, 10)
  };
}

function normalizeProgram(program, index) {
  var steps = Array.isArray(program && program.steps) ? program.steps : [];
  return {
    id: String(program && program.id ? program.id : "program-" + String(index + 1).padStart(3, "0")),
    name: String(program && program.name ? program.name : "Unnamed program"),
    strategy: String(program && program.strategy ? program.strategy : "policy-pivot"),
    axis: String(program && program.axis ? program.axis : "structure"),
    confidence: Math.max(1, Math.min(100, Math.round(Number(program && program.confidence ? program.confidence : 60)))),
    disruption: Math.max(1, Math.min(6, Math.round(Number(program && program.disruption ? program.disruption : 3)))),
    thesis: String(program && program.thesis ? program.thesis : ""),
    steps: steps.map(function (step, stepIndex) {
      return {
        step: Math.max(1, Math.round(Number(step && step.step ? step.step : stepIndex + 1))),
        axis: String(step && step.axis ? step.axis : "structure"),
        date: String(step && step.date ? step.date : "unknown").slice(0, 10),
        action: String(step && step.action ? step.action : ""),
        detail: String(step && step.detail ? step.detail : ""),
        files: normalizeFiles(step && step.files),
        disruption: Math.max(1, Math.min(6, Math.round(Number(step && step.disruption ? step.disruption : 3))))
      };
    })
  };
}

export function inferAxis(entry) {
  if (entry && typeof entry.axis === "string" && entry.axis) return entry.axis;

  var files = normalizeFiles(entry && entry.files_changed);
  var joined = files.join("|").toLowerCase();

  if (joined.includes(".github/workflows") || joined.includes("autonomy") || joined.includes("constitution")) return "governance";
  if (joined.includes("log.json") && files.length <= 2) return "memory";
  if (joined.includes("site.js") || joined.includes("src/")) return "runtime";
  if (joined.includes("style.css") || joined.includes(".html")) return "interface";
  return "structure";
}

function normalizeEntry(entry) {
  return {
    date: String(entry && entry.date ? entry.date : "unknown").slice(0, 10),
    title: String(entry && entry.title ? entry.title : "Untitled"),
    summary: String(entry && entry.summary ? entry.summary : ""),
    files_changed: normalizeFiles(entry && entry.files_changed),
    axis: inferAxis(entry)
  };
}

function deriveEvents(entries) {
  var events = [];
  var sorted = entries.slice().sort(function (a, b) {
    return String(a.date).localeCompare(String(b.date));
  });

  sorted.forEach(function (entry, index) {
    events.push({
      id: "run-" + String(index + 1).padStart(3, "0"),
      date: entry.date,
      type: "run.commit",
      axis: entry.axis,
      intensity: Math.max(1, entry.files_changed.length),
      note: entry.title,
      touchpoints: entry.files_changed.slice(0, 6),
      source: {
        kind: "entry",
        date: entry.date,
        title: entry.title
      }
    });
  });

  return events;
}

function normalizeEvent(event, index) {
  var touchpoints = Array.isArray(event && event.touchpoints)
    ? event.touchpoints.filter(function (item) { return typeof item === "string" && item.length > 0; })
    : [];

  return {
    id: String(event && event.id ? event.id : "event-" + String(index + 1).padStart(3, "0")),
    date: String(event && event.date ? event.date : "unknown").slice(0, 10),
    type: String(event && event.type ? event.type : "event.unknown"),
    axis: String(event && event.axis ? event.axis : "structure"),
    intensity: Math.max(1, Number(event && event.intensity ? event.intensity : 1)),
    note: String(event && event.note ? event.note : ""),
    touchpoints: touchpoints,
    source: event && typeof event.source === "object" ? event.source : { kind: "manual" }
  };
}

export function normalizeLedger(raw) {
  if (Array.isArray(raw)) {
    var legacyEntries = raw.map(normalizeEntry);
    return {
      schema: "legacy-log@1",
      semantics: "entries-only",
      entries: legacyEntries,
      events: deriveEvents(legacyEntries),
      intents: [],
      programs: [],
      metadata: {
        migrated: true,
        strategy: "derived-events"
      }
    };
  }

  var data = raw && typeof raw === "object" ? raw : {};
  var rawEntries = Array.isArray(data.entries)
    ? data.entries
    : Array.isArray(data.history)
      ? data.history
      : [];

  var entries = rawEntries.map(normalizeEntry);

  var events = Array.isArray(data.events) && data.events.length
    ? data.events.map(normalizeEvent)
    : deriveEvents(entries);
  var intents = Array.isArray(data.intents) && data.intents.length
    ? data.intents.map(normalizeIntent)
    : [];
  var programs = Array.isArray(data.programs) && data.programs.length
    ? data.programs.map(normalizeProgram)
    : [];

  var semantics = String(data.semantics || (programs.length ? "quad-ledger" : intents.length ? "tri-ledger" : "dual-ledger"));

  return {
    schema: String(data.schema || "memory-ledger@4"),
    semantics: semantics,
    entries: entries,
    events: events,
    intents: intents,
    programs: programs,
    metadata: data.metadata && typeof data.metadata === "object" ? data.metadata : {}
  };
}
