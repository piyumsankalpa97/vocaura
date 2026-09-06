import { NextResponse } from "next/server";
import { generateWeeklySummary } from "@/lib/analytics/weekly-summary";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    // Optional: Protect with a cron secret in production
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    
    // We want to generate summaries for the past 7 days ending today.
    const today = new Date();
    
    // 1. Get all unique users who had practice sessions in the last 7 days
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    // Actually, getting all users who have sessions. We can just query `auth.users`
    // but auth.users is not accessible via generic RPC without a custom function, or we can use admin API
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      throw userError;
    }

    const results = [];
    const errors = [];

    // 2. Generate summary for each user
    for (const user of users.users) {
      try {
        const summary = await generateWeeklySummary(supabase, user.id, today);
        results.push({ userId: user.id, success: true, summaryId: summary.id });
      } catch (err: any) {
        console.error(`Failed to generate summary for user ${user.id}:`, err);
        errors.push({ userId: user.id, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      errors: errors.length > 0 ? errors : undefined,
      results
    });
  } catch (error: any) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Support GET for easier manual triggering from browser during dev
export async function GET(req: Request) {
  return POST(req);
}
