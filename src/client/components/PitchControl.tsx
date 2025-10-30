/**
 * PitchControl - Tempo/pitch adjustment slider for beatmatching
 * Allows ±8% speed adjustment (common DJ range)
 */

interface PitchControlProps {
  rate: number; // 0.92 to 1.08 (±8%)
  onChange: (rate: number) => void;
  accentColor?: string;
  originalBpm?: number | null; // Original track BPM
}

export default function PitchControl({ rate, onChange, accentColor = 'primary', originalBpm }: PitchControlProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  // Convert rate to percentage: 1.0 = 0%, 1.08 = +8%, 0.92 = -8%
  const percentage = ((rate - 1) * 100).toFixed(1);
  const displayPercentage = percentage.startsWith('-') ? percentage : `+${percentage}`;

  // Calculate adjusted BPM if original BPM is available
  const adjustedBpm = originalBpm ? (originalBpm * rate).toFixed(2) : null;

  // Reset to 0% (1.0 rate)
  const handleReset = () => {
    onChange(1.0);
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase">Tempo</span>

        {/* Percentage and BPM display */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span
              className={`text-xs font-mono font-bold block ${
                Math.abs(rate - 1) < 0.001
                  ? 'text-gray-400'
                  : rate > 1
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {displayPercentage}%
            </span>
            {adjustedBpm && (
              <span className="text-xs text-gray-500 font-mono">
                {adjustedBpm} BPM
              </span>
            )}
          </div>
          {/* Reset button */}
          {Math.abs(rate - 1) > 0.001 && (
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-gray-300 transition"
              title="Reset to 0%"
            >
              ⟲
            </button>
          )}
        </div>
      </div>

      {/* Vertical slider container */}
      <div className="flex justify-center">
        <div className="relative h-28 w-10 flex items-center justify-center">
          {/* Track background */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-2 bg-gray-900 rounded-full">
            {/* Center zero mark */}
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-0.5 bg-gray-600 -left-1" />

            {/* Filled portion - green above center, red below center */}
            {rate > 1.001 && (
              <div
                className="absolute left-0 right-0 rounded-full transition-all duration-75"
                style={{
                  bottom: '50%',
                  height: `${((rate - 1) / 0.08) * 50}%`,
                  background: 'linear-gradient(to top, rgba(34, 197, 94, 0.5), rgba(34, 197, 94, 0.8))',
                }}
              />
            )}
            {rate < 0.999 && (
              <div
                className="absolute left-0 right-0 rounded-full transition-all duration-75"
                style={{
                  top: '50%',
                  height: `${((1 - rate) / 0.08) * 50}%`,
                  background: 'linear-gradient(to bottom, rgba(239, 68, 68, 0.5), rgba(239, 68, 68, 0.8))',
                }}
              />
            )}
          </div>

          {/* Vertical slider (rotated) */}
          <input
            type="range"
            min="0.92"
            max="1.08"
            step="0.001"
            value={rate}
            onChange={handleChange}
            className="pitch-slider"
            style={{
              width: '112px', // Height when rotated (matches h-28)
              transformOrigin: 'center',
            }}
          />
        </div>
      </div>

      {/* Range labels */}
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>-8%</span>
        <span>+8%</span>
      </div>

      <style>{`
        .pitch-slider {
          appearance: none;
          background: transparent;
          cursor: ns-resize;
          transform: rotate(-90deg);
          outline: none;
        }

        .pitch-slider::-webkit-slider-thumb {
          appearance: none;
          width: 28px;
          height: 16px;
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
          border: 2px solid #6b7280;
          border-radius: 3px;
          cursor: ns-resize;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .pitch-slider::-moz-range-thumb {
          width: 28px;
          height: 16px;
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
          border: 2px solid #6b7280;
          border-radius: 3px;
          cursor: ns-resize;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .pitch-slider::-webkit-slider-thumb:hover {
          border-color: #9ca3af;
        }

        .pitch-slider::-moz-range-thumb:hover {
          border-color: #9ca3af;
        }

        .pitch-slider::-webkit-slider-thumb:active {
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }

        .pitch-slider::-moz-range-thumb:active {
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
