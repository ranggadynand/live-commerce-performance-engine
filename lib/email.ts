import { Resend } from "resend";
import { LiveRow, Platform } from "./types";
import { aggregate } from "./metrics";
import { diagnose } from "./diagnostics";
import { inRange } from "./dates";

type Route = { name: string; email: string; brands: string[] };

export function routes(): Route[] {
  try {
    return JSON.parse(process.env.AE_ROUTING_JSON || "[]");
  } catch {
    return [];
  }
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function windows(now = new Date()) {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);

  const baselineEnd = new Date(y);
  baselineEnd.setDate(baselineEnd.getDate() - 1);

  const baselineStart = new Date(baselineEnd);
  baselineStart.setDate(baselineStart.getDate() - 6);

  return {
    current: { start: iso(y), end: iso(y) },
    baseline: { start: iso(baselineStart), end: iso(baselineEnd) },
  };
}

export function buildDailyEmail(ae: Route, rows: LiveRow[]) {
  const w = windows();

  const cards = ae.brands
    .flatMap((brand) =>
      (["TikTok", "Shopee"] as Platform[]).map((platform) => {
        const currentRows = rows.filter(
          (r) =>
            r.brand === brand &&
            r.platform === platform &&
            inRange(r.date, w.current)
        );

        const baselineRows = rows.filter(
          (r) =>
            r.brand === brand &&
            r.platform === platform &&
            inRange(r.date, w.baseline)
        );

        if (!currentRows.length) return "";

        const current = aggregate(currentRows);
        const baseline = aggregate(
          baselineRows.length ? baselineRows : currentRows
        );

        const d = diagnose(current, baseline, platform);

        return `
          <div style="border:1px solid #e4e7ec;border-radius:12px;padding:16px;margin:12px 0">
            <b>${brand} · ${platform}</b>
            <p><b>Result:</b> ${d.resultStatus} &nbsp; | &nbsp; <b>Funnel:</b> ${d.funnelHealth}</p>
            <p><b>GMV/H:</b> Rp ${Math.round(current.gmvPerHour).toLocaleString("id-ID")}</p>
            <p><b>Main driver:</b> ${d.primaryDriver}</p>
            <p>${d.summary}</p>
            <p><b>Action:</b> ${d.actions[0]}</p>
          </div>
        `;
      })
    )
    .join("");

  return {
    subject: `Daily Live Performance · ${ae.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:760px">
        <h2>Daily Live Commerce Brief</h2>
        <p>Result → Driver → Diagnosis → Action → Owner</p>
        ${cards || "<p>No mapped live data for yesterday.</p>"}
      </div>
    `,
  };
}

export async function sendDaily(ae: Route, rows: LiveRow[]) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error("Email env vars missing");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const message = buildDailyEmail(ae, rows);

  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: ae.email,
    subject: message.subject,
    html: message.html,
  });
}
