export const notFound = (_req, res) => {
  res.status(404).json({ message: 'Route not found' });
};

export const errorHandler = (error, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(error);
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({ message: error.message || 'Internal server error' });
};
