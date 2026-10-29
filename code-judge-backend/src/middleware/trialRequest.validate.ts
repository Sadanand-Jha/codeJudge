// Validation for the Basic trial request and owner review endpoints.
import { z } from "zod";

const noteField = z
  .string()
  .trim()
  .max(500, "Note must be 500 characters or fewer")
  .optional()
  .nullable();

export const createTrialRequestSchema = z
  .object({
    note: noteField,
  })
  .default({});

export const reviewTrialRequestSchema = z
  .object({
    note: noteField,
  })
  .default({});
