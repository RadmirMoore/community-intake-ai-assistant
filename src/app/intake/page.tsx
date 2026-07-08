import type { Metadata } from "next";
import { IntakeForm } from "@/components/intake-form";

export const metadata: Metadata = {
  title: "Request help · Community Intake Assistant",
};

export default function IntakePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Request help</h1>
      <p className="mt-2 text-slate-600">
        Tell us what you need and a member of our team will follow up. There are no wrong answers —
        share as much or as little as you&apos;re comfortable with.
      </p>
      <div className="mt-8">
        <IntakeForm />
      </div>
    </div>
  );
}
