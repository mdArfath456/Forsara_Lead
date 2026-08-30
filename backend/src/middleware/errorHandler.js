export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Never log the raw Axios error object: it can contain request headers such as
// the Apollo x-api-key. Log only safe diagnostic fields.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error('[error]', {
    name: err?.name,
    message: err?.message,
    status: err?.status,
    code: err?.code,
    path: req.originalUrl,
    method: req.method,
  });

  const status = err.status || 500;
  res.status(status).json({
    error: err.publicMessage || err.message || 'Internal server error',
  });
}
