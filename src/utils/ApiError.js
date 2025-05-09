/**
 * Custom API Error class for handling operational errors in a structured way.
 * Extends the built-in Error class to provide additional functionality.
 */
export class ApiError extends Error {
  /**
   * Creates a new ApiError instance.
   * @param {number} statusCode - HTTP status code for the error (default: 500).
   * @param {string} message - Error message (default: 'Internal Server Error').
   * @param {Array} errors - Additional error details or validation errors (default: []).
   * @param {boolean} isOperational - Indicates if the error is operational (default: true).
   */
  constructor(
    statusCode = 500,
    message = 'Internal Server Error',
    errors = [],
    isOperational = true
  ) {
    super(message);

    // Assign properties
    this.statusCode = statusCode; // HTTP status code
    this.errors = errors; // Additional error details or validation errors
    this.isOperational = isOperational; // Indicates if the error is operational
    this.name = this.constructor.name; // Name of the error class
    this.timestamp = new Date().toISOString(); // Timestamp of when the error occurred

    // Capture stack trace for non-operational errors
    if (!isOperational) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts the error to a JSON object for consistent error responses.
   * @returns {Object} - Standardized error response object.
   */
  toJSON() {
    return {
      success: false,
      message: this.message,
      errors: this.errors,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }), // Include stack trace in development
    };
  }

  /**
   * Creates a 400 Bad Request error.
   * @param {string} message - Custom error message (default: 'Bad Request').
   * @param {Array} errors - Additional error details or validation errors (default: []).
   * @returns {ApiError} - Instance of ApiError.
   */
  static badRequest(message = 'Bad Request', errors = []) {
    return new ApiError(400, message, errors);
  }

  /**
   * Creates a 401 Unauthorized error.
   * @param {string} message - Custom error message (default: 'Unauthorized').
   * @returns {ApiError} - Instance of ApiError.
   */
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  /**
   * Creates a 403 Forbidden error.
   * @param {string} message - Custom error message (default: 'Forbidden').
   * @returns {ApiError} - Instance of ApiError.
   */
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  /**
   * Creates a 404 Not Found error.
   * @param {string} message - Custom error message (default: 'Not Found').
   * @returns {ApiError} - Instance of ApiError.
   */
  static notFound(message = 'Not Found') {
    return new ApiError(404, message);
  }

  /**
   * Creates a 409 Conflict error.
   * @param {string} message - Custom error message (default: 'Conflict').
   * @returns {ApiError} - Instance of ApiError.
   */
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  /**
   * Creates a 422 Unprocessable Entity error.
   * @param {string} message - Custom error message (default: 'Unprocessable Entity').
   * @param {Array} errors - Additional error details or validation errors (default: []).
   * @returns {ApiError} - Instance of ApiError.
   */
  static unprocessableEntity(message = 'Unprocessable Entity', errors = []) {
    return new ApiError(422, message, errors);
  }

  /**
   * Creates a 500 Internal Server Error.
   * @param {string} message - Custom error message (default: 'Internal Server Error').
   * @returns {ApiError} - Instance of ApiError.
   */
  static internalServer(message = 'Internal Server Error') {
    return new ApiError(500, message, [], false); // Mark as non-operational
  }

  /**
   * Creates a 503 Service Unavailable error.
   * @param {string} message - Custom error message (default: 'Service Unavailable').
   * @returns {ApiError} - Instance of ApiError.
   */
  static serviceUnavailable(message = 'Service Unavailable') {
    return new ApiError(503, message);
  }
}