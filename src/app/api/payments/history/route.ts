import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, string>).id;
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "seeker";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("Payment")
      .select("id, type, amount, currency, status, createdAt, metadata, stripePaymentId", { count: "exact" })
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1);

    if (role === "seeker") {
      query = query.in("type", ["CALL_PAYMENT", "GROUP_SESSION_PAYMENT"]);
    } else {
      query = query.eq("type", "GUIDE_PAYOUT");
    }

    const { data: payments, error, count } = await query;

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      payments: payments || [],
      pagination: {
        page,
        totalPages,
        total: count || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
