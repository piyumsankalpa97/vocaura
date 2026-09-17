import { createClient } from "@/lib/supabase/server";

export type SessionHistoryItem = {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  prompt_title: string | null;
  category_name: string | null;
  overall_score: number | null;
  duration_seconds: number | null;
};

export type SessionsHistoryResult = {
  sessions: SessionHistoryItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export async function getSessionsHistory({
  page = 1,
  pageSize = 20,
}: {
  page?: number;
  pageSize?: number;
} = {}): Promise<SessionsHistoryResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      sessions: [],
      totalCount: 0,
      totalPages: 1,
      page,
      pageSize,
    };
  }

  const currentPage = Math.max(1, page);
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from("practice_sessions")
    .select(
      `
      id,
      created_at,
      completed_at,
      status,
      practice_prompts ( title ),
      practice_categories ( name ),
      evaluations ( overall_score ),
      recordings ( duration_seconds )
    `,
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to fetch sessions history:", error);
    return {
      sessions: [],
      totalCount: 0,
      totalPages: 1,
      page: currentPage,
      pageSize,
    };
  }

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const sessions: SessionHistoryItem[] = (data || []).map((session: any) => {
    // Handle Supabase relationships (array or object depending on relation type)
    const score = Array.isArray(session.evaluations) 
      ? session.evaluations[0]?.overall_score 
      : session.evaluations?.overall_score;
      
    const duration = Array.isArray(session.recordings)
      ? session.recordings[0]?.duration_seconds
      : session.recordings?.duration_seconds;

    return {
      id: session.id,
      created_at: session.created_at,
      completed_at: session.completed_at,
      status: session.status,
      prompt_title: session.practice_prompts?.title || "Custom Practice",
      category_name: session.practice_categories?.name || "General",
      overall_score: score ?? null,
      duration_seconds: duration ?? null,
    };
  });

  return {
    sessions,
    totalCount,
    totalPages,
    page: currentPage,
    pageSize,
  };
}
