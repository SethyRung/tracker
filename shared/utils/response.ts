import { ApiResponseCode, type ApiResponse, type ApiResponseSuccess } from "../types/response";

export function isSuccessResponse<T>(res?: ApiResponse<T> | null): res is ApiResponseSuccess<T> {
  return !!res && res.status.code === ApiResponseCode.Success;
}
