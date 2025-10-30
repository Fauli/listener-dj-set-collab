/**
 * SeekBar - Timeline scrubbing control with time display
 */

interface SeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  accentColor?: string;
}

export default function SeekBar({ currentTime, duration, onSeek, accentColor = 'primary' }: SeekBarProps) {
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    onSeek(newTime);
  };

  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Define actual colors for the gradient
  const progressColor = accentColor === 'primary' ? '#2563eb' : '#9333ea'; // blue-600 or purple-600
  const trackColor = 'rgb(55 65 81)'; // gray-700

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          disabled={!duration}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700 slider disabled:cursor-not-allowed"
          style={{
            background: duration
              ? `linear-gradient(to right,
                  ${progressColor} 0%,
                  ${progressColor} ${percentage}%,
                  ${trackColor} ${percentage}%,
                  ${trackColor} 100%)`
              : trackColor,
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500 font-mono">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

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

        .slider:disabled::-webkit-slider-thumb {
          opacity: 0.5;
        }

        .slider:disabled::-moz-range-thumb {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
