"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Calendar, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { APP_CONFIG } from "@/config/app-config";
import { getClientCookie } from "@/lib/cookie.client";
import { cn } from "@/lib/utils";

interface ChatLead {
  id: string;
  name: string;
  email: string | null;
  mobileNumber: string;
  age: number | null;
  school: string | null;
  tag: string;
  createdAt: string;
}

interface LeadsResponse {
  items: ChatLead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<ChatLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(10);

  const fetchLeads = async (pageNum: number, currentSize = pageSize) => {
    const token = getClientCookie("session_token");
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/support/chat/leads?page=${pageNum}&pageSize=${currentSize}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load leads");
      const data: LeadsResponse = await res.json();
      setLeads(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLeads(1);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-bold text-2xl tracking-tight text-slate-900">Leads Tracking</h1>
        <p className="text-muted-foreground text-sm">
          Displaying contacts and profiles collected through the chatbot and guest quiz attempts.
        </p>
      </div>

      <Card className="overflow-hidden border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-md">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-800 font-semibold text-lg flex items-center gap-2">
                <Users className="size-5 text-[#1563b8]" />
                All Lead Profiles
              </CardTitle>
              <CardDescription className="text-xs">
                Track and manage contacts collected from chatbot inquiries and guest users attempting quizzes.
              </CardDescription>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {total} Total Leads
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center gap-2">
              <Spinner className="size-6 text-[#1563b8]" />
              <span className="text-muted-foreground text-sm">Loading leads…</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto size-12 text-slate-300" />
              <p className="mt-4 font-medium text-slate-800 text-sm">No leads captured yet</p>
              <p className="mt-1 text-slate-400 text-xs">Leads will appear here as users engage with the website.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-3.5">Name</th>
                      <th className="px-6 py-3.5">Source Tag</th>
                      <th className="px-6 py-3.5">Age / School</th>
                      <th className="px-6 py-3.5">Mobile Number</th>
                      <th className="px-6 py-3.5">Email Address</th>
                      <th className="px-6 py-3.5">Captured Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads.map((lead) => {
                      return (
                        <tr key={lead.id} className="hover:bg-slate-50/40 transition">
                          <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                            {lead.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                              lead.tag === "Quiz Attempt"
                                ? "bg-purple-50 text-purple-700 ring-purple-700/10"
                                : "bg-blue-50 text-blue-700 ring-blue-700/10"
                            )}>
                              {lead.tag || "Chatbot"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                            {lead.tag === "Quiz Attempt" && lead.school ? (
                              <span className="text-sm font-medium text-slate-700">
                                {lead.school}
                              </span>
                            ) : lead.age ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="font-semibold">{lead.age}</span> yrs
                                <span className="text-muted-foreground text-xs font-normal">
                                  · (Grade {Math.max(1, lead.age - 5)} equivalent)
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <Phone className="size-3.5 text-slate-400" />
                              {lead.mobileNumber}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <Mail className="size-3.5 text-slate-400" />
                              {lead.email || "-"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-500 text-xs">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-slate-400" />
                              {new Date(lead.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs">Rows per page:</span>
                  <select
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1563b8]"
                    value={pageSize}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setPageSize(newSize);
                      void fetchLeads(1, newSize);
                    }}
                  >
                    {[10, 20, 40, 50].map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 text-xs">
                      Page <span className="font-semibold">{page}</span> of{" "}
                      <span className="font-semibold">{totalPages}</span>
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => void fetchLeads(page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => void fetchLeads(page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
