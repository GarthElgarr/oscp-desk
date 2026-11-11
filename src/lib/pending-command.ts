import { redactStoredCommand, storedCommand } from "./redact-command.ts";

/** The line shown on a run card before the server answers. Built from args when the route receives an args array. */
export function pendingCommand(tool: string, body: Record<string, unknown>): string {
  const args = body.args;
  if (Array.isArray(args) && args.every((arg) => typeof arg === "string")) {
    return redactStoredCommand(storedCommand(tool, args)).slice(0, 500);
  }
  const command = typeof body.command === "string" && body.command.trim() ? body.command : tool;
  return redactStoredCommand(command).slice(0, 500);
}
