// Typed errors returned by the billing service. Controllers translate these
// into the API's { success: false, message } envelope.

export class BillingError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  /**
   * Creates a typed billing error carrying an HTTP status, a stable machine-readable code, a safe user message, and optional details. Controllers use these fields to build the API error envelope.
   */
  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "BillingError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Narrows an unknown caught value to BillingError. This keeps controller error handling type-safe without relying on message matching.
 */
export function isBillingError(error: unknown): error is BillingError {
  return error instanceof BillingError;
}
