/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SelectionCard from '@/components/appointments/shared/SelectionCard';

const mockOptions = [
  {
    id: 'option-1',
    title: 'Option 1',
    subtitle: 'Subtitle 1',
    description: 'Description 1',
    price: 100
  },
  {
    id: 'option-2',
    title: 'Option 2',
    subtitle: 'Subtitle 2',
    description: 'Description 2',
    price: 200,
    disabled: true
  },
  {
    id: 'option-3',
    title: 'Option 3',
    subtitle: 'Subtitle 3'
  }
];

const mockProps = {
  options: mockOptions,
  onSelect: jest.fn(),
  title: 'Test Selection',
  subtitle: 'Choose an option'
};

describe('SelectionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and subtitle correctly', () => {
    render(<SelectionCard {...mockProps} />);

    expect(screen.getByText('Test Selection')).toBeInTheDocument();
    expect(screen.getByText('Choose an option')).toBeInTheDocument();
  });

  it('renders all options with correct content', () => {
    render(<SelectionCard {...mockProps} />);

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Subtitle 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();

    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('handles option selection correctly', () => {
    render(<SelectionCard {...mockProps} />);

    const option1Button = screen.getByText('Option 1').closest('button');
    fireEvent.click(option1Button!);

    expect(mockProps.onSelect).toHaveBeenCalledWith(mockOptions[0]);
  });

  it('disables disabled options', () => {
    render(<SelectionCard {...mockProps} />);

    const option2Button = screen.getByText('Option 2').closest('button');
    expect(option2Button).toBeDisabled();

    fireEvent.click(option2Button!);
    expect(mockProps.onSelect).not.toHaveBeenCalled();
  });

  it('shows selected state correctly', () => {
    render(<SelectionCard {...mockProps} selectedId="option-1" />);

    const option1Button = screen.getByText('Option 1').closest('button');
    expect(option1Button).toHaveClass('ring-2', 'ring-blue-200');
  });

  it('shows loading state', () => {
    render(<SelectionCard {...mockProps} loading={true} />);

    expect(screen.getByText('Cargando opciones...')).toBeInTheDocument();
    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
  });

  it('shows empty state when no options', () => {
    render(<SelectionCard {...mockProps} options={[]} />);

    expect(screen.getByText('No hay opciones disponibles')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(
      <SelectionCard
        {...mockProps}
        options={[]}
        emptyMessage="Custom empty message"
      />
    );

    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('applies correct grid layout', () => {
    render(<SelectionCard {...mockProps} gridCols={2} />);

    // Find the grid container that contains all options
    const gridContainer = screen.getByText('Option 1').closest('button')?.parentElement;
    expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-3');
  });

  it('handles options without price', () => {
    const optionsWithoutPrice = [
      { id: 'no-price', title: 'No Price Option', subtitle: 'No price' }
    ];

    render(<SelectionCard {...mockProps} options={optionsWithoutPrice} />);

    expect(screen.getByText('No Price Option')).toBeInTheDocument();
    expect(screen.queryByText('$')).not.toBeInTheDocument();
  });
});
