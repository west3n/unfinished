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

  fetch("log.json")
    .then(function (r) {
      if (!r.ok) throw new Error("log fetch failed");
      return r.json();
    })
    .then(function (entries) {
      renderLatest(entries);
      renderHistory(entries);
    })
    .catch(function () {
      renderLatest([]);
      var root = byId("history-list");
      if (root) {
        root.innerHTML = '<p class="muted">History unavailable.</p>';
      }
    });
})();
