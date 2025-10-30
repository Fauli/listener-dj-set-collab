/**
 * TransportControls - Play, pause, stop, loop buttons
 */

interface TransportControlsProps {
  isPlaying: boolean;
  loop: boolean;
  disabled: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  accentColor?: string;
}

export default function TransportControls({
  isPlaying,
  loop,
  disabled,
  onPlay,
  onPause,
  onStop,
  onToggleLoop,
  accentColor = 'primary',
}: TransportControlsProps) {
  const buttonClass = `p-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
    accentColor === 'primary'
      ? 'hover:bg-primary-600/20'
      : 'hover:bg-purple-600/20'
  }`;

  const activeClass = loop
    ? accentColor === 'primary'
      ? 'bg-primary-600/30 text-primary-400'
      : 'bg-purple-600/30 text-purple-400'
    : 'text-gray-400';

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Play/Pause */}
      {!isPlaying ? (
        <button
          onClick={onPlay}
          disabled={disabled}
          className={`${buttonClass} ${
            accentColor === 'primary'
              ? 'bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600'
              : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600'
          } text-white`}
          title="Play"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        </button>
      ) : (
        <button
          onClick={onPause}
          disabled={disabled}
          className={`${buttonClass} ${
            accentColor === 'primary'
              ? 'bg-primary-600 hover:bg-primary-700'
              : 'bg-purple-600 hover:bg-purple-700'
          } text-white`}
          title="Pause"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zM13 4a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V4z" />
          </svg>
        </button>
      )}

      {/* Stop */}
      <button
        onClick={onStop}
        disabled={disabled}
        className={`${buttonClass} text-gray-400`}
        title="Stop"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      </button>

      {/* Loop */}
      <button
        onClick={onToggleLoop}
        disabled={disabled}
        className={`${buttonClass} ${activeClass}`}
        title={loop ? 'Loop: ON' : 'Loop: OFF'}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}
