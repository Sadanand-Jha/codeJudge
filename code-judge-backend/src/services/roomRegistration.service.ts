// Room registration forms — creator-defined fields and the answers students
// submit before a membership is created. Kept Express/DB-free so the rules are
// unit-testable.

export const ROOM_REGISTRATION_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "number",
  "select",
] as const;

export type RoomRegistrationFieldType = (typeof ROOM_REGISTRATION_FIELD_TYPES)[number];

export interface RoomRegistrationField {
  id: string;
  label: string;
  type: RoomRegistrationFieldType;
  required: boolean;
  options: string[];
}

export interface RoomRegistrationForm {
  title: string;
  description: string;
  fields: RoomRegistrationField[];
}

export const ROOM_REGISTRATION_LIMITS = {
  maxFields: 30,
  maxLabel: 200,
  maxValue: 500,
  maxOptions: 20,
  maxOptionLength: 100,
  maxTitle: 120,
  maxDescription: 500,
} as const;

export const DEFAULT_ROOM_REGISTRATION_FORM: RoomRegistrationForm = {
  title: "Student registration",
  description: "",
  fields: [],
};

const FIELD_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

function asTrimmedString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const options: string[] = [];
  for (const entry of raw) {
    const option = asTrimmedString(entry, ROOM_REGISTRATION_LIMITS.maxOptionLength);
    if (!option || seen.has(option)) continue;
    seen.add(option);
    options.push(option);
    if (options.length >= ROOM_REGISTRATION_LIMITS.maxOptions) break;
  }
  return options;
}

/**
 * Coerce stored JSON (possibly from an older client or a hand-edited row) into
 * a clean form. Invalid fields are dropped rather than crashing the join flow.
 * Labels are unique (case-insensitive) because answers are keyed by label.
 */
export function normalizeRoomRegistrationForm(raw: unknown): RoomRegistrationForm {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const title =
    asTrimmedString(source.title, ROOM_REGISTRATION_LIMITS.maxTitle) ||
    DEFAULT_ROOM_REGISTRATION_FORM.title;
  const description = asTrimmedString(
    source.description,
    ROOM_REGISTRATION_LIMITS.maxDescription
  );

  const rawFields = Array.isArray(source.fields)
    ? source.fields.slice(0, ROOM_REGISTRATION_LIMITS.maxFields)
    : [];
  const usedIds = new Set<string>();
  const usedLabels = new Set<string>();
  const fields: RoomRegistrationField[] = [];

  rawFields.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const field = entry as Record<string, unknown>;
    const label = asTrimmedString(field.label, ROOM_REGISTRATION_LIMITS.maxLabel);
    const labelKey = label.toLowerCase();
    if (!label || usedLabels.has(labelKey)) return;

    let id = typeof field.id === "string" ? field.id.trim() : "";
    if (!FIELD_ID_PATTERN.test(id) || usedIds.has(id)) {
      id = `rf_${index + 1}`;
      let suffix = 2;
      while (usedIds.has(id)) id = `rf_${index + 1}_${suffix++}`;
    }

    const type = ROOM_REGISTRATION_FIELD_TYPES.includes(
      field.type as RoomRegistrationFieldType
    )
      ? (field.type as RoomRegistrationFieldType)
      : "text";

    let options = type === "select" ? normalizeOptions(field.options) : [];
    // A select without options is unusable — treat it as a text field.
    const resolvedType = type === "select" && options.length === 0 ? "text" : type;
    if (resolvedType !== "select") options = [];

    usedIds.add(id);
    usedLabels.add(labelKey);
    fields.push({
      id,
      label,
      type: resolvedType,
      required: field.required !== false,
      options,
    });
  });

  return { title, description, fields };
}

export interface RoomRegistrationValidation {
  ok: boolean;
  /** Trimmed answers for known fields; optional blanks are omitted. */
  values: Record<string, string>;
  /** Label → human-readable error. */
  fieldErrors: Record<string, string>;
}

function validateFieldValue(field: RoomRegistrationField, value: string): string | null {
  if (value.length > ROOM_REGISTRATION_LIMITS.maxValue) {
    return `Please keep this under ${ROOM_REGISTRATION_LIMITS.maxValue} characters.`;
  }

  if (field.type === "email" && !EMAIL_PATTERN.test(value)) {
    return "Enter a valid email address.";
  }

  if (field.type === "phone") {
    const digits = value.replace(/\D/g, "");
    if (!/^\+?[0-9][0-9\s\-()]*$/.test(value) || digits.length < 7 || digits.length > 15) {
      return "Enter a valid phone number.";
    }
  }

  if (field.type === "number" && !NUMBER_PATTERN.test(value)) {
    return "Enter a valid number.";
  }

  if (field.type === "select" && !field.options.includes(value)) {
    return "Choose one of the available options.";
  }

  return null;
}

/**
 * Validate the student's answers against the creator's form. Unknown keys are
 * ignored, required fields must be present and select values must be options.
 */
export function validateRoomRegistrationData(
  form: RoomRegistrationForm,
  rawData: unknown
): RoomRegistrationValidation {
  const data =
    rawData && typeof rawData === "object" && !Array.isArray(rawData)
      ? (rawData as Record<string, unknown>)
      : {};

  const values: Record<string, string> = {};
  const fieldErrors: Record<string, string> = {};

  for (const field of form.fields) {
    const value = asTrimmedString(data[field.label], ROOM_REGISTRATION_LIMITS.maxValue);

    if (!value) {
      if (field.required) fieldErrors[field.label] = "This field is required.";
      continue;
    }

    const error = validateFieldValue(field, value);
    if (error) fieldErrors[field.label] = error;
    else values[field.label] = value;
  }

  return {
    ok: Object.keys(fieldErrors).length === 0,
    values,
    fieldErrors,
  };
}

export function isRoomRegistrationFormEmpty(form: RoomRegistrationForm): boolean {
  return form.fields.length === 0;
}
