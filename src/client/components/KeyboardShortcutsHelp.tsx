/**
 * KeyboardShortcutsHelp component - Shows all available keyboard shortcuts
 */

import { useEffect, useState } from 'react';

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ? to open/close help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        // Don't trigger if user is typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }

      // Esc to close help
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-700 hover:bg-gray-600 text-gray-300 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition z-40"
        title="Keyboard shortcuts (?)"
        aria-label="Show keyboard shortcuts"
      >
        <span className="text-lg font-bold">?</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
      <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold" id="shortcuts-title">Keyboard Shortcuts</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-300 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto p-4 flex-1">
          <div className="space-y-4">
            {/* General & Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-primary-400 mb-2">General</h3>
                <div className="space-y-1">
                  <ShortcutRow keys={['?']} description="Toggle help" />
                  <ShortcutRow keys={['Esc']} description="Close modals" />
                  <ShortcutRow keys={['Ctrl', 'U']} description="Toggle upload" mac="⌘U" />
                </div>
              </div>

              {/* Deck Controls Overview */}
              <div>
                <h3 className="text-sm font-semibold text-primary-400 mb-2">Deck Controls</h3>
                <div className="space-y-1 text-xs text-gray-400">
                  <p><strong className="text-primary-400">Deck A:</strong> Space (play/pause), 1-4 (cues)</p>
                  <p><strong className="text-purple-400">Deck B:</strong> Q-R (cues)</p>
                  <p><strong>Shift+Key:</strong> Set cue at current time</p>
                </div>
              </div>
            </div>

            {/* DJ Player - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deck A */}
              <div>
                <h3 className="text-sm font-semibold text-primary-400 mb-2">Deck A (Top)</h3>
                <div className="space-y-1">
                  <ShortcutRow keys={['Space']} description="Play/pause" />
                  <ShortcutRow keys={['1']} description="Start cue" />
                  <ShortcutRow keys={['2']} description="End cue" />
                  <ShortcutRow keys={['3']} description="A cue" />
                  <ShortcutRow keys={['4']} description="B cue" />
                  <div className="text-xs text-gray-500 mt-2 pl-1">
                    Hold Shift to set cues
                  </div>
                </div>
              </div>

              {/* Deck B */}
              <div>
                <h3 className="text-sm font-semibold text-purple-400 mb-2">Deck B (Bottom)</h3>
                <div className="space-y-1">
                  <ShortcutRow keys={['Q']} description="Start cue" />
                  <ShortcutRow keys={['W']} description="End cue" />
                  <ShortcutRow keys={['E']} description="A cue" />
                  <ShortcutRow keys={['R']} description="B cue" />
                  <div className="text-xs text-gray-500 mt-2 pl-1">
                    Hold Shift to set cues
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-3 border-t border-gray-700 text-xs text-gray-400 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">?</kbd> to toggle • <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, description, mac }: { keys: string[]; description: string; mac?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-gray-300 text-sm">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={index}>
            <kbd className="px-2 py-0.5 bg-gray-700 rounded text-xs font-mono">{key}</kbd>
            {index < keys.length - 1 && <span className="mx-0.5 text-gray-500 text-xs">+</span>}
          </span>
        ))}
        {mac && (
          <span className="text-gray-500 text-xs ml-1">
            (<kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">{mac}</kbd>)
          </span>
        )}
      </div>
    </div>
  );
}
