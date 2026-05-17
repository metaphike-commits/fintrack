"use client";

interface GaugeCircleProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  color: string;
  children?: React.ReactNode;
}

/**
 * SVG speedometer-style gauge (270° arc, opens at bottom).
 * `value` maps 0–100 to empty–full arc.
 */
export function GaugeCircle({
  value,
  size = 90,
  strokeWidth = 9,
  color,
  children,
}: GaugeCircleProps) {
  const r = (size - strokeWidth) / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const trackArc = circumference * 0.75; // 270°
  const valueArc = trackArc * Math.min(1, Math.max(0, value / 100));

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
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${trackArc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Value arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${valueArc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>

      {/* Center label */}
      <div className="relative z-10 flex flex-col items-center justify-center leading-none">
        {children}
      </div>
    </div>
  );
}
