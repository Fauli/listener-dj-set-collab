/**
 * Component Test Utilities
 * Common helpers for React component testing with Testing Library
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

/**
 * Wrapper component that provides common context providers
 */
interface WrapperProps {
  children: ReactNode;
}

function TestWrapper({ children }: WrapperProps) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

/**
 * Custom render function that includes common providers
 * Use this instead of @testing-library/react's render for component tests
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestWrapper, ...options });
}

/**
 * Re-export everything from @testing-library/react
 * This allows tests to import from one place: import { renderWithProviders, screen } from './componentTestUtils'
 */
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
