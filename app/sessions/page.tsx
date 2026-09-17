import { getSessionsHistory } from "@/app/actions/sessions";
import { PageHeader } from "@/components/layout/page-header";
import { History, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Link from "next/link";

export const metadata = {
  title: "Session History | Vocaura",
};

interface SessionsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function SessionsPage({ searchParams }: SessionsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSize = 20;

  const { sessions, totalCount, totalPages } = await getSessionsHistory({
    page,
    pageSize,
  });

  function formatDuration(seconds: number | null) {
    if (seconds == null) return "--";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function getStatusBadge(status: string) {
    switch (status.toLowerCase()) {
      case "completed":
        return (
          <Badge
            variant="default"
            className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
          >
            Completed
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "analyzing":
      case "transcribing":
      case "uploaded":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20"
          >
            Processing
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="capitalize">
            {status}
          </Badge>
        );
    }
  }

  const startItem = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalCount);

  function getPageNumbers() {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <History size={15} className="text-primary" />
            Session History
          </div>
        }
        title="Your Practice Sessions"
        description="Review all your past attempts, scores, and feedback."
      />

      <div className="space-y-4">
        {totalCount > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <span className="font-medium text-foreground">{startItem}</span>–
              <span className="font-medium text-foreground">{endItem}</span> of{" "}
              <span className="font-medium text-foreground">{totalCount}</span> sessions
            </span>
            <span>20 per page</span>
          </div>
        )}

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Topic</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Duration</th>
                  <th className="px-6 py-4 font-medium">Score</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      {totalCount > 0 ? (
                        <div className="space-y-2">
                          <p>No sessions found on page {page}.</p>
                          <Link
                            href="/sessions?page=1"
                            className="text-xs text-primary hover:underline"
                          >
                            Go to first page
                          </Link>
                        </div>
                      ) : (
                        "No sessions found. Start practicing to see your history here!"
                      )}
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr
                      key={session.id}
                      className="hover:bg-secondary/20 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td
                        className="px-6 py-4 font-medium text-foreground max-w-[200px] truncate"
                        title={session.prompt_title || "Custom Practice"}
                      >
                        {session.prompt_title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {session.category_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {formatDuration(session.duration_seconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {session.overall_score != null ? (
                          <span className="font-semibold text-foreground">
                            {session.overall_score}{" "}
                            <span className="text-xs text-muted-foreground font-normal">
                              / 100
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(session.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          href={`/session/${session.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          View Details
                          <ArrowRight
                            size={14}
                            className="group-hover:translate-x-0.5 transition-transform"
                          />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {totalPages > 1 && (
          <div className="pt-2 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={page > 1 ? `/sessions?page=${page - 1}` : `/sessions?page=1`}
                    disabled={page <= 1}
                  />
                </PaginationItem>

                {getPageNumbers().map((p, idx) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href={`/sessions?page=${p}`}
                        isActive={p === page}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    href={
                      page < totalPages
                        ? `/sessions?page=${page + 1}`
                        : `/sessions?page=${totalPages}`
                    }
                    disabled={page >= totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
