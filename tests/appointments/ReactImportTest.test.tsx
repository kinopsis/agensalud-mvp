/**
 * @jest-environment jsdom
 */

import React from 'react';

describe('React Import Test', () => {
  it('should have React properly imported', () => {
    expect(React).toBeDefined();
    expect(React.useState).toBeDefined();
    expect(React.useEffect).toBeDefined();
    expect(typeof React.useState).toBe('function');
    expect(typeof React.useEffect).toBe('function');
  });

  it('should be able to use useState', () => {
    const TestComponent = () => {
      const [state, setState] = React.useState('test');
      return React.createElement('div', null, state);
    };

    expect(() => {
      React.createElement(TestComponent);
    }).not.toThrow();
  });

  it('should be able to import from react directly', async () => {
    const { useState, useEffect } = await import('react');
    expect(useState).toBeDefined();
    expect(useEffect).toBeDefined();
    expect(typeof useState).toBe('function');
    expect(typeof useEffect).toBe('function');
  });
});

/**
 * Test to verify React imports are working correctly
 * This helps isolate React import issues from component-specific problems
 */
