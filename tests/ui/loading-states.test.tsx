/**
 * LoadingStates Tests
 * Comprehensive testing for unified loading components
 * Tests accessibility, responsive design, and functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  LoadingSpinner,
  LoadingOverlay,
  SkeletonCard,
  SkeletonStats,
  SkeletonList,
  SkeletonTable,
  LoadingButton
} from '@/components/ui/LoadingStates';

describe('LoadingStates Components', () => {
  describe('LoadingSpinner', () => {
    test('renders with default props', () => {
      render(<LoadingSpinner />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Cargando...')).toBeInTheDocument();
      expect(screen.getByLabelText('Cargando...')).toBeInTheDocument();
    });

    test('renders with custom message', () => {
      render(<LoadingSpinner message="Cargando datos..." />);
      
      expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
      expect(screen.getByLabelText('Cargando datos...')).toBeInTheDocument();
    });

    test('applies correct size classes', () => {
      const { rerender } = render(<LoadingSpinner size="sm" />);
      expect(screen.getByRole('status')).toHaveClass('text-sm');

      rerender(<LoadingSpinner size="lg" />);
      expect(screen.getByRole('status')).toHaveClass('text-lg');

      rerender(<LoadingSpinner size="xl" />);
      expect(screen.getByRole('status')).toHaveClass('text-xl');
    });

    test('has proper accessibility attributes', () => {
      render(<LoadingSpinner message="Loading test data" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading test data');
    });
  });

  describe('LoadingOverlay', () => {
    test('renders full screen overlay', () => {
      render(<LoadingOverlay />);

      const overlays = screen.getAllByRole('status');
      const mainOverlay = overlays.find(el => el.classList.contains('fixed'));
      expect(mainOverlay).toHaveClass('fixed', 'inset-0', 'z-50');
      expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    test('renders transparent overlay when specified', () => {
      render(<LoadingOverlay transparent />);

      const overlays = screen.getAllByRole('status');
      const mainOverlay = overlays.find(el => el.classList.contains('fixed'));
      expect(mainOverlay).toHaveClass('bg-white', 'bg-opacity-75');
    });

    test('has proper ARIA attributes', () => {
      render(<LoadingOverlay message="Loading application" />);

      const overlays = screen.getAllByRole('status');
      const mainOverlay = overlays.find(el => el.classList.contains('fixed'));
      expect(mainOverlay).toHaveAttribute('aria-label', 'Loading application');
      expect(mainOverlay).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('SkeletonCard', () => {
    test('renders with default props', () => {
      render(<SkeletonCard />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveAttribute('aria-label', 'Cargando contenido...');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    test('renders with avatar when specified', () => {
      render(<SkeletonCard showAvatar />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton.querySelector('.rounded-full')).toBeInTheDocument();
    });

    test('renders correct number of lines', () => {
      render(<SkeletonCard lines={5} />);
      
      const skeleton = screen.getByRole('status');
      const lines = skeleton.querySelectorAll('.h-4');
      expect(lines).toHaveLength(5);
    });

    test('applies custom className', () => {
      render(<SkeletonCard className="custom-class" />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('custom-class');
    });
  });

  describe('SkeletonStats', () => {
    test('renders with default 4 columns', () => {
      render(<SkeletonStats />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveAttribute('aria-label', 'Cargando estadísticas...');
      expect(skeleton).toHaveClass('lg:grid-cols-4');
    });

    test('renders with custom column count', () => {
      render(<SkeletonStats columns={3} />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('lg:grid-cols-3');
    });

    test('renders correct number of skeleton cards', () => {
      render(<SkeletonStats columns={2} />);
      
      const skeleton = screen.getByRole('status');
      const cards = skeleton.querySelectorAll('.animate-pulse');
      expect(cards).toHaveLength(2);
    });

    test('has responsive grid classes', () => {
      render(<SkeletonStats columns={5} />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-5');
    });
  });

  describe('SkeletonList', () => {
    test('renders with default props', () => {
      render(<SkeletonList />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveAttribute('aria-label', 'Cargando lista...');
      
      const items = skeleton.querySelectorAll('.animate-pulse');
      expect(items).toHaveLength(5); // default items count
    });

    test('renders with custom item count', () => {
      render(<SkeletonList items={3} />);
      
      const skeleton = screen.getByRole('status');
      const items = skeleton.querySelectorAll('.animate-pulse');
      expect(items).toHaveLength(3);
    });

    test('renders with images when specified', () => {
      render(<SkeletonList showImage />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton.querySelector('.h-12.w-12')).toBeInTheDocument();
    });
  });

  describe('SkeletonTable', () => {
    test('renders with default props', () => {
      render(<SkeletonTable />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveAttribute('aria-label', 'Cargando tabla...');
      expect(skeleton).toHaveClass('bg-white', 'border', 'rounded-lg');
    });

    test('renders correct number of rows and columns', () => {
      render(<SkeletonTable rows={3} columns={2} />);
      
      const skeleton = screen.getByRole('status');
      
      // Check header columns
      const headerCols = skeleton.querySelectorAll('.bg-gray-50 .h-4');
      expect(headerCols).toHaveLength(2);
      
      // Check body rows
      const bodyRows = skeleton.querySelectorAll('.divide-y > div');
      expect(bodyRows).toHaveLength(3);
    });

    test('has proper table structure', () => {
      render(<SkeletonTable />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton.querySelector('.bg-gray-50')).toBeInTheDocument(); // header
      expect(skeleton.querySelector('.divide-y')).toBeInTheDocument(); // body
    });
  });

  describe('LoadingButton', () => {
    test('renders children when not loading', () => {
      render(<LoadingButton>Click me</LoadingButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Click me');
      expect(button).not.toBeDisabled();
    });

    test('shows loading state', () => {
      render(<LoadingButton loading>Click me</LoadingButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    test('handles click events when not loading', () => {
      const handleClick = jest.fn();
      render(<LoadingButton onClick={handleClick}>Click me</LoadingButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('does not handle click events when loading', () => {
      const handleClick = jest.fn();
      render(<LoadingButton loading onClick={handleClick}>Click me</LoadingButton>);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    test('can be disabled independently of loading', () => {
      render(<LoadingButton disabled>Click me</LoadingButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    test('applies custom className', () => {
      render(<LoadingButton className="custom-btn">Click me</LoadingButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-btn');
    });

    test('supports different button types', () => {
      render(<LoadingButton type="submit">Submit</LoadingButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    test('has proper accessibility classes', () => {
      render(<LoadingButton>Click me</LoadingButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('transition-all', 'duration-200');
    });
  });

  describe('Responsive Design', () => {
    test('skeleton components have responsive classes', () => {
      render(<SkeletonStats columns={4} />);

      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');
    });

    test('loading components work on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<LoadingSpinner size="sm" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('text-sm');
    });
  });

  describe('Animation Classes', () => {
    test('skeleton components have animation classes', () => {
      render(<SkeletonCard />);

      const skeleton = screen.getByRole('status');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    test('loading spinner has animation classes', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
});
