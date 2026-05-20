"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function AnalyticsEvent({
  name,
  properties
}: {
  name: string;
  properties?: Record<string, unknown>;
}) {
  useEffect(() => {
    trackEvent(name, properties);
  }, [name, properties]);

  return null;
}
