/**
 * CuePoints - Compact cue point management for quick navigation
 * 4 cue points: Start (green), End (red), A (blue), B (purple)
 */

import type { CuePoints as CuePointsType } from '../stores/deckStore';

interface CuePointsProps {
  cuePoints: CuePointsType;
  currentTime: number;
  onSetCue: (cueType: keyof CuePointsType) => void;
  onJumpToCue: (cueType: keyof CuePointsType) => void;
}

const CUE_CONFIG = {
  start: {
    label: 'Start',
    color: 'bg-green-600',
    hoverColor: 'hover:bg-green-700',
    textColor: 'text-green-600',
    borderColor: 'border-green-600',
  },
  end: {
    label: 'End',
    color: 'bg-red-600',
    hoverColor: 'hover:bg-red-700',
    textColor: 'text-red-600',
    borderColor: 'border-red-600',
  },
  A: {
    label: 'A',
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-600',
  },
  B: {
    label: 'B',
    color: 'bg-purple-600',
    hoverColor: 'hover:bg-purple-700',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-600',
  },
} as const;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function CuePoints({
  cuePoints,
  currentTime,
  onSetCue,
  onJumpToCue,
}: CuePointsProps) {
  const handleCueClick = (cueType: keyof CuePointsType) => {
    const cueTime = cuePoints[cueType];
    if (cueTime === null) {
      // Not set - set it at current position
      onSetCue(cueType);
    } else {
      // Already set - jump to it
      onJumpToCue(cueType);
    }
  };

  return (
    <div className="flex gap-1">
      {(Object.keys(CUE_CONFIG) as Array<keyof CuePointsType>).map((cueType) => {
        const config = CUE_CONFIG[cueType];
        const cueTime = cuePoints[cueType];
        const isSet = cueTime !== null;

        return (
          <button
            key={cueType}
            onClick={() => handleCueClick(cueType)}
            className={`flex flex-col items-center justify-center px-1.5 py-1 rounded text-xs font-medium transition-all ${
              isSet
                ? `${config.color} ${config.hoverColor} text-white shadow-sm`
                : `bg-gray-700 hover:bg-gray-600 ${config.textColor} border ${config.borderColor}`
            }`}
            title={
              isSet
                ? `Jump to ${config.label} cue (${formatTime(cueTime)})`
                : `Set ${config.label} cue at current position`
            }
          >
            <div className="font-bold leading-none">{config.label}</div>
            {isSet && (
              <div className="text-[9px] leading-tight opacity-90 mt-0.5">
                {formatTime(cueTime)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
