/**
 * Crossfader - Professional DJ crossfader for mixing between Deck A and Deck B
 * Position: -1 (100% A) → 0 (50/50) → 1 (100% B)
 */

interface CrossfaderProps {
  position: number; // -1 to 1
  onChange: (position: number) => void;
}

export default function Crossfader({ position, onChange }: CrossfaderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  // Convert -1 to 1 range into 0 to 100 for visual percentage
  const percentage = ((position + 1) / 2) * 100;

  return (
    <div className="bg-gray-800 rounded border border-gray-700 px-3 py-1.5">
      <div className="flex items-center gap-3">
        {/* Deck A indicator */}
        <div className="w-5 h-5 rounded bg-primary-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
          A
        </div>

        {/* Crossfader slider */}
        <div className="flex-1 relative">
          {/* Track with gradient */}
          <div className="h-1.5 rounded-full bg-gray-900 relative overflow-hidden">
            {/* Active side indicator */}
            <div
              className="absolute top-0 left-0 h-full transition-all duration-75"
              style={{
                width: `${percentage}%`,
                background: `linear-gradient(to right,
                  rgba(59, 130, 246, 0.6) 0%,
                  rgba(168, 85, 247, 0.6) 100%)`,
              }}
            />

            {/* Center mark */}
            <div className="absolute top-0 left-1/2 w-0.5 h-full bg-gray-600 -translate-x-1/2" />
          </div>

          {/* Slider */}
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={position}
            onChange={handleChange}
            className="w-full h-6 appearance-none cursor-grab active:cursor-grabbing crossfader-slider absolute top-1/2 -translate-y-1/2"
          />
        </div>

        {/* Deck B indicator */}
        <div className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
          B
        </div>
      </div>

      <style>{`
        .crossfader-slider {
          background: transparent;
          outline: none;
        }

        .crossfader-slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 32px;
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          border: 2px solid #4b5563;
          border-radius: 3px;
          cursor: grab;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1);
        }

        .crossfader-slider::-moz-range-thumb {
          width: 24px;
          height: 32px;
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          border: 2px solid #4b5563;
          border-radius: 3px;
          cursor: grab;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1);
        }

        .crossfader-slider:active::-webkit-slider-thumb {
          cursor: grabbing;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.1);
        }

        .crossfader-slider:active::-moz-range-thumb {
          cursor: grabbing;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.1);
        }

        .crossfader-slider::-webkit-slider-thumb:hover {
          border-color: #6b7280;
        }

        .crossfader-slider::-moz-range-thumb:hover {
          border-color: #6b7280;
        }
      `}</style>
    </div>
  );
}
