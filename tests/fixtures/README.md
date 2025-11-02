# Test Fixtures

This directory contains test fixtures for E2E tests.

## Required Files

### test-audio.mp3

A small MP3 file for testing audio uploads and DJ features.

**Requirements:**
- Format: MP3
- Duration: 10-30 seconds (short for fast tests)
- Size: < 1MB
- BPM: ~128 (for beat grid testing)

**Creating the test file:**

You can use any short MP3 file, or generate one using:

```bash
# Using ffmpeg to create a test tone (10 seconds at 128 BPM)
ffmpeg -f lavfi -i "sine=frequency=440:duration=10" -acodec libmp3lame tests/fixtures/test-audio.mp3
```

Or simply copy any short MP3 file:

```bash
cp /path/to/your/short-track.mp3 tests/fixtures/test-audio.mp3
```

## Note

The test-audio.mp3 file is gitignored to keep the repository size small.
Each developer should create their own test fixture.
