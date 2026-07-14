import { MetricCards } from "./_components/metric-cards";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Welcome to your learning management system. Monitor key metrics at a glance.
        </p>
      </div>
      <MetricCards />
    </div>
  );
}
