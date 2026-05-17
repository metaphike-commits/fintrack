"use client";

import { useState, useEffect } from "react";

interface GaugeCircleProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  color: string;
  children?: React.ReactNode;
  glow?: boolean;
}

export function GaugeCircle({
  value,
  size = 90,
  strokeWidth = 9,
  color,
  children,
  glow = true,
}: GaugeCircleProps) {
  const [displayValue, setDisplayValue] = useState(0);

  // Draw from 0 on mount — RAF lets the paint complete before CSS transition fires
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDisplayValue(value));
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const r = (size - strokeWidth) / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const trackArc = circumference * 0.75;
  const valueArc = trackArc * Math.min(1, Math.max(0, displayValue / 100));

  // Build the glow shadow — intensity scales with value
  const glowIntensity = glow ? Math.max(0.3, displayValue / 100) : 0;
  const glowFilter = glow
    ? `drop-shadow(0 0 ${Math.round(6 + glowIntensity * 10)}px ${color}${Math.round(glowIntensity * 80).toString(16).padStart(2, "0")})`
    : undefined;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        style={{ filter: glowFilter, transition: "filter 0.7s ease" }}
        aria-hidden="true"
      >
        {/* Radial background glow */}
        <radialGradient id={`gauge-bg-${color.replace(/[^a-z0-9]/gi, "")}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.06" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <circle
          cx={cx} cy={cy} r={r - 2}
          fill={`url(#gauge-bg-${color.replace(/[^a-z0-9]/gi, "")})`}
        />

        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${trackArc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />

        {/* Value arc — CSS transition from 0 */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${valueArc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>

      <div className="relative z-10 flex flex-col items-center justify-center leading-none">
        {children}
      </div>
    </div>
  );
}
