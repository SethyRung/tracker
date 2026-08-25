import { ApiResponseCode, type ApiResponse, type ApiResponseSuccess } from "../types/response";

export function isSuccessResponse<T>(res?: ApiResponse<T> | null): res is ApiResponseSuccess<T> {
  return !!res && res.status.code === ApiResponseCode.Success;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : fallback;
}
