import { ApiResponseCode, type ApiResponse, type ApiResponseSuccess } from "../types/response";

export function isSuccessResponse<T>(res?: ApiResponse<T> | null): res is ApiResponseSuccess<T> {
  return !!res && res.status.code === ApiResponseCode.Success;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const details = asRecord(error);
  const response = asRecord(details?.data);
  const validation = asRecord(response?.data) ?? details;

  if (validation?.name === "ZodError") {
    let issues = validation.issues;
    if (!Array.isArray(issues) && typeof validation.message === "string") {
      try {
        issues = JSON.parse(validation.message);
      } catch {
        return fallback;
      }
    }
    const message = asRecord(Array.isArray(issues) ? issues[0] : undefined)?.message;
    return typeof message === "string" &&
      !/^(Invalid input|Invalid option|Invalid string|Too small|Too big|Unrecognized key)/.test(
        message,
      )
      ? message
      : fallback;
  }

  if (response?.statusMessage === "Validation Error") return fallback;
  if (typeof response?.message === "string" && response.message) return response.message;
  if (typeof response?.statusMessage === "string" && response.statusMessage) {
    return response.statusMessage;
  }
  return typeof details?.message === "string" && details.message ? details.message : fallback;
}
