import type {
  RoomRegistrationField,
  RoomRegistrationFieldType,
  RoomRegistrationForm,
} from "@/types/room";

export const ROOM_REGISTRATION_FIELD_TYPES: Array<{
  value: RoomRegistrationFieldType;
  label: string;
}> = [
  { value: "text", label: "Short text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
];

export const ROOM_REGISTRATION_LIMITS = {
  maxFields: 30,
  maxLabel: 200,
  maxValue: 500,
  maxOptions: 20,
  maxOptionLength: 100,
  maxTitle: 120,
  maxDescription: 500,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

export function emptyRegistrationForm(): RoomRegistrationForm {
  return {
    title: "Student registration",
    description: "",
    fields: [],
  };
}

export function newRegistrationField(index = 0): RoomRegistrationField {
  return {
    id: `rf_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    label: "",
    type: "text",
    required: true,
    options: [],
  };
}

export function parseRegistrationOptions(value: string): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const entry of value.split(",")) {
    const option = entry.trim().slice(0, ROOM_REGISTRATION_LIMITS.maxOptionLength);
    if (!option || seen.has(option)) continue;
    seen.add(option);
    options.push(option);
    if (options.length >= ROOM_REGISTRATION_LIMITS.maxOptions) break;
  }
  return options;
}

/** Config-time errors; an empty array means the form can be saved. */
export function validateRegistrationFormConfig(form: RoomRegistrationForm): string[] {
  const errors: string[] = [];
  if (!form.title.trim()) errors.push("Give the form a title.");
  if (!Array.isArray(form.fields) || form.fields.length === 0) {
    errors.push("Add at least one field, or leave the form empty to skip registration.");
    return errors;
  }

  const labels = new Set<string>();
  form.fields.forEach((field, index) => {
    const label = field.label.trim();
    if (!label) {
      errors.push(`Field ${index + 1} needs a label.`);
      return;
    }
    const key = label.toLowerCase();
    if (labels.has(key)) errors.push(`"${label}" is already used by another field.`);
    labels.add(key);
    if (field.type === "select" && field.options.length === 0) {
      errors.push(`Add at least one option for "${label}".`);
    }
  });
  return errors;
}

export function validateRegistrationValues(
  form: RoomRegistrationForm,
  values: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of form.fields) {
    const value = String(values[field.label] ?? "").trim();
    if (!value) {
      if (field.required) errors[field.label] = "This field is required.";
      continue;
    }
    if (value.length > ROOM_REGISTRATION_LIMITS.maxValue) {
      errors[field.label] = `Please keep this under ${ROOM_REGISTRATION_LIMITS.maxValue} characters.`;
      continue;
    }
    if (field.type === "email" && !EMAIL_PATTERN.test(value)) {
      errors[field.label] = "Enter a valid email address.";
      continue;
    }
    if (field.type === "phone") {
      const digits = value.replace(/\D/g, "");
      if (!/^\+?[0-9][0-9\s\-()]*$/.test(value) || digits.length < 7 || digits.length > 15) {
        errors[field.label] = "Enter a valid phone number.";
        continue;
      }
    }
    if (field.type === "number" && !NUMBER_PATTERN.test(value)) {
      errors[field.label] = "Enter a valid number.";
      continue;
    }
    if (field.type === "select" && !field.options.includes(value)) {
      errors[field.label] = "Choose one of the available options.";
    }
  }
  return errors;
}

export function fieldInputType(field: RoomRegistrationField): string {
  if (field.type === "email") return "email";
  if (field.type === "phone") return "tel";
  if (field.type === "number") return "number";
  return "text";
}
