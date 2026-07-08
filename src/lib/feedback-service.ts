/**
 * Persist in-app user feedback to InsForge Postgres.
 */
import { getInsforgeAdmin } from "@/lib/db";
import { newId } from "@/lib/ids";

const MAX_MESSAGE_LENGTH = 2000;

export function normalizeFeedbackMessage(message: string): string {
  return message.trim();
}

export function validateFeedbackMessage(message: string): string | null {
  const normalized = normalizeFeedbackMessage(message);
  if (!normalized) return "Message is required";
  if (normalized.length > MAX_MESSAGE_LENGTH) {
    return `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`;
  }
  return null;
}

export async function submitFeedback(userId: string, message: string) {
  const validationError = validateFeedbackMessage(message);
  if (validationError) throw new Error(validationError);

  const db = getInsforgeAdmin();
  const normalized = normalizeFeedbackMessage(message);

  const { data, error } = await db.database
    .from("feedback")
    .insert([
      {
        id: newId(),
        user_id: userId,
        message: normalized,
      },
    ])
    .select("id, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
