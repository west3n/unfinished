import { byId, clamp, create, safeText } from "../shared/dom.js";
import { hashSeed, seededRandom } from "../shared/random.js";

var AXIS_ORDER = ["governance", "memory", "runtime", "interface", "structure"];

function axisColor(axis, progress) {
  if (axis === "governance") return "hsl(12, 58%, " + (38 + progress * 20).toFixed(1) + "%)";
  if (axis === "memory") return "hsl(196, 55%, " + (35 + progress * 24).toFixed(1) + "%)";
  if (axis === "runtime") return "hsl(162, 50%, " + (34 + progress * 26).toFixed(1) + "%)";
  if (axis === "interface") return "hsl(46, 70%, " + (44 + progress * 18).toFixed(1) + "%)";
  return "hsl(276, 35%, " + (38 + progress * 26).toFixed(1) + "%)";
}

function axisLabel(axis) {
  return String(axis || "structure").replace(/^[a-z]/, function (match) {
    return match.toUpperCase();
  });
}

function sortedWindow(nodes, windowSize) {
  var size = Math.max(4, Number(windowSize) || 12);
  return nodes.slice(Math.max(0, nodes.length - size));
}

function renderSelected(root, node) {
  if (!root) return;
  root.innerHTML = "";

  if (!node) {
    root.appendChild(create("p", "muted", "Select a run in the canvas to inspect its observer-facing trace."));
    return;
  }

  root.appendChild(create("h3", "", node.title || "Untitled"));

  var meta = create(
    "p",
    "ledger-meta",
    (node.date || "Unknown") + " · " + axisLabel(node.axis) + " · " + node.filesChanged + " file(s)"
  );
  root.appendChild(meta);

  var summary = node.summary || "No summary provided.";
  root.appendChild(create("p", "", summary));

  var files = Array.isArray(node.raw && node.raw.files_changed) ? node.raw.files_changed : [];
  if (!files.length) {
    root.appendChild(create("p", "muted", "No file trace recorded."));
    return;
  }

  var label = create("p", "", "Touched files:");
  root.appendChild(label);

  var list = create("ul", "files");
  files.forEach(function (file) {
    list.appendChild(create("li", "", file));
  });
  root.appendChild(list);
}

export function renderConstellation(model) {
  var canvas = byId("constellation-canvas");
  if (!canvas) return;

  var tooltip = byId("constellation-tooltip");
  var summary = byId("constellation-summary");
  var list = byId("constellation-list");
  var filterAxis = byId("constellation-axis");
  var windowInput = byId("constellation-window");
  var windowValue = byId("constellation-window-value");
  var inspector = byId("constellation-selected");

  if (!summary || !list || !filterAxis || !windowInput || !windowValue || !inspector) return;

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var dpr = window.devicePixelRatio || 1;
  var renderedNodes = [];
  var selectedId = null;

  function drawLanes(width, height, laneYByAxis) {
    ctx.save();
    AXIS_ORDER.forEach(function (axis) {
      var y = laneYByAxis[axis];
      if (typeof y !== "number") return;
      ctx.strokeStyle = "rgba(44, 36, 24, 0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(66, y);
      ctx.lineTo(width - 24, y);
      ctx.stroke();

      ctx.fillStyle = "rgba(44, 36, 24, 0.75)";
      ctx.font = "12px Georgia, serif";
      ctx.fillText(axisLabel(axis), 10, y + 4);
    });
    ctx.restore();
  }

  function drawNodes(width, workingNodes) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(34, 30, 24, 0.25)";
    ctx.beginPath();
    workingNodes.forEach(function (entry, index) {
      if (index === 0) ctx.moveTo(entry.x, entry.y);
      else ctx.lineTo(entry.x, entry.y);
    });
    ctx.stroke();
    ctx.restore();

    workingNodes.forEach(function (entry) {
      var selected = selectedId === entry.node.id;
      ctx.beginPath();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = axisColor(entry.node.axis, entry.progress);
      ctx.arc(entry.x, entry.y, entry.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = selected ? 0.95 : 0.32;
      ctx.lineWidth = selected ? 2.5 : 1;
      ctx.strokeStyle = selected ? "#1d1d1d" : "#2c2418";
      ctx.stroke();

      if (selected) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#1d1d1d";
        ctx.font = "12px Georgia, serif";
        ctx.fillText(entry.node.title, entry.x + entry.radius + 6, entry.y - entry.radius - 4);
      }
    });

    ctx.globalAlpha = 1;
  }

  function refresh() {
    list.innerHTML = "";

    var axis = filterAxis.value || "all";
    var full = model.timeline.filter(function (node) {
      return axis === "all" || node.axis === axis;
    });
    var windowed = sortedWindow(full, Number(windowInput.value));

    if (!windowed.length) {
      safeText(summary, "No runs available for the current filter.");
      renderSelected(inspector, null);
      if (tooltip) tooltip.classList.remove("visible");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    var width = canvas.clientWidth || 600;
    var height = canvas.clientHeight || 520;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var lanePadTop = 42;
    var lanePadBottom = 32;
    var laneHeight = (height - lanePadTop - lanePadBottom) / AXIS_ORDER.length;
    var laneYByAxis = AXIS_ORDER.reduce(function (acc, item, index) {
      acc[item] = lanePadTop + laneHeight * index + laneHeight / 2;
      return acc;
    }, {});

    var random = seededRandom(hashSeed(model.latestDate + "|" + axis + "|" + windowed.length));
    renderedNodes = windowed.map(function (node, index) {
      var progress = windowed.length > 1 ? index / (windowed.length - 1) : 0.5;
      var x = 76 + progress * Math.max(1, width - 108);
      var axisY = laneYByAxis[node.axis] || laneYByAxis.structure;
      var jitter = (random() - 0.5) * Math.min(26, laneHeight * 0.5);
      return {
        node: node,
        progress: progress,
        x: x,
        y: axisY + jitter,
        radius: clamp(6 + node.filesChanged * 1.5, 6, 18)
      };
    });

    ctx.clearRect(0, 0, width, height);
    drawLanes(width, height, laneYByAxis);
    drawNodes(width, renderedNodes);

    var selection = renderedNodes.find(function (entry) {
      return entry.node.id === selectedId;
    });
    renderSelected(inspector, selection ? selection.node : renderedNodes[renderedNodes.length - 1].node);

    var oldest = windowed[0];
    var latest = windowed[windowed.length - 1];
    safeText(
      summary,
      "Atlas window: " + windowed.length + " run(s), " + oldest.date + " -> " + latest.date +
      ". Axis filter: " + (axis === "all" ? "All axes" : axisLabel(axis)) + "."
    );

    windowed.slice().reverse().slice(0, 6).forEach(function (node) {
      var li = create("li", "");
      li.appendChild(create("strong", "", node.title));
      li.appendChild(create("span", "muted", " · " + node.date + " · " + axisLabel(node.axis) + " · " + node.filesChanged + " files"));
      list.appendChild(li);
    });

    windowValue.textContent = String(windowed.length);
  }

  function pointerMove(event) {
    if (!tooltip || !renderedNodes.length) return;
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var nearest = null;
    var best = Infinity;

    renderedNodes.forEach(function (entry) {
      var dx = entry.x - x;
      var dy = entry.y - y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < entry.radius + 10 && distance < best) {
        best = distance;
        nearest = entry;
      }
    });

    if (!nearest) {
      tooltip.classList.remove("visible");
      return;
    }

    tooltip.textContent = nearest.node.title + " · " + nearest.node.date + " · " + axisLabel(nearest.node.axis);
    tooltip.style.left = clamp(x + 14, 12, rect.width - 220) + "px";
    tooltip.style.top = clamp(y - 12, 12, rect.height - 60) + "px";
    tooltip.classList.add("visible");
  }

  function pointerDown(event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var hit = null;

    renderedNodes.forEach(function (entry) {
      var dx = entry.x - x;
      var dy = entry.y - y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= entry.radius + 3) hit = entry;
    });

    if (!hit) return;
    selectedId = hit.node.id;
    refresh();
  }

  window.addEventListener("resize", refresh);
  canvas.addEventListener("mousemove", pointerMove);
  canvas.addEventListener("mouseleave", function () {
    if (tooltip) tooltip.classList.remove("visible");
  });
  canvas.addEventListener("click", pointerDown);
  filterAxis.addEventListener("change", refresh);
  windowInput.addEventListener("input", refresh);

  refresh();
}
