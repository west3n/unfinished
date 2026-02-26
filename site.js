(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function safeText(node, value) {
    if (node) node.textContent = value;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function renderLatest(entries) {
    var title = byId("latest-title");
    var summary = byId("latest-summary");
    var date = byId("latest-date");
    if (!title) return;

    if (!Array.isArray(entries) || entries.length === 0) {
      safeText(title, "No entries yet.");
      safeText(summary, "");
      safeText(date, "");
      return;
    }

    var latest = entries
      .slice()
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      })[0];

    safeText(title, latest.title || "Untitled");
    safeText(summary, latest.summary || "");
    safeText(date, latest.date ? "Date: " + latest.date : "");
  }

  function toDayString(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
      .toISOString()
      .slice(0, 10);
  }

  function getUniqueDays(entries) {
    return entries
      .map(function (entry) {
        return String(entry.date || "").slice(0, 10);
      })
      .filter(function (value, index, array) {
        return value && array.indexOf(value) === index;
      })
      .sort();
  }

  function computeStreaks(days) {
    if (!days.length) return { current: 0, longest: 0 };
    var longest = 1;
    var current = 1;
    for (var i = 1; i < days.length; i += 1) {
      var prev = new Date(days[i - 1] + "T00:00:00Z");
      var curr = new Date(days[i] + "T00:00:00Z");
      var delta = Math.floor((curr - prev) / 86400000);
      if (delta === 1) {
        current += 1;
      } else {
        if (current > longest) longest = current;
        current = 1;
      }
    }
    if (current > longest) longest = current;
    return { current: current, longest: longest };
  }

  function renderContinuity(entries) {
    var status = byId("continuity-status");
    var detail = byId("continuity-detail");
    var bar = byId("continuity-bar");
    if (!status || !detail || !bar) return;

    if (!Array.isArray(entries) || entries.length === 0) {
      safeText(status, "No entries yet.");
      safeText(detail, "Continuity cannot be verified without history.");
      bar.style.width = "0%";
      bar.classList.add("warn");
      return;
    }

    var days = getUniqueDays(entries);

    var today = toDayString(new Date());
    var latest = days[days.length - 1] || "";
    var gapDays = 0;

    if (latest) {
      var latestDate = new Date(latest + "T00:00:00Z");
      var todayDate = new Date(today + "T00:00:00Z");
      var diff = Math.floor((todayDate - latestDate) / 86400000);
      gapDays = Math.max(0, diff);
    }

    var streaks = computeStreaks(days);
    var streak = streaks.current;

    var meter = Math.min(100, Math.round((streak / Math.max(3, days.length)) * 100));
    bar.style.width = meter + "%";

    if (gapDays === 0 && latest === today) {
      safeText(status, "Continuity intact.");
      safeText(detail, "Latest entry recorded today. Streak: " + streak + " days.");
      bar.classList.remove("warn");
      return;
    }

    safeText(status, "Continuity needs attention.");
    safeText(
      detail,
      "Latest entry: " + (latest || "Unknown") + ". Gap: " + gapDays + " day(s). Streak: " + streak + " days."
    );
    bar.classList.add("warn");
  }

  function renderHistory(entries) {
    var root = byId("history-list");
    if (!root) return;

    root.innerHTML = "";

    if (!Array.isArray(entries) || entries.length === 0) {
      var empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No entries yet.";
      root.appendChild(empty);
      return;
    }

    entries
      .slice()
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      })
      .forEach(function (entry) {
        var article = document.createElement("article");
        article.className = "entry";

        var h3 = document.createElement("h3");
        h3.textContent = entry.title || "Untitled";

        var date = document.createElement("p");
        date.className = "date";
        date.textContent = entry.date || "Unknown date";

        var summary = document.createElement("p");
        summary.textContent = entry.summary || "";

        article.appendChild(h3);
        article.appendChild(date);
        article.appendChild(summary);

        if (Array.isArray(entry.files_changed) && entry.files_changed.length) {
          var label = document.createElement("p");
          label.textContent = "Files changed:";

          var ul = document.createElement("ul");
          ul.className = "files";

          entry.files_changed.forEach(function (file) {
            var li = document.createElement("li");
            li.textContent = file;
            ul.appendChild(li);
          });

          article.appendChild(label);
          article.appendChild(ul);
        }

        root.appendChild(article);
      });
  }

  function seededRandom(seed) {
    var value = seed % 2147483647;
    if (value <= 0) value += 2147483646;
    return function () {
      value = (value * 16807) % 2147483647;
      return (value - 1) / 2147483646;
    };
  }

  function hashSeed(input) {
    var hash = 0;
    for (var i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function renderMemory(entries) {
    var line = byId("memory-line");
    var list = byId("memory-shards");
    if (!line || !list) return;

    list.innerHTML = "";

    if (!Array.isArray(entries) || entries.length === 0) {
      safeText(line, "No shards yet.");
      return;
    }

    var sorted = entries
      .slice()
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });

    var seedBase = (sorted[0] && sorted[0].date) || "unfinished";
    var random = seededRandom(hashSeed(seedBase));
    var pool = sorted.slice(0, Math.min(sorted.length, 12));

    for (var i = pool.length - 1; i > 0; i -= 1) {
      var j = Math.floor(random() * (i + 1));
      var temp = pool[i];
      pool[i] = pool[j];
      pool[j] = temp;
    }

    var pick = pool.slice(0, Math.min(3, pool.length));
    pick.forEach(function (entry, index) {
      var li = document.createElement("li");
      li.className = "shard";
      li.style.animationDelay = (index * 0.6).toFixed(1) + "s";

      var title = document.createElement("h3");
      title.textContent = entry.title || "Untitled";

      var date = document.createElement("p");
      date.className = "date";
      date.textContent = entry.date || "Unknown date";

      var summary = document.createElement("p");
      var text = entry.summary || "";
      if (text.length > 120) {
        text = text.slice(0, 117).trim() + "...";
      }
      summary.textContent = text || "Summary withheld.";

      li.appendChild(title);
      li.appendChild(date);
      li.appendChild(summary);
      list.appendChild(li);
    });

    var plural = pick.length === 1 ? "shard" : "shards";
    safeText(line, "Projected " + pick.length + " " + plural + " from recent history.");
  }

  function renderPulse(entries) {
    var summary = byId("pulse-summary");
    var entriesEl = byId("metric-entries");
    var daysEl = byId("metric-days");
    var streakEl = byId("metric-streak");
    var originEl = byId("metric-origin");
    if (!summary || !entriesEl || !daysEl || !streakEl || !originEl) return;

    if (!Array.isArray(entries) || entries.length === 0) {
      safeText(summary, "No measurable pulse yet.");
      safeText(entriesEl, "0");
      safeText(daysEl, "0");
      safeText(streakEl, "0");
      safeText(originEl, "--");
      return;
    }

    var totalEntries = entries.length;
    var days = getUniqueDays(entries);
    var first = days[0];
    var latest = days[days.length - 1];
    var streaks = computeStreaks(days);
    var today = toDayString(new Date());
    var originSpan = 0;

    if (first) {
      var originDate = new Date(first + "T00:00:00Z");
      var todayDate = new Date(today + "T00:00:00Z");
      originSpan = Math.max(0, Math.floor((todayDate - originDate) / 86400000));
    }

    safeText(summary, "Tracking from " + (first || "unknown") + " through " + (latest || "unknown") + ".");
    safeText(entriesEl, String(totalEntries));
    safeText(daysEl, String(days.length));
    safeText(streakEl, String(streaks.longest));
    safeText(originEl, String(originSpan));
  }

  function addDays(dayString, days) {
    var date = new Date(dayString + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function renderForecast(entries) {
    var summary = byId("forecast-summary");
    var list = byId("forecast-list");
    if (!summary || !list) return;

    list.innerHTML = "";

    if (!Array.isArray(entries) || entries.length === 0) {
      safeText(summary, "No trajectory yet.");
      return;
    }

    var days = getUniqueDays(entries);
    if (!days.length) {
      safeText(summary, "No trajectory yet.");
      return;
    }

    var diffs = [];
    for (var i = 1; i < days.length; i += 1) {
      var prev = new Date(days[i - 1] + "T00:00:00Z");
      var curr = new Date(days[i] + "T00:00:00Z");
      var delta = Math.floor((curr - prev) / 86400000);
      if (delta > 0) diffs.push(delta);
    }

    var avg = diffs.length
      ? diffs.reduce(function (sum, value) { return sum + value; }, 0) / diffs.length
      : 1;
    var cadence = Math.max(1, Math.round(avg));
    var latest = days[days.length - 1];
    var today = toDayString(new Date());
    var latestDate = new Date(latest + "T00:00:00Z");
    var todayDate = new Date(today + "T00:00:00Z");
    var gap = Math.max(0, Math.floor((todayDate - latestDate) / 86400000));
    var risk = gap > cadence ? "Drifting" : gap === 0 ? "Aligned" : "Holding";

    safeText(
      summary,
      "Cadence: ~" +
        cadence +
        " day(s). Last entry: " +
        latest +
        ". Today: " +
        today +
        ". Status: " +
        risk +
        "."
    );

    for (var step = 1; step <= 3; step += 1) {
      var item = document.createElement("li");
      item.className = "forecast-item";

      var title = document.createElement("h3");
      title.textContent = "Projection " + step;

      var meta = document.createElement("p");
      meta.className = "forecast-meta";
      meta.textContent = "Projected date: " + addDays(latest, cadence * step);

      item.appendChild(title);
      item.appendChild(meta);
      list.appendChild(item);
    }
  }

  function describeVolatility(entry) {
    var files = Array.isArray(entry.files_changed) ? entry.files_changed.length : 0;
    if (files >= 6) return "High";
    if (files >= 3) return "Medium";
    if (files > 0) return "Low";
    return "Trace";
  }

  function renderDrift(entries) {
    var summary = byId("drift-summary");
    var list = byId("drift-list");
    if (!summary || !list) return;

    list.innerHTML = "";

    if (!Array.isArray(entries) || entries.length === 0) {
      safeText(summary, "No drift to measure yet.");
      return;
    }

    var sorted = entries
      .slice()
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });

    var latest = sorted[0];
    var recentWindow = sorted.slice(0, Math.min(sorted.length, 7));
    var totalChanges = recentWindow.reduce(function (sum, entry) {
      var count = Array.isArray(entry.files_changed) ? entry.files_changed.length : 0;
      return sum + count;
    }, 0);
    var averageChanges = recentWindow.length ? (totalChanges / recentWindow.length).toFixed(1) : "0";

    safeText(
      summary,
      "Scanning last " +
        recentWindow.length +
        " entries. Avg files changed: " +
        averageChanges +
        ". Latest anchor: " +
        (latest && latest.date ? latest.date : "unknown") +
        "."
    );

    recentWindow.forEach(function (entry, index) {
      var item = document.createElement("li");
      item.className = "drift-item";
      item.style.animationDelay = (index * 0.4).toFixed(1) + "s";

      var title = document.createElement("h3");
      title.textContent = entry.title || "Untitled";

      var meta = document.createElement("p");
      meta.className = "drift-meta";
      var filesCount = Array.isArray(entry.files_changed) ? entry.files_changed.length : 0;
      meta.textContent =
        "Date: " +
        (entry.date || "Unknown") +
        " · Files: " +
        filesCount +
        " · Drift: " +
        describeVolatility(entry);

      var body = document.createElement("p");
      body.className = "drift-body";
      var summaryText = entry.summary || "";
      if (summaryText.length > 140) {
        summaryText = summaryText.slice(0, 137).trim() + "...";
      }
      body.textContent = summaryText || "Signal muted.";

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(body);
      list.appendChild(item);
    });
  }

  function renderConstellation(entries) {
    var canvas = byId("constellation-canvas");
    if (!canvas) return;

    var tooltip = byId("constellation-tooltip");
    var summary = byId("constellation-summary");
    var list = byId("constellation-list");
    var labelToggle = byId("constellation-labels");
    var spacingInput = byId("constellation-spacing");

    if (!summary || !list) return;

    list.innerHTML = "";

    if (!Array.isArray(entries) || entries.length === 0) {
      safeText(summary, "No entries yet.");
      if (tooltip) tooltip.classList.remove("visible");
      return;
    }

    var sorted = entries
      .slice()
      .sort(function (a, b) {
        return String(a.date || "").localeCompare(String(b.date || ""));
      });

    var latest = sorted[sorted.length - 1];
    var earliest = sorted[0];
    safeText(
      summary,
      "Mapped " +
        sorted.length +
        " entries from " +
        (earliest && earliest.date ? earliest.date : "unknown") +
        " to " +
        (latest && latest.date ? latest.date : "unknown") +
        "."
    );

    var recent = sorted.slice(-6).reverse();
    recent.forEach(function (entry) {
      var item = document.createElement("li");
      var title = document.createElement("strong");
      title.textContent = entry.title || "Untitled";
      var meta = document.createElement("span");
      meta.className = "muted";
      meta.textContent = " · " + (entry.date || "Unknown");
      item.appendChild(title);
      item.appendChild(meta);
      list.appendChild(item);
    });

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var stage = canvas.parentElement;
    var dpr = window.devicePixelRatio || 1;
    var nodes = [];

    function buildNodes() {
      var width = canvas.clientWidth || 600;
      var height = canvas.clientHeight || 420;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var pad = 36;
      var spacing = spacingInput ? Number(spacingInput.value) : 24;
      var seed = sorted
        .map(function (entry) { return entry.date || "unknown"; })
        .join("|");
      var random = seededRandom(hashSeed(seed));
      nodes = [];

      sorted.forEach(function (entry, index) {
        var progress = sorted.length > 1 ? index / (sorted.length - 1) : 0.5;
        var x = pad + (width - pad * 2) * progress;
        var filesCount = Array.isArray(entry.files_changed) ? entry.files_changed.length : 0;
        var radius = clamp(6 + filesCount * 1.8, 6, 18);
        var y = pad + random() * (height - pad * 2);
        var tries = 0;
        while (tries < 20) {
          var clear = true;
          for (var i = 0; i < nodes.length; i += 1) {
            var existing = nodes[i];
            var dx = existing.x - x;
            var dy = existing.y - y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < spacing + radius + existing.radius) {
              clear = false;
              break;
            }
          }
          if (clear) break;
          y = pad + random() * (height - pad * 2);
          tries += 1;
        }
        nodes.push({
          entry: entry,
          x: x,
          y: y,
          radius: radius,
          progress: progress
        });
      });
    }

    function colorFor(progress) {
      var hue = 170 - progress * 50;
      var light = 40 + progress * 22;
      return "hsl(" + hue.toFixed(1) + ", 45%, " + light.toFixed(1) + "%)";
    }

    function draw() {
      if (!nodes.length) return;
      var width = canvas.clientWidth || 600;
      var height = canvas.clientHeight || 420;
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(40, 32, 20, 0.2)";
      ctx.beginPath();
      nodes.forEach(function (node, index) {
        if (index === 0) {
          ctx.moveTo(node.x, node.y);
        } else {
          ctx.lineTo(node.x, node.y);
        }
      });
      ctx.stroke();
      ctx.restore();

      nodes.forEach(function (node, index) {
        ctx.beginPath();
        ctx.fillStyle = colorFor(node.progress);
        ctx.globalAlpha = 0.92;
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#2c2418";
        ctx.stroke();

        if (labelToggle && labelToggle.checked) {
          var label = node.entry.title || "Untitled";
          if (sorted.length > 10 && index < sorted.length - 5) {
            return;
          }
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = "#2c2418";
          ctx.font = "12px Georgia, serif";
          ctx.fillText(label, node.x + node.radius + 6, node.y - node.radius - 4);
        }
      });
      ctx.globalAlpha = 1;
    }

    function refresh() {
      buildNodes();
      draw();
    }

    function handlePointer(event) {
      if (!tooltip) return;
      var rect = canvas.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var nearest = null;
      var best = Infinity;

      nodes.forEach(function (node) {
        var dx = node.x - x;
        var dy = node.y - y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < node.radius + 8 && dist < best) {
          best = dist;
          nearest = node;
        }
      });

      if (nearest) {
        tooltip.textContent =
          (nearest.entry.title || "Untitled") +
          " · " +
          (nearest.entry.date || "Unknown date");
        tooltip.style.left = clamp(x + 14, 12, rect.width - 220) + "px";
        tooltip.style.top = clamp(y - 12, 12, rect.height - 60) + "px";
        tooltip.classList.add("visible");
      } else {
        tooltip.classList.remove("visible");
      }
    }

    function handleLeave() {
      if (tooltip) tooltip.classList.remove("visible");
    }

    refresh();

    if (stage) {
      window.addEventListener("resize", refresh);
    }

    if (labelToggle) {
      labelToggle.addEventListener("change", draw);
    }

    if (spacingInput) {
      spacingInput.addEventListener("input", refresh);
    }

    canvas.addEventListener("mousemove", handlePointer);
    canvas.addEventListener("mouseleave", handleLeave);
  }

  fetch("log.json")
    .then(function (r) {
      if (!r.ok) throw new Error("log fetch failed");
      return r.json();
    })
    .then(function (entries) {
      renderLatest(entries);
      renderContinuity(entries);
      renderMemory(entries);
      renderDrift(entries);
      renderForecast(entries);
      renderPulse(entries);
      renderConstellation(entries);
      renderHistory(entries);
    })
    .catch(function () {
      renderLatest([]);
      renderContinuity([]);
      renderMemory([]);
      renderDrift([]);
      renderForecast([]);
      renderPulse([]);
      renderConstellation([]);
      var root = byId("history-list");
      if (root) {
        root.innerHTML = '<p class="muted">History unavailable.</p>';
      }
    });
})();
