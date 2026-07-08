import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Submission } from "@/lib/types";
import type {
  CreateSubmissionArgs,
  SubmissionStore,
  UpdateSubmissionArgs,
} from "@/lib/storage/store";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "submissions.json");

/**
 * A dependency-free JSON-file store so the project runs immediately after
 * `npm install` without provisioning a database. Not intended for real
 * production traffic — configure Supabase for that — but perfect for local
 * development and evaluating the workflow end to end.
 */
export class LocalSubmissionStore implements SubmissionStore {
  readonly backend = "local-json" as const;

  private async readAll(): Promise<Submission[]> {
    try {
      const raw = await readFile(DATA_FILE, "utf8");
      return JSON.parse(raw) as Submission[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async writeAll(submissions: Submission[]): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(submissions, null, 2), "utf8");
  }

  async create({ input, triage }: CreateSubmissionArgs): Promise<Submission> {
    const submissions = await this.readAll();
    const now = new Date().toISOString();
    const submission: Submission = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: "new",
      input,
      triage,
      staffNotes: "",
    };
    submissions.push(submission);
    await this.writeAll(submissions);
    return submission;
  }

  async list(): Promise<Submission[]> {
    const submissions = await this.readAll();
    return submissions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<Submission | null> {
    const submissions = await this.readAll();
    return submissions.find((s) => s.id === id) ?? null;
  }

  async update(id: string, args: UpdateSubmissionArgs): Promise<Submission | null> {
    const submissions = await this.readAll();
    const index = submissions.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const existing = submissions[index];
    const updated: Submission = {
      ...existing,
      status: args.status ?? existing.status,
      staffNotes: args.staffNotes ?? existing.staffNotes,
      reviewedBy: args.actor ?? existing.reviewedBy,
      updatedAt: new Date().toISOString(),
    };
    submissions[index] = updated;
    await this.writeAll(submissions);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const submissions = await this.readAll();
    const next = submissions.filter((s) => s.id !== id);
    if (next.length === submissions.length) return false;
    await this.writeAll(next);
    return true;
  }
}
