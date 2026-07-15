import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  const checks: Record<string, string> = {
    app: "ok",
    database: "unknown",
  }

  if (!process.env.DATABASE_URL) {
    checks.database = "not_configured"
    return NextResponse.json(
      { status: "degraded", checks, timestamp: new Date().toISOString() },
      { status: 503 },
    )
  }

  try {
    await query("SELECT 1 AS ok")
    checks.database = "ok"
    return NextResponse.json({
      status: "healthy",
      checks,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error("Health check DB failed:", err)
    checks.database = "error"
    return NextResponse.json(
      {
        status: "unhealthy",
        checks,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
}
