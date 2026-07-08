import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard";
import { StaffLogin } from "@/components/staff-login";
import { isDashboardProtected, isStaffAuthenticated } from "@/lib/auth";
import { getStore } from "@/lib/storage";

export const metadata: Metadata = {
  title: "Staff dashboard · Community Intake Assistant",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await isStaffAuthenticated())) {
    return <StaffLogin />;
  }
  const store = getStore();
  const submissions = await store.list();
  return (
    <Dashboard
      initialSubmissions={submissions}
      initialBackend={store.backend}
      isProtected={isDashboardProtected()}
    />
  );
}
