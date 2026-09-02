import httpStatus from 'http-status';

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string, stack = '') {
    super(message);
    this.statusCode = statusCode;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Specific error classes for common scenarios
export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(httpStatus.CONFLICT, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(httpStatus.NOT_FOUND, message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(httpStatus.UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(httpStatus.FORBIDDEN, message);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad request') {
    super(httpStatus.BAD_REQUEST, message);
  }
}
