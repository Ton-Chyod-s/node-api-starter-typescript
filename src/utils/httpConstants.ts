export const errorMessages = {
  AUTH: {
    SUCCESS: 'Login successful',
    USER_NOT_FOUND: 'User not found',
    INVALID_PASSWORD: 'Invalid password',
  },
  REGISTER: {
    SUCCESS: 'Registration successful',
    USER_ALREADY_EXISTS: 'User already registered',
    REQUIRED_FIELDS: 'Please fill in all required fields',
  },
  GENERAL: {
    SUCCESS: 'Operation completed successfully',
    UNEXPECTED_ERROR: 'Unexpected error',
    USER_NOT_AUTHENTICATED: 'User not authenticated',
    INVALID_TOKEN: 'Invalid or expired token',
    SERVER_ERROR: 'Internal server error',
  },
} as const;

export const httpStatusCodes = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_SERVER_ERROR: 500,
} as const;
