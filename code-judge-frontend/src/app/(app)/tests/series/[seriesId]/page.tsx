"use client";

import { use } from "react";
import { TestSeriesDetail } from "@/components/tests/TestSeriesDetail";

export default function TestSeriesDetailPage({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = use(params);
  return <TestSeriesDetail seriesId={seriesId} />;
}