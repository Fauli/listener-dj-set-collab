/**
 * Knob - Compact rotary knob control (like real DJ equipment)
 * Saves vertical space compared to sliders
 */

import { useRef, useState, useCallback } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export default function Knob({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  unit = '',
  color = '#3b82f6',
  size = 'md',
  showValue = true,
}: KnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);

  // Calculate rotation angle based on value (-135° to +135°, 270° total range)
  const percentage = (value - min) / (max - min);
  const rotation = -135 + percentage * 270; // -135° to +135°

  // Size configuration
  const sizeConfig = {
    xs: { diameter: 32, strokeWidth: 3, fontSize: 'text-[10px]' },
    sm: { diameter: 40, strokeWidth: 4, fontSize: 'text-xs' },
    md: { diameter: 50, strokeWidth: 5, fontSize: 'text-sm' },
    lg: { diameter: 60, strokeWidth: 6, fontSize: 'text-base' },
  };
  const { diameter, strokeWidth, fontSize } = sizeConfig[size];

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
  }, [value]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = startYRef.current - e.clientY; // Inverted: up = increase
      const sensitivity = (max - min) / 200; // 200px for full range
      const newValue = startValueRef.current + deltaY * sensitivity;
      const clampedValue = Math.max(min, Math.min(max, newValue));
      const steppedValue = Math.round(clampedValue / step) * step;

      onChange(steppedValue);
    },
    [isDragging, min, max, step, onChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse event listeners
  useState(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });

  // Format display value
  const displayValue = () => {
    if (unit === '%') return `${Math.round(value * 100)}${unit}`;
    if (unit === 'dB') return value > 0 ? `+${value.toFixed(1)}${unit}` : `${value.toFixed(1)}${unit}`;
    if (unit === 'BPM') return `${value.toFixed(2)}`;
    if (step >= 1) return `${Math.round(value)}${unit}`;
    return `${value.toFixed(2)}${unit}`;
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Knob */}
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        className={`relative cursor-ns-resize select-none ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{
          width: diameter,
          height: diameter,
        }}
      >
        {/* Background circle */}
        <svg width={diameter} height={diameter} className="absolute inset-0">
          {/* Track (gray arc) */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={(diameter - strokeWidth) / 2}
            fill="none"
            stroke="rgb(31, 41, 55)"
            strokeWidth={strokeWidth}
          />

          {/* Value arc */}
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={(diameter - strokeWidth) / 2}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${percentage * 270 * ((diameter - strokeWidth) * Math.PI) / 360} ${((diameter - strokeWidth) * Math.PI)}`}
            style={{
              transform: 'rotate(-135deg)',
              transformOrigin: 'center',
            }}
          />
        </svg>

        {/* Center dot / indicator line */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `rotate(${rotation}deg)`,
          }}
        >
          <div
            className="absolute"
            style={{
              width: 3,
              height: diameter / 3,
              background: 'white',
              top: diameter / 6,
              borderRadius: 2,
            }}
          />
        </div>

        {/* Center circle */}
        <div
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className="rounded-full bg-gray-800"
            style={{
              width: diameter * 0.6,
              height: diameter * 0.6,
            }}
          />
        </div>
      </div>

      {/* Label */}
      <div className={`font-medium text-gray-400 uppercase text-center ${fontSize}`}>
        {label}
      </div>

      {/* Value display */}
      {showValue && (
        <div className={`font-mono text-gray-300 ${fontSize}`}>
          {displayValue()}
        </div>
      )}
    </div>
  );
}
