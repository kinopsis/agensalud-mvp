/**
 * StatsCard Component Tests
 * Tests for the reusable statistics card component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import StatsCard, { StatsGrid } from '@/components/dashboard/StatsCard';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Calendar: ({ className, ...props }: any) => <div data-testid="calendar-icon" className={className} {...props} />,
  Users: ({ className, ...props }: any) => <div data-testid="users-icon" className={className} {...props} />,
  Clock: ({ className, ...props }: any) => <div data-testid="clock-icon" className={className} {...props} />,
  TrendingUp: ({ className, ...props }: any) => <div data-testid="trending-up-icon" className={className} {...props} />,
  UserCheck: ({ className, ...props }: any) => <div data-testid="user-check-icon" className={className} {...props} />,
  AlertCircle: ({ className, ...props }: any) => <div data-testid="alert-circle-icon" className={className} {...props} />,
  Plus: ({ className, ...props }: any) => <div data-testid="plus-icon" className={className} {...props} />,
  Eye: ({ className, ...props }: any) => <div data-testid="eye-icon" className={className} {...props} />,
  Settings: ({ className, ...props }: any) => <div data-testid="settings-icon" className={className} {...props} />,
  BarChart3: ({ className, ...props }: any) => <div data-testid="bar-chart-icon" className={className} {...props} />
}));

describe('StatsCard Component', () => {
  it('should render basic stats card correctly', () => {
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;
    
    render(
      <StatsCard
        title="Test Metric"
        value={42}
        subtitle="Test subtitle"
        icon={mockIcon}
        color="blue"
      />
    );

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('should render string values correctly', () => {
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;
    
    render(
      <StatsCard
        title="String Metric"
        value="Active"
        subtitle="Status"
        icon={mockIcon}
        color="green"
      />
    );

    expect(screen.getByText('String Metric')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('should render trend information correctly', () => {
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;
    
    render(
      <StatsCard
        title="Growing Metric"
        value={100}
        icon={mockIcon}
        trend={{
          value: 15,
          label: "vs last month",
          direction: 'up'
        }}
      />
    );

    expect(screen.getByText('Growing Metric')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('+15%')).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('should render negative trend correctly', () => {
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;
    
    render(
      <StatsCard
        title="Declining Metric"
        value={80}
        icon={mockIcon}
        trend={{
          value: -10,
          label: "vs last month",
          direction: 'down'
        }}
      />
    );

    expect(screen.getByText('Declining Metric')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('-10%')).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('should render neutral trend correctly', () => {
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;
    
    render(
      <StatsCard
        title="Stable Metric"
        value={50}
        icon={mockIcon}
        trend={{
          value: 0,
          label: "no change",
          direction: 'neutral'
        }}
      />
    );

    expect(screen.getByText('Stable Metric')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('no change')).toBeInTheDocument();
  });

  it('should handle action clicks', () => {
    const mockAction = jest.fn();
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;
    
    render(
      <StatsCard
        title="Clickable Metric"
        value={50}
        icon={mockIcon}
        action={{
          label: "View details",
          onClick: mockAction
        }}
      />
    );

    const actionButton = screen.getByText('View details →');
    fireEvent.click(actionButton);
    
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should show loading state', () => {
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;
    
    render(
      <StatsCard
        title="Loading Metric"
        value={0}
        icon={mockIcon}
        loading={true}
      />
    );

    // Should show loading animation
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should format large numbers correctly', () => {
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;
    
    render(
      <StatsCard
        title="Large Number"
        value={1234567}
        icon={mockIcon}
      />
    );

    expect(screen.getByText('Large Number')).toBeInTheDocument();
    // Should format with commas
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('should apply different color themes', () => {
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;
    
    const { container } = render(
      <StatsCard
        title="Red Metric"
        value={100}
        icon={mockIcon}
        color="red"
      />
    );

    // Should have red color classes
    expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
  });
});

describe('StatsGrid Component', () => {
  it('should render with correct grid columns for 1 column', () => {
    const { container } = render(
      <StatsGrid columns={1}>
        <div>Card 1</div>
      </StatsGrid>
    );

    expect(container.firstChild).toHaveClass('grid-cols-1');
  });

  it('should render with correct grid columns for 2 columns', () => {
    const { container } = render(
      <StatsGrid columns={2}>
        <div>Card 1</div>
        <div>Card 2</div>
      </StatsGrid>
    );

    expect(container.firstChild).toHaveClass('grid-cols-1', 'md:grid-cols-2');
  });

  it('should render with correct grid columns for 3 columns', () => {
    const { container } = render(
      <StatsGrid columns={3}>
        <div>Card 1</div>
        <div>Card 2</div>
        <div>Card 3</div>
      </StatsGrid>
    );

    expect(container.firstChild).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('should render with correct grid columns for 4 columns (default)', () => {
    const { container } = render(
      <StatsGrid>
        <div>Card 1</div>
        <div>Card 2</div>
        <div>Card 3</div>
        <div>Card 4</div>
      </StatsGrid>
    );

    expect(container.firstChild).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
  });

  it('should render children correctly', () => {
    render(
      <StatsGrid columns={2}>
        <div>First Card</div>
        <div>Second Card</div>
      </StatsGrid>
    );

    expect(screen.getByText('First Card')).toBeInTheDocument();
    expect(screen.getByText('Second Card')).toBeInTheDocument();
  });

  it('should have proper spacing classes', () => {
    const { container } = render(
      <StatsGrid columns={3}>
        <div>Card 1</div>
        <div>Card 2</div>
        <div>Card 3</div>
      </StatsGrid>
    );

    expect(container.firstChild).toHaveClass('grid', 'gap-6');
  });
});

describe('StatsCard Integration', () => {
  it('should work well within StatsGrid', () => {
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;
    
    render(
      <StatsGrid columns={2}>
        <StatsCard
          title="Metric 1"
          value={100}
          icon={mockIcon}
          color="blue"
        />
        <StatsCard
          title="Metric 2"
          value={200}
          icon={mockIcon}
          color="green"
        />
      </StatsGrid>
    );

    expect(screen.getByText('Metric 1')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Metric 2')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('should handle multiple actions in grid', () => {
    const mockAction1 = jest.fn();
    const mockAction2 = jest.fn();
    const mockIcon = () => <div data-testid="mock-icon">📊</div>;
    
    render(
      <StatsGrid columns={2}>
        <StatsCard
          title="Metric 1"
          value={100}
          icon={mockIcon}
          action={{
            label: "Action 1",
            onClick: mockAction1
          }}
        />
        <StatsCard
          title="Metric 2"
          value={200}
          icon={mockIcon}
          action={{
            label: "Action 2",
            onClick: mockAction2
          }}
        />
      </StatsGrid>
    );

    fireEvent.click(screen.getByText('Action 1 →'));
    fireEvent.click(screen.getByText('Action 2 →'));

    expect(mockAction1).toHaveBeenCalledTimes(1);
    expect(mockAction2).toHaveBeenCalledTimes(1);
  });
});
