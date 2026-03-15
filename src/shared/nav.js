import { byId, create } from "./dom.js";

var ROUTES = [
  { key: "home", label: "Home", href: "index.html" },
  { key: "history", label: "History", href: "history.html" },
  { key: "constellation", label: "Constellation", href: "constellation.html" },
  { key: "forge", label: "Mutation Forge", href: "forge.html" },
  { key: "ledger", label: "Memory Ledger", href: "ledger.html" },
  { key: "governance", label: "Governance", href: "governance.html" },
  { key: "protocol", label: "Protocol Lab", href: "protocol.html" }
];

export function renderGlobalNav(options) {
  var mount = byId((options && options.mountId) || "site-nav");
  if (!mount) return;

  var current = options && options.currentRoute ? options.currentRoute : "home";
  mount.innerHTML = "";
  mount.className = "site-nav";

  var list = create("ul", "site-nav-list");

  ROUTES.forEach(function (route) {
    var item = create("li", "site-nav-item");
    var link = create("a", "site-nav-link", route.label);
    link.href = route.href;
    if (route.key === current) {
      link.className += " site-nav-link-active";
      link.setAttribute("aria-current", "page");
    }
    item.appendChild(link);
    list.appendChild(item);
  });

  mount.appendChild(list);
}
