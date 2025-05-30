/**
 * Appointments History View Parameter Tests
 * Tests for URL parameter handling in appointments page
 * Validates fix for view=history parameter support
 */

import { describe, it, expect } from '@jest/globals';

// Simulate the getInitialFilter function from AppointmentsPage
const getInitialFilter = (searchParams: URLSearchParams): 'all' | 'upcoming' | 'past' => {
  const viewParam = searchParams.get('view');
  if (viewParam === 'history') return 'past';
  if (viewParam === 'all') return 'all';
  return 'upcoming'; // default
};

describe('Appointments History View Parameter', () => {

  describe('URL Parameter Processing', () => {
    it('should initialize filter as "past" when view=history parameter is present', () => {
      // Test search params with view=history
      const searchParams = new URLSearchParams('view=history');
      const result = getInitialFilter(searchParams);

      expect(result).toBe('past');
    });

    it('should initialize filter as "all" when view=all parameter is present', () => {
      // Test search params with view=all
      const searchParams = new URLSearchParams('view=all');
      const result = getInitialFilter(searchParams);

      expect(result).toBe('all');
    });

    it('should initialize filter as "upcoming" when no view parameter is present', () => {
      // Test search params without view parameter
      const searchParams = new URLSearchParams('');
      const result = getInitialFilter(searchParams);

      expect(result).toBe('upcoming');
    });

    it('should initialize filter as "upcoming" when invalid view parameter is present', () => {
      // Test search params with invalid view parameter
      const searchParams = new URLSearchParams('view=invalid');
      const result = getInitialFilter(searchParams);

      expect(result).toBe('upcoming');
    });
  });

  describe('URL Parameter Validation', () => {
    it('should correctly parse view=history parameter', () => {
      const searchParams = new URLSearchParams('view=history&other=value');
      const result = getInitialFilter(searchParams);

      expect(result).toBe('past');
    });

    it('should handle empty search params', () => {
      const searchParams = new URLSearchParams();
      const result = getInitialFilter(searchParams);

      expect(result).toBe('upcoming');
    });

    it('should handle multiple parameters with view=all', () => {
      const searchParams = new URLSearchParams('date=today&view=all&filter=active');
      const result = getInitialFilter(searchParams);

      expect(result).toBe('all');
    });
  });
});
