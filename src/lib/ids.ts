/** Generate a text primary key for InsForge tables. */
export function newId(): string {
  return crypto.randomUUID();
}
