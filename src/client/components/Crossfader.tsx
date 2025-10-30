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
    <div className="bg-gray-800 rounded-lg p-6 border-2 border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center font-bold text-sm">
            A
          </div>
          <span className="text-xs text-gray-400 font-medium">CROSSFADER</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">CROSSFADER</span>
          <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center font-bold text-sm">
            B
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Crossfader track with gradient */}
        <div className="h-3 rounded-full bg-gray-900 mb-4 relative overflow-hidden">
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
          className="w-full h-16 appearance-none cursor-grab active:cursor-grabbing crossfader-slider"
        />

        {/* Position indicator */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span className={position < -0.3 ? 'text-primary-400 font-bold' : ''}>
            A {position <= -0.9 ? '100%' : ''}
          </span>
          <span className={Math.abs(position) < 0.3 ? 'text-gray-300 font-bold' : ''}>
            {Math.abs(position) < 0.1 ? 'CENTER' : ''}
          </span>
          <span className={position > 0.3 ? 'text-purple-400 font-bold' : ''}>
            {position >= 0.9 ? '100%' : ''} B
          </span>
        </div>
      </div>

      <style>{`
        .crossfader-slider {
          background: transparent;
          outline: none;
        }

        .crossfader-slider::-webkit-slider-thumb {
          appearance: none;
          width: 48px;
          height: 60px;
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          border: 2px solid #4b5563;
          border-radius: 4px;
          cursor: grab;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1);
          position: relative;
        }

        .crossfader-slider::-moz-range-thumb {
          width: 48px;
          height: 60px;
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          border: 2px solid #4b5563;
          border-radius: 4px;
          cursor: grab;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1);
        }

        .crossfader-slider:active::-webkit-slider-thumb {
          cursor: grabbing;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.1);
        }

        .crossfader-slider:active::-moz-range-thumb {
          cursor: grabbing;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.1);
        }

        /* Smooth snap to center */
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
