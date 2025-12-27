export type ApiResponse<T = unknown> = {
  statusCode: number;
  message: string;
  code?: string;
  data?: T;
  elapsedTime?: string;
};

export function createResponse<T>(
  statusCode: number,
  message: string,
  data?: T,
  elapsedTime?: string,
  code?: string,
): ApiResponse<T> {
  const response: ApiResponse<T> = { statusCode, message };

  if (code !== undefined) {
    response.code = code;
  }

  if (data !== undefined) {
    response.data = data;
  }

  if (elapsedTime !== undefined) {
    response.elapsedTime = elapsedTime;
  }

  return response;
}
