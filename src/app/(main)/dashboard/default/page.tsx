import { DashboardOverview } from "./_components/dashboard-overview";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DashboardOverview />
    </div>
  );
}
