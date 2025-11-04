/**
 * Vitest global setup file
 * Runs before all tests
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

beforeAll(() => {
  // Global setup (e.g., start test database)
});

afterAll(() => {
  // Global cleanup
});

beforeEach(() => {
  // Reset before each test
});
