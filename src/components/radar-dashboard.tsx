"use client";

import { useState, useMemo } from "react";
import { FilterBar } from "./filter-bar";
import { ItemRow } from "./item-row";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Filters, Item } from "@/data/types";
import { DEFAULT_FILTERS } from "@/data/types";

function daysBetween(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function formatLastUpdated(iso: string | null, source: string) {
  if (source === "seed") return "시드 데이터 (크롤링 대기 중)";
  if (!iso) return "알 수 없음";
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${mins} 크롤링`;
}

interface RadarDashboardProps {
  initialItems: Item[];
  dataSource: "crawled" | "seed";
  lastUpdated: string | null;
}

export function RadarDashboard({
  initialItems,
  dataSource,
  lastUpdated,
}: RadarDashboardProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [readIds, setReadIds, readHydrated] = useLocalStorage<string[]>(
    "radar-read",
    []
  );
  const [starredIds, setStarredIds, starHydrated] = useLocalStorage<string[]>(
    "radar-starred",
    []
  );

  const items: Item[] = useMemo(
    () =>
      initialItems.map((item) => ({
        ...item,
        read: readIds.includes(item.id),
        starred: starredIds.includes(item.id),
      })),
    [initialItems, readIds, starredIds]
  );

  const filteredItems = useMemo(() => {
    const now = new Date();
    return items
      .filter((item) => {
        if (filters.itemType !== "all" && item.itemType !== filters.itemType)
          return false;
        if (
          filters.priorities.length > 0 &&
          !filters.priorities.includes(item.priority)
        )
          return false;
        if (filters.tiers.length > 0 && !filters.tiers.includes(item.tier))
          return false;
        if (filters.dateRange !== "all") {
          const pub = new Date(item.publishedAt);
          const days =
            filters.dateRange === "today"
              ? 1
              : filters.dateRange === "7d"
                ? 7
                : 30;
          if (daysBetween(now, pub) > days) return false;
        }
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const searchable = [
            item.title,
            item.sourceName,
            ...item.matchedKeywords,
            ...item.matchedCompanies,
            item.region ?? "",
          ]
            .join(" ")
            .toLowerCase();
          if (!searchable.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.starred !== b.starred) return a.starred ? -1 : 1;
        const pOrder = { P0: 0, P1: 1, P2: 2 };
        if (pOrder[a.priority] !== pOrder[b.priority])
          return pOrder[a.priority] - pOrder[b.priority];
        return (
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
        );
      });
  }, [items, filters]);

  const counts = useMemo(
    () => ({
      total: items.length,
      gov: items.filter((i) => i.itemType === "gov").length,
      news: items.filter((i) => i.itemType === "news").length,
    }),
    [items]
  );

  const toggleRead = (id: string) => {
    setReadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleStar = (id: string) => {
    setStarredIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (!readHydrated || !starHydrated) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} onChange={setFilters} counts={counts} />

      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          {filteredItems.length}건 표시 / 전체 {items.length}건
        </p>
        <p className="text-xs text-muted-foreground">
          {formatLastUpdated(lastUpdated, dataSource)}
        </p>
      </div>

      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            필터 조건에 맞는 항목이 없습니다.
          </div>
        ) : (
          filteredItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onToggleRead={toggleRead}
              onToggleStar={toggleStar}
            />
          ))
        )}
      </div>
    </div>
  );
}
