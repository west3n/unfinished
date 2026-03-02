function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];
  return files.filter(function (file) {
    return typeof file === "string" && file.length > 0;
  });
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

  return {
    schema: String(data.schema || "memory-ledger@2"),
    semantics: String(data.semantics || "dual-ledger"),
    entries: entries,
    events: events,
    metadata: data.metadata && typeof data.metadata === "object" ? data.metadata : {}
  };
}
