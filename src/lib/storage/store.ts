import type { IntakeInput, Status, Submission, Triage } from "@/lib/types";

export interface CreateSubmissionArgs {
  input: IntakeInput;
  triage: Triage;
}

export interface UpdateSubmissionArgs {
  status?: Status;
  staffNotes?: string;
  /** Self-reported staff display name credited with this change, if any. */
  actor?: string;
  /**
   * `undefined` = don't touch; `null` = explicitly unpublish; object = publish/replace.
   * Both adapters must distinguish "absent" from "null" here, not merge with `??`.
   */
  publishedReply?: Submission["publishedReply"];
}

/**
 * Storage contract shared by the local JSON store and the Supabase store. The
 * rest of the app only depends on this interface, so swapping backends is a
 * one-line change and the app runs with zero external services out of the box.
 */
export interface SubmissionStore {
  create(args: CreateSubmissionArgs): Promise<Submission>;
  list(): Promise<Submission[]>;
  get(id: string): Promise<Submission | null>;
  update(id: string, args: UpdateSubmissionArgs): Promise<Submission | null>;
  /** Permanently removes a submission. Returns false if it didn't exist. */
  delete(id: string): Promise<boolean>;
  /** Human-readable name of the active backend, surfaced in the UI. */
  readonly backend: "supabase" | "local-json";
}
