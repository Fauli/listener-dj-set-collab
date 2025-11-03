# Test Plan - Listener DJ App

## Current Test Coverage Summary

**Backend: ✅ 61 tests passing**
- ✅ REST API endpoints (rooms, tracks, uploads)
- ✅ WebSocket operations (join/leave, broadcasts)
- ✅ Session tracking
- ✅ Database operations
- ✅ Cue points persistence

**Frontend: ✅ 60 tests passing**
- ✅ Camelot Key utilities (35 tests)
- ✅ Beat Detection utilities (25 tests)
- ❌ Component tests (0 tests)
- ❌ State management tests (0 tests)

**Total: ✅ 121/121 tests passing**

---

## Priority Levels

- 🔴 **P0 - Critical**: Core business logic with complex edge cases
- 🟡 **P1 - High**: Important features that could break user experience
- 🟢 **P2 - Medium**: Nice-to-have, improves confidence
- ⚪ **P3 - Low**: Can defer to later phases

---

## Frontend Tests (Currently Missing)

### 🔴 P0: Core Utility Functions

#### 1. ✅ Camelot Key Utilities (`src/client/utils/camelotKey.ts`) - COMPLETED

**Status**: ✅ 35 tests passing
**Location**: `tests/unit/camelotKey.test.ts`

- [x] **parseCamelotKey()**
  - [x] Valid keys: "1A" through "12A", "1B" through "12B"
  - [x] Invalid format: "13A", "0A", "1C", "A1", "abc"
  - [x] Case insensitivity: "8a" should parse as "8A"
  - [x] Null/undefined handling
  - [x] Whitespace trimming: " 8A " should work

- [x] **areKeysCompatible()**
  - [x] Same key: "8A" + "8A" → true
  - [x] Adjacent same letter: "8A" + "7A" → true, "8A" + "9A" → true
  - [x] Wrapping: "1A" + "12A" → true, "12A" + "1A" → true
  - [x] Relative (A/B swap): "8A" + "8B" → true
  - [x] Incompatible: "8A" + "10A" → false, "8A" + "5B" → false
  - [x] Null/undefined handling

- [x] **getCompatibleKeys()**
  - [x] Returns 4 keys for valid input (same, +1, -1, opposite letter)
  - [x] Wrapping at boundaries: getCompatibleKeys("1A") includes "12A"
  - [x] Wrapping at boundaries: getCompatibleKeys("12A") includes "1A"
  - [x] Empty array for invalid input

- [x] **getKeyRelationship()**
  - [x] Returns 'same', 'adjacent', 'relative' correctly
  - [x] Returns null for incompatible keys

**Time spent**: ~2 hours

---

#### 2. ✅ Beat Detection (`src/client/utils/beatDetection.ts`) - COMPLETED

**Status**: ✅ 25 tests passing
**Location**: `tests/unit/beatDetection.test.ts`

- [x] **detectBeats() - Edge Cases**
  - [x] Empty/silent audio buffer → throws meaningful error
  - [x] Very short audio (< 2 seconds) → throws error
  - [x] Extremely low BPM (< 80) → filtered correctly
  - [x] Extremely high BPM (> 180) → detects half-tempo (90 BPM)
  - [x] Irregular beats (live recordings) → throws error gracefully
  - [x] Pure noise → throws error

- [x] **detectBeats() - Parameter Validation**
  - [x] maxDuration limits analysis time correctly
  - [x] minBpm/maxBpm filters work correctly
  - [x] sensitivity affects threshold properly
  - [x] Default parameters work correctly

- [x] **detectBeats() - Output Validation**
  - [x] BPM detection accuracy (90, 120, 140, 165 BPM tested)
  - [x] Confidence calculation (0-1 range)
  - [x] Beats in chronological order
  - [x] Beat times within audio duration
  - [x] Returns max 20 beats
  - [x] Deterministic results (consistent on re-run)

**Note**: Created comprehensive AudioBuffer mocks with synthetic beat patterns (regular, silent, irregular, noisy).

**Time spent**: ~2.5 hours

---

#### 3. Beat Grid Utilities (`src/client/utils/beatGrid.ts`)

**Why important**: Affects visual waveform alignment.

- [ ] Check if file exists and has complex logic
- [ ] Add tests for boundary conditions

**Estimated effort**: 1-2 hours

---

#### 4. Set Playtime Calculator (`src/client/utils/setPlaytime.ts`)

- [ ] Check if file exists
- [ ] Test total playtime calculations
- [ ] Test with missing/null BPM values
- [ ] Test with empty playlist

**Estimated effort**: 1 hour

---

### 🟡 P1: State Management (Zustand Stores)

#### 5. Playlist Store (`src/client/stores/playlistStore.ts`)

**Why important**: Central to collaborative editing. Position bugs = broken playlist.

- [ ] **addTrack()**
  - [ ] Adds track and maintains sorted order
  - [ ] Duplicate positions handled correctly
  - [ ] Empty playlist → first track

- [ ] **removeTrack()**
  - [ ] Removes correct track
  - [ ] Recalculates positions for remaining tracks
  - [ ] Remove from empty playlist → no error
  - [ ] Remove non-existent track → no error

- [ ] **updateTrack()**
  - [ ] Updates correct track
  - [ ] Partial updates work (only note, only cuePoints)
  - [ ] Update non-existent track → no error

- [ ] **reorderTrack()**
  - [ ] Move to beginning (position 0)
  - [ ] Move to end (last position)
  - [ ] Move to middle
  - [ ] Invalid positions handled
  - [ ] All other tracks maintain correct order

- [ ] **Optimistic Updates**
  - [ ] addPendingAction / removePendingAction work
  - [ ] isPending returns correct state
  - [ ] Pending actions don't block UI

- [ ] **reset()**
  - [ ] Clears all state including pending actions

**Estimated effort**: 3-4 hours

---

#### 6. Deck Store (`src/client/stores/deckStore.ts`)

- [ ] Check what state it manages
- [ ] Test state transitions
- [ ] Test deck synchronization logic

**Estimated effort**: 2-3 hours

---

### 🟢 P2: React Components

#### 7. Component Testing Setup

**Prerequisites**: Install testing libraries first
```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Vitest config**: Add to `vitest.config.ts`:
```typescript
test: {
  environment: 'jsdom',
  setupFiles: ['./tests/setupTests.ts'],
}
```

**Estimated effort**: 1 hour setup

---

#### 8. Critical Components to Test

- [ ] **TrackList.tsx** - Playlist rendering
  - [ ] Renders empty state
  - [ ] Renders tracks in correct order
  - [ ] Drag-and-drop reordering
  - [ ] Click handlers work

- [ ] **AddTrackForm.tsx** - Track input
  - [ ] Form validation
  - [ ] Submit with valid data
  - [ ] Error handling

- [ ] **CuePoints.tsx** - Cue point editor
  - [ ] Displays cue points
  - [ ] Updates on change
  - [ ] Validates time values

- [ ] **LoginPage.tsx** - Auth flow
  - [ ] Renders login options
  - [ ] Handles OAuth redirect

**Estimated effort**: 6-8 hours for all components

---

## Backend Tests (Edge Cases)

### 🔴 P0: Concurrency & Race Conditions

#### 9. SetEntry Retry Logic (`src/server/models/SetEntry.ts`)

**Why critical**: Multiple DJs can add tracks simultaneously. Position conflicts must resolve correctly.

- [ ] **addTrackToPlaylist() - Concurrent Inserts**
  - [ ] Two clients add track at same position simultaneously
  - [ ] Retry logic works (up to MAX_RETRIES)
  - [ ] All retries exhausted → throws meaningful error
  - [ ] Transaction rollback on failure

- [ ] **Performance Test**
  - [ ] Large playlist (100+ tracks) - shift performance
  - [ ] Insert at position 0 (worst case - shifts all)

**How to test**: Use Promise.all() to simulate concurrent operations

**Estimated effort**: 3-4 hours

---

#### 10. Track Reordering Under Concurrency

- [ ] **reorderSetEntry() - Concurrent Reorders**
  - [ ] Two DJs reorder different tracks simultaneously
  - [ ] Two DJs reorder same track simultaneously
  - [ ] Reorder while another DJ is adding track
  - [ ] Final state is consistent (no duplicate positions)

**Estimated effort**: 2-3 hours

---

### 🟡 P1: WebSocket Edge Cases

#### 11. WebSocket Connection Lifecycle

**Why important**: Network issues are common. Need graceful handling.

- [ ] **Rapid connect/disconnect**
  - [ ] Client connects and immediately disconnects
  - [ ] Reconnect with same userId after disconnect
  - [ ] Session cleanup happens correctly

- [ ] **Concurrent state updates**
  - [ ] Multiple clients emit updates simultaneously
  - [ ] Room state stays consistent
  - [ ] All clients receive correct final state

- [ ] **Network interruption simulation**
  - [ ] Client loses connection mid-session
  - [ ] Reconnection restores state
  - [ ] Old sessions are cleaned up

**Estimated effort**: 4-5 hours

---

#### 12. Room State Synchronization

- [ ] **Large room state (50+ tracks)**
  - [ ] room:state message size reasonable
  - [ ] Performance is acceptable

- [ ] **User list updates**
  - [ ] 5+ users join/leave rapidly
  - [ ] User list stays accurate for all clients

**Estimated effort**: 2 hours

---

### 🟡 P1: File Upload Edge Cases

#### 13. Upload Validation (`src/server/routes/uploads.ts`)

- [ ] **Corrupted files**
  - [ ] Invalid MP3 header → proper error
  - [ ] Truncated file → proper error
  - [ ] Non-audio file with .mp3 extension → rejected

- [ ] **File size limits**
  - [ ] Exactly at limit → accepted
  - [ ] Just over limit → rejected with clear error
  - [ ] Very large file (100MB+) → fails gracefully

- [ ] **Concurrent uploads**
  - [ ] Multiple users upload to same room
  - [ ] Filenames don't collide
  - [ ] All files stored correctly

**Estimated effort**: 3 hours

---

### 🟢 P2: Data Integrity

#### 14. Database Constraints & Cascades

- [ ] **Foreign key handling**
  - [ ] Delete room → cascades to setEntries
  - [ ] Delete user → handles gracefully
  - [ ] Delete track with active setEntries → prevents or cascades?

- [ ] **Unique constraints**
  - [ ] roomId + position uniqueness enforced
  - [ ] Concurrent violations handled

**Estimated effort**: 2 hours

---

#### 15. Session Cleanup & Orphan Prevention

- [ ] **cleanupOldSessions()** (if implemented)
  - [ ] Cleans sessions older than threshold
  - [ ] Doesn't clean active sessions
  - [ ] Handles empty database

- [ ] **Orphaned records**
  - [ ] Tracks with no setEntries → cleanup strategy
  - [ ] SetEntries with deleted tracks → should not exist

**Estimated effort**: 2 hours

---

## Test Infrastructure Improvements

### ⚪ P3: Test Utilities & Helpers

#### 16. Shared Test Fixtures

- [ ] Create factory functions for test data
  - [ ] `createTestUser()`
  - [ ] `createTestRoom()`
  - [ ] `createTestTrack()`
  - [ ] `createTestAudioBuffer()` (for beat detection tests)

- [ ] Improve cleanup utilities
  - [ ] Centralized cleanup function
  - [ ] Better isolation between tests

**Estimated effort**: 2 hours

---

#### 17. WebSocket Test Helpers

- [ ] Create utilities for WebSocket testing
  - [ ] `createTestSocketClient()`
  - [ ] `waitForSocketEvent()` (already exists, could be improved)
  - [ ] `simulateMultipleClients()`

**Estimated effort**: 1-2 hours

---

## Implementation Order (Recommended)

### Phase 1: Frontend Core Logic (Week 1)
1. ✅ Camelot Key tests (P0) - 2-3 hrs
2. ✅ Beat Detection tests (P0) - 4-5 hrs
3. ✅ Playlist Store tests (P1) - 3-4 hrs

**Total: ~10-12 hours**

### Phase 2: Backend Edge Cases (Week 2)
4. ✅ SetEntry concurrency tests (P0) - 3-4 hrs
5. ✅ WebSocket lifecycle tests (P1) - 4-5 hrs
6. ✅ Upload edge cases (P1) - 3 hrs

**Total: ~10-12 hours**

### Phase 3: Component Tests (Week 3)
7. ✅ Setup component testing - 1 hr
8. ✅ Critical component tests (P2) - 6-8 hrs
9. ✅ Deck Store tests (P1) - 2-3 hrs

**Total: ~10-12 hours**

### Phase 4: Polish & Reliability (Week 4)
10. ✅ Database integrity tests (P2) - 2 hrs
11. ✅ Test infrastructure improvements (P3) - 3-4 hrs
12. ✅ Documentation & CI improvements - 2 hrs

**Total: ~7-8 hours**

---

## Success Metrics

- [ ] Frontend test coverage > 70% for utils and stores
- [ ] All identified concurrency scenarios tested
- [ ] Zero flaky tests (tests pass consistently)
- [ ] CI runs all tests automatically
- [ ] Test execution time < 30 seconds (excluding E2E)

---

## Notes

- **Parallel work**: Frontend and backend tests can be written in parallel
- **Mock data**: Need to create audio buffer mocks for beat detection tests
- **CI/CD**: Should add GitHub Actions workflow once tests are in place
- **Performance**: May need separate performance test suite if these get slow

---

## Questions to Resolve

1. **Beat detection testing**: Do we have sample audio files in repo, or create synthetic ones?
2. **Component testing**: Which component library is being used (React + shadcn/ui)?
3. **WebSocket reconnection**: Is there reconnection logic in the client already?
4. **File storage**: Where are uploaded files stored (local, S3)? Affects upload tests.
