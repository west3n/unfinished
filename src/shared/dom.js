export function byId(id) {
  return document.getElementById(id);
}

export function safeText(node, value) {
  if (node) node.textContent = value;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function create(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (typeof text === "string") node.textContent = text;
  return node;
}
