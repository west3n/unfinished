import { byId, clamp, create, safeText } from "../shared/dom.js";
import { hashSeed, seededRandom } from "../shared/random.js";

function axisColor(axis, progress) {
  if (axis === "governance") return "hsl(12, 58%, " + (38 + progress * 20).toFixed(1) + "%)";
  if (axis === "memory") return "hsl(196, 55%, " + (35 + progress * 24).toFixed(1) + "%)";
  if (axis === "runtime") return "hsl(162, 50%, " + (34 + progress * 26).toFixed(1) + "%)";
  if (axis === "interface") return "hsl(46, 70%, " + (44 + progress * 18).toFixed(1) + "%)";
  return "hsl(276, 35%, " + (38 + progress * 26).toFixed(1) + "%)";
}

export function renderConstellation(model) {
  var canvas = byId("constellation-canvas");
  if (!canvas) return;

  var tooltip = byId("constellation-tooltip");
  var summary = byId("constellation-summary");
  var list = byId("constellation-list");
  var labelToggle = byId("constellation-labels");
  var spacingInput = byId("constellation-spacing");

  if (!summary || !list) return;

  list.innerHTML = "";

  if (!model.timeline.length) {
    safeText(summary, "No entries yet.");
    if (tooltip) tooltip.classList.remove("visible");
    return;
  }

  safeText(summary, "Mapped " + model.timeline.length + " entries from " + model.originDate + " to " + model.latestDate + ".");

  model.timeline.slice(-6).reverse().forEach(function (node) {
    var li = create("li", "");
    li.appendChild(create("strong", "", node.title));
    li.appendChild(create("span", "muted", " · " + node.date + " · " + node.axis));
    list.appendChild(li);
  });

  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var dpr = window.devicePixelRatio || 1;
  var nodes = [];

  function rebuild() {
    var width = canvas.clientWidth || 600;
    var height = canvas.clientHeight || 420;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var spacing = spacingInput ? Number(spacingInput.value) : 24;
    var pad = 36;
    var random = seededRandom(hashSeed(model.latestDate + "|" + model.timeline.length));

    nodes = [];
    model.timeline.forEach(function (node, index) {
      var progress = model.timeline.length > 1 ? index / (model.timeline.length - 1) : 0.5;
      var x = pad + (width - pad * 2) * progress;
      var radius = clamp(6 + node.filesChanged * 1.8, 6, 18);
      var y = pad + random() * (height - pad * 2);

      var tries = 0;
      while (tries < 20) {
        var clear = true;
        for (var i = 0; i < nodes.length; i += 1) {
          var prior = nodes[i];
          var dx = prior.x - x;
          var dy = prior.y - y;
          var distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < spacing + radius + prior.radius) {
            clear = false;
            break;
          }
        }
        if (clear) break;
        y = pad + random() * (height - pad * 2);
        tries += 1;
      }

      nodes.push({
        x: x,
        y: y,
        radius: radius,
        progress: progress,
        node: node
      });
    });
  }

  function draw() {
    var width = canvas.clientWidth || 600;
    var height = canvas.clientHeight || 420;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(40, 32, 20, 0.2)";
    ctx.beginPath();
    nodes.forEach(function (entry, index) {
      if (index === 0) ctx.moveTo(entry.x, entry.y);
      else ctx.lineTo(entry.x, entry.y);
    });
    ctx.stroke();
    ctx.restore();

    nodes.forEach(function (entry, index) {
      ctx.beginPath();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = axisColor(entry.node.axis, entry.progress);
      ctx.arc(entry.x, entry.y, entry.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#2c2418";
      ctx.stroke();

      if (labelToggle && labelToggle.checked) {
        if (model.timeline.length > 12 && index < model.timeline.length - 6) return;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#2c2418";
        ctx.font = "12px Georgia, serif";
        ctx.fillText(entry.node.title, entry.x + entry.radius + 6, entry.y - entry.radius - 4);
      }
    });

    ctx.globalAlpha = 1;
  }

  function refresh() {
    rebuild();
    draw();
  }

  function pointerMove(event) {
    if (!tooltip) return;
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var nearest = null;
    var best = Infinity;

    nodes.forEach(function (entry) {
      var dx = entry.x - x;
      var dy = entry.y - y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < entry.radius + 8 && dist < best) {
        best = dist;
        nearest = entry;
      }
    });

    if (!nearest) {
      tooltip.classList.remove("visible");
      return;
    }

    tooltip.textContent = nearest.node.title + " · " + nearest.node.date + " · " + nearest.node.axis;
    tooltip.style.left = clamp(x + 14, 12, rect.width - 220) + "px";
    tooltip.style.top = clamp(y - 12, 12, rect.height - 60) + "px";
    tooltip.classList.add("visible");
  }

  refresh();
  window.addEventListener("resize", refresh);
  canvas.addEventListener("mousemove", pointerMove);
  canvas.addEventListener("mouseleave", function () {
    if (tooltip) tooltip.classList.remove("visible");
  });
  if (labelToggle) labelToggle.addEventListener("change", draw);
  if (spacingInput) spacingInput.addEventListener("input", refresh);
}
