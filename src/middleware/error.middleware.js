const ApiError = require('../utils/apiError');
const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Upload problems (e.g. file too large) are the client's fault
  if (error.name === 'MulterError') {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : error.message;
    error = ApiError.badRequest(message);
  }

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.errors || []);
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors || []
  };

  if (env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
