/**
 * Component tests for SetPlaytimeStats
 * Tests rendering of playtime statistics
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../utils/componentTestUtils';
import SetPlaytimeStats from '../../src/client/components/SetPlaytimeStats';
import type { PlaylistTrack } from '../../src/client/stores/playlistStore';

// Helper to create mock track
function createMockTrack(
  id: string,
  duration: number,
  cuePoints?: { start: number | null; end: number | null; A?: number | null; B?: number | null }
): PlaylistTrack {
  return {
    id,
    roomId: 'test-room',
    trackId: `track-${id}`,
    position: 0,
    note: null,
    cueIn: null,
    cueOut: null,
    cuePoints: cuePoints || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    track: {
      id: `track-${id}`,
      title: `Track ${id}`,
      artist: 'Test Artist',
      bpm: 120,
      key: '8A',
      duration,
      filePath: `/path/to/${id}.mp3`,
      uploadedBy: 'test-user',
      uploadedAt: new Date(),
    },
  };
}

describe('SetPlaytimeStats Component', () => {
  it('should render nothing when tracks array is empty', () => {
    const { container } = renderWithProviders(<SetPlaytimeStats tracks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render playtime stats for single track', () => {
    const tracks = [createMockTrack('1', 180)]; // 3 minutes

    renderWithProviders(<SetPlaytimeStats tracks={tracks} />);

    expect(screen.getByText('Full List:')).toBeInTheDocument();
    expect(screen.getByText('Set Length:')).toBeInTheDocument();

    // Both durations are the same, so there are 2 elements with 00:03:00
    const times = screen.getAllByText('00:03:00');
    expect(times).toHaveLength(2);
  });

  it('should render full duration for multiple tracks', () => {
    const tracks = [
      createMockTrack('1', 180), // 3 min
      createMockTrack('2', 240), // 4 min
      createMockTrack('3', 300), // 5 min
    ];

    renderWithProviders(<SetPlaytimeStats tracks={tracks} />);

    // Total: 12 minutes
    const fullDuration = screen.getAllByText('00:12:00');
    expect(fullDuration.length).toBeGreaterThan(0);
  });

  it('should render different durations for cue-based vs full', () => {
    const tracks = [
      createMockTrack('1', 300, { start: 10, end: 290 }), // 280s cued
      createMockTrack('2', 240), // No cues
    ];

    renderWithProviders(<SetPlaytimeStats tracks={tracks} />);

    // Full: 540s = 00:09:00
    expect(screen.getByText('00:09:00')).toBeInTheDocument();

    // Cue-based: 520s = 00:08:40
    expect(screen.getByText('00:08:40')).toBeInTheDocument();
  });

  it('should have correct title attributes for tooltips', () => {
    const tracks = [createMockTrack('1', 180)];

    renderWithProviders(<SetPlaytimeStats tracks={tracks} />);

    const fullTimeElement = screen.getByTitle('Sum of all track lengths');
    expect(fullTimeElement).toBeInTheDocument();

    const cueTimeElement = screen.getByTitle(
      'Using Start→End cue points (falls back to full track duration)'
    );
    expect(cueTimeElement).toBeInTheDocument();
  });

  it('should format long sets correctly (> 1 hour)', () => {
    const tracks = [
      createMockTrack('1', 3600), // 1 hour
      createMockTrack('2', 1800), // 30 min
    ];

    renderWithProviders(<SetPlaytimeStats tracks={tracks} />);

    // Total: 1.5 hours = 01:30:00 (appears twice, same for both)
    const times = screen.getAllByText('01:30:00');
    expect(times.length).toBeGreaterThan(0);
  });

  it('should apply correct CSS classes', () => {
    const tracks = [createMockTrack('1', 180)];

    const { container } = renderWithProviders(<SetPlaytimeStats tracks={tracks} />);

    const statsContainer = container.firstChild as HTMLElement;
    expect(statsContainer).toHaveClass('bg-gray-800');
    expect(statsContainer).toHaveClass('border-t');
  });

  it('should display separator bullet between stats', () => {
    const tracks = [createMockTrack('1', 180)];

    renderWithProviders(<SetPlaytimeStats tracks={tracks} />);

    expect(screen.getByText('•')).toBeInTheDocument();
  });

  it('should update when tracks prop changes', () => {
    const { rerender } = renderWithProviders(
      <SetPlaytimeStats tracks={[createMockTrack('1', 180)]} />
    );

    expect(screen.getAllByText('00:03:00')).toHaveLength(2);

    // Update with longer tracks
    rerender(
      <SetPlaytimeStats
        tracks={[
          createMockTrack('1', 180),
          createMockTrack('2', 240),
        ]}
      />
    );

    expect(screen.getAllByText('00:07:00')).toHaveLength(2);
  });

  it('should handle tracks with same full and cue-based duration', () => {
    const tracks = [
      createMockTrack('1', 180), // No cues
      createMockTrack('2', 240), // No cues
    ];

    renderWithProviders(<SetPlaytimeStats tracks={tracks} />);

    // Both should show 00:07:00
    const times = screen.getAllByText('00:07:00');
    expect(times.length).toBe(2); // Both full and cue-based
  });
});
