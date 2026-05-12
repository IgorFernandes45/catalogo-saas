"use client";

import { useState } from "react";

import { formatCurrency } from "@/lib/utils";

type DayEntry = {
  label: string;
  orders: number;
  revenue: number;
};

export function SalesBarChart({ data }: { data: DayEntry[] }) {
  const [tooltip, setTooltip] = useState<number | null>(null);

  if (!data.length) {
    return null;
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const chartHeight = 160;
  const barWidth = Math.max(24, Math.min(48, Math.floor(560 / data.length) - 8));
  const gap = Math.max(4, Math.min(12, Math.floor(80 / data.length)));
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <div className="mt-6 overflow-x-auto">
      <div style={{ minWidth: totalWidth + 48 }}>
        <svg
          width="100%"
          viewBox={`0 0 ${totalWidth + 8} ${chartHeight + 48}`}
          className="overflow-visible"
        >
          {data.map((day, i) => {
            const barHeight = Math.max(4, (day.revenue / maxRevenue) * chartHeight);
            const x = i * (barWidth + gap);
            const y = chartHeight - barHeight;
            const isHovered = tooltip === i;

            return (
              <g
                key={`${day.label}-${i}`}
                onMouseEnter={() => setTooltip(i)}
                onMouseLeave={() => setTooltip(null)}
                className="cursor-default"
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={6}
                  fill={isHovered ? "#0f172a" : "#e2e8f0"}
                  className="transition-all duration-150"
                />
                {isHovered ? (
                  <g>
                    <rect
                      x={Math.min(x - 4, totalWidth - 120)}
                      y={Math.max(0, y - 46)}
                      width={120}
                      height={40}
                      rx={8}
                      fill="#0f172a"
                    />
                    <text
                      x={Math.min(x - 4, totalWidth - 120) + 10}
                      y={Math.max(0, y - 46) + 14}
                      fill="white"
                      fontSize={10}
                      fontWeight="600"
                    >
                      {day.label}
                    </text>
                    <text
                      x={Math.min(x - 4, totalWidth - 120) + 10}
                      y={Math.max(0, y - 46) + 28}
                      fill="white"
                      fontSize={11}
                      fontWeight="700"
                    >
                      {formatCurrency(day.revenue)}
                    </text>
                  </g>
                ) : null}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={9}
                >
                  {day.label.length > 5 ? day.label.slice(0, 5) : day.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>
          Pico:{" "}
          <strong className="text-slate-700">
            {formatCurrency(maxRevenue)}
          </strong>
        </span>
        <span>
          Total:{" "}
          <strong className="text-slate-700">
            {formatCurrency(data.reduce((s, d) => s + d.revenue, 0))}
          </strong>
        </span>
        <span>
          Dias com venda:{" "}
          <strong className="text-slate-700">
            {data.filter((d) => d.revenue > 0).length}
          </strong>
        </span>
      </div>
    </div>
  );
}
