import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { IntakeInput, Status, Submission, Triage } from "@/lib/types";
import type {
  CreateSubmissionArgs,
  SubmissionStore,
  UpdateSubmissionArgs,
} from "@/lib/storage/store";

/** Shape of a row in the `submissions` table (see supabase/schema.sql). */
interface SubmissionRow {
  id: string;
  created_at: string;
  updated_at: string;
  status: Status;
  input: IntakeInput;
  triage: Triage;
  staff_notes: string;
}

function rowToSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    input: row.input,
    triage: row.triage,
    staffNotes: row.staff_notes ?? "",
  };
}

/**
 * Production-oriented store backed by Supabase (Postgres). We use the service
 * role key on the server only, so intake data is never exposed to the browser.
 */
export class SupabaseSubmissionStore implements SubmissionStore {
  readonly backend = "supabase" as const;
  private readonly client: SupabaseClient;
  private readonly table = "submissions";

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  async create({ input, triage }: CreateSubmissionArgs): Promise<Submission> {
    const { data, error } = await this.client
      .from(this.table)
      .insert({ status: "new", input, triage, staff_notes: "" })
      .select()
      .single();
    if (error) throw new Error(`Supabase insert failed: ${error.message}`);
    return rowToSubmission(data as SubmissionRow);
  }

  async list(): Promise<Submission[]> {
    const { data, error } = await this.client
      .from(this.table)
      .select()
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Supabase list failed: ${error.message}`);
    return (data as SubmissionRow[]).map(rowToSubmission);
  }

  async get(id: string): Promise<Submission | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select()
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Supabase get failed: ${error.message}`);
    return data ? rowToSubmission(data as SubmissionRow) : null;
  }

  async update(id: string, args: UpdateSubmissionArgs): Promise<Submission | null> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (args.status !== undefined) patch.status = args.status;
    if (args.staffNotes !== undefined) patch.staff_notes = args.staffNotes;

    const { data, error } = await this.client
      .from(this.table)
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`Supabase update failed: ${error.message}`);
    return data ? rowToSubmission(data as SubmissionRow) : null;
  }
}
