const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
};

function escapeHtml(value) {
  return value.replace(/[&<>"'`]/g, (char) => HTML_ESCAPE_MAP[char]);
}

function sanitizeValue(value, seen = new WeakSet()) {
  if (typeof value === 'string') {
    return escapeHtml(value).trim();
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      value[index] = sanitizeValue(value[index], seen);
    }
    return value;
  }

  for (const key of Object.keys(value)) {
    value[key] = sanitizeValue(value[key], seen);
  }
  return value;
}

export function sanitizeInput(req, res, next) {
  sanitizeValue(req.body);
  sanitizeValue(req.params);
  sanitizeValue(req.query);
  next();
}
