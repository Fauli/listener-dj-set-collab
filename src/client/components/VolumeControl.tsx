/**
 * VolumeControl - Vertical volume slider
 * Range: 0-100%
 */

interface VolumeControlProps {
  volume: number; // 0-1
  onChange: (volume: number) => void;
  accentColor?: string;
}

export default function VolumeControl({ volume, onChange, accentColor = 'primary' }: VolumeControlProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const percentage = Math.round(volume * 100);
  const activeColor = accentColor === 'primary' ? '#3b82f6' : '#a855f7'; // blue-500 or purple-500

  const getVolumeIcon = () => {
    if (volume === 0) {
      return 'M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2';
    } else if (volume < 0.5) {
      return 'M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z';
    } else {
      return 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase">Volume</span>
        <span className="text-xs font-mono font-bold text-gray-300">{percentage}%</span>
      </div>

      {/* Vertical slider container */}
      <div className="flex justify-center">
        <div className="relative h-28 w-10 flex items-center justify-center">
          {/* Track background */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-2 bg-gray-900 rounded-full">
            {/* Filled portion - fills from bottom */}
            <div
              className="absolute left-0 right-0 bottom-0 rounded-full transition-all duration-75"
              style={{
                height: `${percentage}%`,
                background: `linear-gradient(to top, ${activeColor}, rgba(59, 130, 246, 0.6))`,
              }}
            />
          </div>

          {/* Vertical slider (rotated) */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleChange}
            className="volume-slider"
            style={{
              width: '112px', // Height when rotated (matches h-28)
              transformOrigin: 'center',
            }}
          />
        </div>
      </div>

      {/* Volume icon indicator */}
      <div className="flex justify-center mt-1">
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={getVolumeIcon()}
          />
        </svg>
      </div>

      <style>{`
        .volume-slider {
          appearance: none;
          background: transparent;
          cursor: ns-resize;
          transform: rotate(-90deg);
          outline: none;
        }

        .volume-slider::-webkit-slider-thumb {
          appearance: none;
          width: 28px;
          height: 16px;
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
          border: 2px solid #6b7280;
          border-radius: 3px;
          cursor: ns-resize;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .volume-slider::-moz-range-thumb {
          width: 28px;
          height: 16px;
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
          border: 2px solid #6b7280;
          border-radius: 3px;
          cursor: ns-resize;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .volume-slider::-webkit-slider-thumb:hover {
          border-color: #9ca3af;
        }

        .volume-slider::-moz-range-thumb:hover {
          border-color: #9ca3af;
        }

        .volume-slider::-webkit-slider-thumb:active {
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }

        .volume-slider::-moz-range-thumb:active {
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
