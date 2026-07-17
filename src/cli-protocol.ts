import type { ValidationIssue } from "./validate.js";

export const CLI_PROTOCOL_VERSION = "1";

export const EXIT_CODES = {
  success: 0,
  operationalFailure: 1,
  invalidInput: 2,
} as const;

export type CliCommand =
  | "render"
  | "example"
  | "validate"
  | "schema"
  | "prompt"
  | "themes";
export type CliErrorClass = "invalid_input" | "operational";
export type CliErrorCode =
  | "INVALID_ARGUMENT"
  | "INVALID_JSON"
  | "INVALID_PLAN"
  | "INPUT_READ_FAILED"
  | "CONFIG_READ_FAILED"
  | "RENDER_FAILED"
  | "OUTPUT_WRITE_FAILED"
  | "BROWSER_OPEN_FAILED"
  | "INTERNAL_ERROR";

interface SuccessEnvelope<T> {
  protocolVersion: typeof CLI_PROTOCOL_VERSION;
  ok: true;
  command: CliCommand;
  data: T;
}

interface ErrorEnvelope {
  protocolVersion: typeof CLI_PROTOCOL_VERSION;
  ok: false;
  command: CliCommand;
  error: {
    code: CliErrorCode;
    class: CliErrorClass;
    message: string;
    details?: Readonly<Record<string, unknown>>;
    diagnostics?: ValidationIssue[];
  };
}

interface CliFailureOptions {
  details?: Readonly<Record<string, unknown>>;
  diagnostics?: ValidationIssue[];
}

export class CliFailure extends Error {
  readonly code: CliErrorCode;
  readonly errorClass: CliErrorClass;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly diagnostics?: ValidationIssue[];

  constructor(
    code: CliErrorCode,
    errorClass: CliErrorClass,
    message: string,
    options: CliFailureOptions = {},
  ) {
    super(message);
    this.name = "CliFailure";
    this.code = code;
    this.errorClass = errorClass;
    if (options.details) this.details = options.details;
    if (options.diagnostics) this.diagnostics = options.diagnostics;
  }

  get exitCode(): number {
    return this.errorClass === "invalid_input"
      ? EXIT_CODES.invalidInput
      : EXIT_CODES.operationalFailure;
  }
}

export function successEnvelope<T>(
  command: CliCommand,
  data: T,
): SuccessEnvelope<T> {
  return {
    protocolVersion: CLI_PROTOCOL_VERSION,
    ok: true,
    command,
    data,
  };
}

export function errorEnvelope(command: CliCommand, failure: CliFailure): ErrorEnvelope {
  return {
    protocolVersion: CLI_PROTOCOL_VERSION,
    ok: false,
    command,
    error: {
      code: failure.code,
      class: failure.errorClass,
      message: failure.message,
      ...(failure.details ? { details: failure.details } : {}),
      ...(failure.diagnostics ? { diagnostics: failure.diagnostics } : {}),
    },
  };
}

export function serializeEnvelope(envelope: SuccessEnvelope<unknown> | ErrorEnvelope): string {
  return `${JSON.stringify(envelope)}\n`;
}
