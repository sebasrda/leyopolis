"use client";

import React from "react";

interface ProgressDonutProps {
  completed: number;
  inProgress: number;
  toRead: number;
}

export function ProgressDonut({ completed, inProgress, toRead }: ProgressDonutProps) {
  const total = completed + inProgress + toRead;
  const safeTotal = total === 0 ? 1 : total;

  // SVG donut parameters
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const cx = 70;
  const cy = 70;

  const completedPct = completed / safeTotal;
  const inProgressPct = inProgress / safeTotal;
  const toReadPct = toRead / safeTotal;

  // Gap between segments
  const gap = total > 0 ? 0.015 : 0;

  const completedDash = Math.max(0, completedPct - gap) * circumference;
  const inProgressDash = Math.max(0, inProgressPct - gap) * circumference;
  const toReadDash = Math.max(0, toReadPct - gap) * circumference;

  const completedOffset = 0;
  const inProgressOffset = -(completedPct * circumference);
  const toReadOffset = -((completedPct + inProgressPct) * circumference);

  return (
    <div className="flex items-center gap-6">
      {/* SVG Donut */}
      <div className="relative shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* Background ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="14"
          />

          {total === 0 ? (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#1e293b"
              strokeWidth="14"
            />
          ) : (
            <>
              {/* Completed - blue */}
              {completed > 0 && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="14"
                  strokeDasharray={`${completedDash} ${circumference}`}
                  strokeDashoffset={completedOffset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${cx} ${cy})`}
                  style={{ transition: "stroke-dasharray 0.6s ease" }}
                />
              )}
              {/* In Progress - amber */}
              {inProgress > 0 && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="14"
                  strokeDasharray={`${inProgressDash} ${circumference}`}
                  strokeDashoffset={inProgressOffset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${cx} ${cy})`}
                  style={{ transition: "stroke-dasharray 0.6s ease" }}
                />
              )}
              {/* To Read - slate */}
              {toRead > 0 && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="14"
                  strokeDasharray={`${toReadDash} ${circumference}`}
                  strokeDashoffset={toReadOffset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${cx} ${cy})`}
                  style={{ transition: "stroke-dasharray 0.6s ease" }}
                />
              )}
            </>
          )}

          {/* Center text */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fill="white"
            fontSize="22"
            fontWeight="bold"
            fontFamily="inherit"
          >
            {total}
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="inherit"
          >
            Libros leídos
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shrink-0" />
          <span className="text-slate-300 font-medium">{completed}</span>
          <span className="text-muted-foreground text-xs">Completados</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
          <span className="text-slate-300 font-medium">{inProgress}</span>
          <span className="text-muted-foreground text-xs">En progreso</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-600 shrink-0" />
          <span className="text-slate-300 font-medium">{toRead}</span>
          <span className="text-muted-foreground text-xs">Por leer</span>
        </div>
      </div>
    </div>
  );
}
