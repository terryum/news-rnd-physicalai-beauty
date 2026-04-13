import { RadarDashboard } from "@/components/radar-dashboard";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Physical AI Radar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          제조 피지컬AI 정부과제 · 뉴스 자동 수집 대시보드
        </p>
      </header>
      <RadarDashboard />
    </main>
  );
}
