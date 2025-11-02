#!/bin/bash
# Create test fixture audio files for E2E tests

set -e

cd "$(dirname "$0")"

mkdir -p tests/fixtures

echo "Creating test audio files..."

ffmpeg -f lavfi -i "sine=frequency=440:duration=5" -ac 2 -ar 44100 -b:a 128k tests/fixtures/test-audio.mp3 -y -loglevel error
ffmpeg -f lavfi -i "sine=frequency=440:duration=5" -ac 2 -ar 44100 -b:a 128k tests/fixtures/track1.mp3 -y -loglevel error
ffmpeg -f lavfi -i "sine=frequency=523:duration=5" -ac 2 -ar 44100 -b:a 128k tests/fixtures/track2.mp3 -y -loglevel error
ffmpeg -f lavfi -i "sine=frequency=659:duration=5" -ac 2 -ar 44100 -b:a 128k tests/fixtures/track3.mp3 -y -loglevel error

echo "Test fixtures created successfully!"
ls -lh tests/fixtures/
