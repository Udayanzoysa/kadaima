import { Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { AuthShell, authPrimaryButtonClass } from "../auth/_components/auth-shell";

export default function page() {
  return (
    <AuthShell
      icon={<Lock className="size-7" strokeWidth={1.75} />}
      title="Unauthorized access"
      description="You do not have permission to view this page. Contact an administrator if you think this is a mistake."
      backHref="/login"
      backLabel="Back to Login"
    >
      <Button asChild className={authPrimaryButtonClass}>
        <Link prefetch={false} href="/admin">
          Go to dashboard
        </Link>
      </Button>
    </AuthShell>
  );
}
