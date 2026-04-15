import type { Item } from "../../src/data/types";
import type { DigestData, DigestSection } from "./types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function dDay(deadlineAt: string, now: Date): string {
  const deadline = new Date(deadlineAt);
  const diff = Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getCanonicalUrl(item: Item): string {
  const canonical = item.links.find((l) => l.kind === "canonical");
  return canonical?.url ?? item.links[0]?.url ?? "#";
}

function renderGovItem(item: Item): string {
  const url = getCanonicalUrl(item);
  const title = escapeHtml(item.title);
  const date = formatDate(item.publishedAt);
  const budget = item.budgetKrwOk
    ? `<span style="color:#6b7280;font-size:12px;"> | ${item.budgetKrwOk}억원</span>`
    : "";
  const source = escapeHtml(item.sourceName);

  return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">
        <a href="${url}" target="_blank" style="color:#1d4ed8;text-decoration:none;font-size:14px;font-weight:500;">${title}</a>
        <div style="margin-top:2px;font-size:12px;color:#9ca3af;">${source} | ${date}${budget}</div>
      </td>
    </tr>`;
}

function renderDeadlineItem(item: Item, now: Date): string {
  const url = getCanonicalUrl(item);
  const title = escapeHtml(item.title);
  const deadline = item.deadlineAt ? formatDate(item.deadlineAt) : "";
  const badge = item.deadlineAt ? dDay(item.deadlineAt, now) : "";
  const dNum = item.deadlineAt
    ? Math.ceil((new Date(item.deadlineAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 99;
  const badgeColor = dNum <= 3 ? "#dc2626" : "#f59e0b";

  return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">
        <span style="display:inline-block;background:${badgeColor};color:#fff;font-size:11px;font-weight:700;padding:2px 6px;border-radius:3px;vertical-align:middle;margin-right:6px;">${badge}</span>
        <a href="${url}" target="_blank" style="color:#1d4ed8;text-decoration:none;font-size:14px;font-weight:500;vertical-align:middle;">${title}</a>
        <div style="margin-top:2px;font-size:12px;color:#9ca3af;">마감: ${deadline}</div>
      </td>
    </tr>`;
}

function renderNewsItem(item: Item): string {
  const url = getCanonicalUrl(item);
  const title = escapeHtml(item.title);
  const source = escapeHtml(item.sourceName);

  return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">
        <a href="${url}" target="_blank" style="color:#1d4ed8;text-decoration:none;font-size:14px;font-weight:500;">${title}</a>
        <div style="margin-top:2px;font-size:12px;color:#9ca3af;">${source}</div>
      </td>
    </tr>`;
}

function renderSection(
  section: DigestSection,
  now: Date,
  isDeadlineSection: boolean,
): string {
  if (section.items.length === 0) return "";

  const rows = section.items
    .map((item) => {
      if (isDeadlineSection) return renderDeadlineItem(item, now);
      if (item.itemType === "gov") return renderGovItem(item);
      return renderNewsItem(item);
    })
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="border-left:4px solid ${section.color};padding:8px 12px;font-size:16px;font-weight:700;color:#1f2937;background:#f9fafb;">
          ${escapeHtml(section.title)} (${section.items.length})
        </td>
      </tr>
      ${rows}
    </table>`;
}

export function renderDigestHtml(data: DigestData, now?: Date): string {
  const renderNow = now ?? new Date();
  const sections = data.sections
    .map((section, i) => renderSection(section, renderNow, i === 1))
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="100%" style="max-width:640px;background:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#1e293b;padding:20px 24px;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;">Physical AI Radar</div>
              <div style="font-size:13px;color:#94a3b8;margin-top:4px;">${data.date} (${data.dayOfWeek}) 일일 클리핑</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px;">
              ${sections}
              ${data.isEmpty ? '<p style="color:#9ca3af;font-size:14px;text-align:center;padding:32px 0;">오늘은 주요 항목이 없습니다.</p>' : ""}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 24px;border-top:1px solid #e5e7eb;">
              <div style="font-size:12px;color:#9ca3af;text-align:center;">
                <a href="${data.dashboardUrl}" target="_blank" style="color:#6b7280;text-decoration:underline;">웹 대시보드에서 전체 보기</a>
                <br><br>
                이 메일은 Physical AI Radar에서 자동 발송되었습니다.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildSubject(data: DigestData): string {
  return `[PA Radar] ${data.date} 일일 클리핑`;
}
