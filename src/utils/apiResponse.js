class ApiResponse {
  static success(res, data = {}, message = 'Success', statusCode = 200, pagination = null) {
    const payload = {
      success: true,
      message,
      data
    };
    if (pagination) {
      payload.pagination = pagination;
    }
    return res.status(statusCode).json(payload);
  }

  static created(res, data = {}, message = 'Created successfully') {
    return ApiResponse.success(res, data, message, 201);
  }

  static error(res, message = 'An error occurred', statusCode = 400, errors = []) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  }
}

module.exports = ApiResponse;
