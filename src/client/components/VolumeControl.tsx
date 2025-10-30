/**
 * VolumeControl - Volume slider with icon and percentage display
 */

interface VolumeControlProps {
  volume: number; // 0-1
  onChange: (volume: number) => void;
  accentColor?: string;
}

export default function VolumeControl({ volume, onChange, accentColor = 'primary' }: VolumeControlProps) {
  const percentage = Math.round(volume * 100);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  // Define actual colors for the gradient
  const activeColor = accentColor === 'primary' ? '#2563eb' : '#9333ea'; // blue-600 or purple-600
  const trackColor = 'rgb(55 65 81)'; // gray-700

  const getVolumeIcon = () => {
    if (volume === 0) {
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
        />
      );
    } else if (volume < 0.5) {
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
      );
    } else {
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
      );
    }
  };

  return (
    <div className="flex items-center gap-3">
      <svg
        className="w-5 h-5 text-gray-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {getVolumeIcon()}
      </svg>

      <div className="flex-1 relative">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleChange}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right,
              ${activeColor} 0%,
              ${activeColor} ${percentage}%,
              ${trackColor} ${percentage}%,
              ${trackColor} 100%)`,
          }}
        />
      </div>

      <span className="text-sm text-gray-400 font-medium w-10 text-right">
        {percentage}%
      </span>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
