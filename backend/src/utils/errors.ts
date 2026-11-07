export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: any;

  constructor(message: string, statusCode = 500, errorCode = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class PolicyViolationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'POLICY_VIOLATION', details);
  }
}

export class RiskBlockedError extends AppError {
  constructor(message: string, findings?: any) {
    super(message, 422, 'RISK_BLOCKED', findings);
  }
}

export class ProviderError extends AppError {
  constructor(message: string, provider = 'blaaiz', details?: any) {
    super(`Provider [${provider}] Error: ${message}`, 502, 'PROVIDER_ERROR', details);
  }
}

