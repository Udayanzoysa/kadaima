import Link from "next/link";

import { Button } from "@/components/ui/button";

import { AuthShell, authPrimaryButtonClass } from "../auth/_components/auth-shell";

export default function page() {
  return (
    <AuthShell
      title="Unauthorized access"
      description="You do not have permission to view this page. Contact an administrator if you think this is a mistake."
      backHref="/login"
      backLabel="Back to Login"
    >
      <div className="flex flex-col gap-2">
        <Button asChild className={authPrimaryButtonClass}>
          <Link prefetch={false} href="/">
            Back to quizzes
          </Link>
        </Button>
        <Button asChild variant="brandOutline">
          <Link prefetch={false} href="/admin">
            Go to dashboard
          </Link>
        </Button>
      </div>
    </AuthShell>
  );
}
