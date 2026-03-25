import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '@/components/ErrorBoundary';

describe('app router error boundaries', () => {
  it('renders app and global error fallbacks with retry actions', async () => {
    const appError = (await import('@/app/error')).default;
    const globalError = (await import('@/app/global-error')).default;

    const appMarkup = renderToStaticMarkup(
      React.createElement(appError, {
        error: new Error('segment failed'),
        reset: vi.fn()
      })
    );
    const globalMarkup = renderToStaticMarkup(
      React.createElement(globalError, {
        error: new Error('shell failed'),
        reset: vi.fn()
      })
    );

    expect(appMarkup).toContain('Try Again');
    expect(appMarkup).toContain('page segment failed to render');
    expect(globalMarkup).toContain('Reload App');
    expect(globalMarkup).toContain('fatal application error occurred');
  });

  it('resets the shell boundary when the route changes after an error', () => {
    const boundary = new ErrorBoundary({
      children: null,
      resetKey: '/markets'
    });

    boundary.state = {
      hasError: true,
      error: new Error('boom')
    };
    boundary.setState = ((update: Parameters<ErrorBoundary['setState']>[0]) => {
      const nextState = typeof update === 'function'
        ? update(boundary.state, boundary.props)
        : update;
      boundary.state = { ...boundary.state, ...nextState };
    }) as ErrorBoundary['setState'];
    (boundary.props as { resetKey?: string }).resetKey = '/models';

    boundary.componentDidUpdate({
      children: null,
      resetKey: '/markets'
    });

    expect(boundary.state.hasError).toBe(false);
    expect(boundary.state.error).toBeNull();
  });
});
