/**
 * EQControl - 3-band equalizer (Low, Mid, High)
 * Each band can be adjusted from -12dB to +12dB
 */

interface EQControlProps {
  low: number; // -12 to +12 dB
  mid: number; // -12 to +12 dB
  high: number; // -12 to +12 dB
  onLowChange: (value: number) => void;
  onMidChange: (value: number) => void;
  onHighChange: (value: number) => void;
  accentColor?: string;
}

export default function EQControl({
  low,
  mid,
  high,
  onLowChange,
  onMidChange,
  onHighChange,
  accentColor = 'primary',
}: EQControlProps) {
  const resetAll = () => {
    onLowChange(0);
    onMidChange(0);
    onHighChange(0);
  };

  const hasChanges = low !== 0 || mid !== 0 || high !== 0;

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase">EQ</span>
        {hasChanges && (
          <button
            onClick={resetAll}
            className="text-xs text-gray-500 hover:text-gray-300 transition"
            title="Reset all to 0dB"
          >
            ⟲ Reset
          </button>
        )}
      </div>

      <div className="flex gap-3 justify-around">
        {/* Low */}
        <EQBand
          label="Low"
          value={low}
          onChange={onLowChange}
          color="#ef4444"
        />

        {/* Mid */}
        <EQBand
          label="Mid"
          value={mid}
          onChange={onMidChange}
          color="#f59e0b"
        />

        {/* High */}
        <EQBand
          label="High"
          value={high}
          onChange={onHighChange}
          color="#3b82f6"
        />
      </div>
    </div>
  );
}

interface EQBandProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
}

function EQBand({ label, value, onChange }: EQBandProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const displayValue = value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  const percentage = ((value + 12) / 24) * 100; // Convert -12 to +12 range to 0-100%

  return (
    <div className="flex flex-col items-center flex-1">
      {/* Value display */}
      <div className="text-xs font-mono font-bold mb-1 h-4" style={{
        color: Math.abs(value) > 0.5 ? (value > 0 ? '#3b82f6' : '#ef4444') : '#9ca3af'
      }}>
        {displayValue}
      </div>

      {/* Vertical slider */}
      <div className="relative h-20 w-8 flex items-center justify-center">
        {/* Track background */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1.5 bg-gray-900 rounded-full">
          {/* Center zero mark */}
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-0.5 bg-gray-600 -left-0.75" />

          {/* Filled portion */}
          {value > 0.5 && (
            <div
              className="absolute left-0 right-0 rounded-full transition-all duration-75"
              style={{
                bottom: '50%',
                height: `${(value / 12) * 50}%`,
                background: 'linear-gradient(to top, rgba(59, 130, 246, 0.5), rgba(59, 130, 246, 0.8))',
              }}
            />
          )}
          {value < -0.5 && (
            <div
              className="absolute left-0 right-0 rounded-full transition-all duration-75"
              style={{
                top: '50%',
                height: `${(-value / 12) * 50}%`,
                background: 'linear-gradient(to bottom, rgba(239, 68, 68, 0.5), rgba(239, 68, 68, 0.8))',
              }}
            />
          )}
        </div>

        {/* Slider */}
        <input
          type="range"
          min="-12"
          max="12"
          step="0.5"
          value={value}
          onChange={handleChange}
          className="eq-slider"
          style={{
            width: '80px', // Height when rotated
            transformOrigin: 'center',
          }}
        />
      </div>

      {/* Label */}
      <span className="text-xs text-gray-500 mt-1">{label}</span>

      <style>{`
        .eq-slider {
          appearance: none;
          background: transparent;
          cursor: ns-resize;
          transform: rotate(-90deg);
          outline: none;
        }

        .eq-slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 12px;
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
          border: 1.5px solid #6b7280;
          border-radius: 2px;
          cursor: ns-resize;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        .eq-slider::-moz-range-thumb {
          width: 20px;
          height: 12px;
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
          border: 1.5px solid #6b7280;
          border-radius: 2px;
          cursor: ns-resize;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        .eq-slider::-webkit-slider-thumb:hover {
          border-color: #9ca3af;
        }

        .eq-slider::-moz-range-thumb:hover {
          border-color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
