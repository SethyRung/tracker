import { ApiResponseCode, type ApiResponse } from "#shared/types/response";

export function createResponse<T>(
  status: { code: ApiResponseCode.Success; message?: string },
  data: T,
  meta?: { total: number; limit: number; offset: number },
): ApiResponse<T>;
export function createResponse(
  status: { code: Exclude<ApiResponseCode, ApiResponseCode.Success>; message?: string },
  data?: null,
): ApiResponse<never>;
export function createResponse<T>(
  status: { code: ApiResponseCode; message?: string },
  data: T,
  meta?: { total: number; limit: number; offset: number },
): ApiResponse<T> {
  return {
    status: {
      code: status.code,
      message: status.message ?? "",
      requestId: crypto.randomUUID(),
      requestTime: Date.now(),
    },
    data: data as T,
    meta,
  } as ApiResponse<T>;
}
