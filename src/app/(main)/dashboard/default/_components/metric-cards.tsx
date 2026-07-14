import { BookOpen, GraduationCap, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LMS_STATS = {
  totalStudents: 1248,
  totalTeachers: 86,
  totalQuizzes: 342,
} as const;

export function MetricCards() {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs md:grid-cols-3 dark:*:data-[slot=card]:bg-card">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <GraduationCap className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Total Students</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
            {LMS_STATS.totalStudents.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-sm">Enrolled across all courses</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Users className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Total Teachers</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
            {LMS_STATS.totalTeachers.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-sm">Active instructors on the platform</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <BookOpen className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Total Quizzes</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
            {LMS_STATS.totalQuizzes.toLocaleString()}
          </div>
          <p className="text-muted-foreground text-sm">Published assessments available</p>
        </CardContent>
      </Card>
    </div>
  );
}
