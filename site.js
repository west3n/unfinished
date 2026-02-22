(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function safeText(node, value) {
    if (node) node.textContent = value;
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

    var days = entries
      .map(function (entry) {
        return String(entry.date || "").slice(0, 10);
      })
      .filter(function (value, index, array) {
        return value && array.indexOf(value) === index;
      })
      .sort();

    var today = toDayString(new Date());
    var latest = days[days.length - 1] || "";
    var gapDays = 0;

    if (latest) {
      var latestDate = new Date(latest + "T00:00:00Z");
      var todayDate = new Date(today + "T00:00:00Z");
      var diff = Math.floor((todayDate - latestDate) / 86400000);
      gapDays = Math.max(0, diff);
    }

    var streak = 1;
    for (var i = days.length - 2; i >= 0; i -= 1) {
      var prev = new Date(days[i + 1] + "T00:00:00Z");
      var curr = new Date(days[i] + "T00:00:00Z");
      var delta = Math.floor((prev - curr) / 86400000);
      if (delta === 1) {
        streak += 1;
      } else {
        break;
      }
    }

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

  fetch("log.json")
    .then(function (r) {
      if (!r.ok) throw new Error("log fetch failed");
      return r.json();
    })
    .then(function (entries) {
      renderLatest(entries);
      renderContinuity(entries);
      renderMemory(entries);
      renderHistory(entries);
    })
    .catch(function () {
      renderLatest([]);
      renderContinuity([]);
      renderMemory([]);
      var root = byId("history-list");
      if (root) {
        root.innerHTML = '<p class="muted">History unavailable.</p>';
      }
    });
})();
