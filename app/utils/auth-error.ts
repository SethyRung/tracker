interface AuthError {
  code?: string;
  message?: string;
}

interface FriendlyError {
  title: string;
  description: string;
}

const ERROR_MAP: Record<string, FriendlyError> = {
  INVALID_PASSWORD: {
    title: "Incorrect password",
    description:
      "The password you entered doesn't match our records. Try again or reset your password.",
  },
  INVALID_EMAIL: {
    title: "Invalid email",
    description: "Please check that you entered a valid email address.",
  },
  USER_NOT_FOUND: {
    title: "Account not found",
    description: "No account exists with this email. Sign up to create one.",
  },
  EMAIL_NOT_VERIFIED: {
    title: "Email not verified",
    description: "Check your inbox for a verification link before signing in.",
  },
  PASSWORD_TOO_SHORT: {
    title: "Password too short",
    description: "Password must be at least 8 characters long.",
  },
  PASSWORD_TOO_LONG: {
    title: "Password too long",
    description: "Password must be 128 characters or fewer.",
  },
  USER_ALREADY_EXISTS: {
    title: "Account already exists",
    description: "An account with this email is already registered. Try signing in instead.",
  },
  COULDNT_UPDATE_YOUR_PASSWORD: {
    title: "Password not updated",
    description: "Something went wrong updating your password. Please try again.",
  },
  RATE_LIMIT_EXCEEDED: {
    title: "Too many attempts",
    description: "You've tried too many times. Please wait a moment and try again.",
  },
  FAILED_TO_CREATE_USER: {
    title: "Could not create account",
    description: "Something went wrong on our end. Please try again in a moment.",
  },
};

export function humaniseAuthError(error: AuthError | null | undefined): FriendlyError | null {
  if (!error) return null;

  if (error.code && ERROR_MAP[error.code]) {
    return ERROR_MAP[error.code]!;
  }

  const title = error.code
    ? error.code
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/^./, (c) => c.toUpperCase())
    : "Something went wrong";

  return {
    title,
    description: error.message ?? "An unexpected error occurred. Please try again.",
  };
}
