/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressIndicator from '@/components/appointments/shared/ProgressIndicator';

const mockSteps = [
  { id: 'step1', title: 'Step 1', completed: true, current: false },
  { id: 'step2', title: 'Step 2', completed: false, current: true },
  { id: 'step3', title: 'Step 3', completed: false, current: false },
  { id: 'step4', title: 'Step 4', completed: false, current: false }
];

describe('ProgressIndicator', () => {
  it('renders all steps with correct titles', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);
    
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
    expect(screen.getByText('Step 4')).toBeInTheDocument();
  });

  it('shows completed step with check icon', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);
    
    // Step 1 should be completed and show check icon
    const step1Container = screen.getByText('Step 1').previousElementSibling;
    expect(step1Container).toHaveClass('bg-green-500', 'text-white');
  });

  it('highlights current step correctly', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);
    
    // Step 2 should be current and highlighted
    const step2Text = screen.getByText('Step 2');
    expect(step2Text).toHaveClass('font-medium', 'text-blue-600');
    
    const step2Container = step2Text.previousElementSibling;
    expect(step2Container).toHaveClass('bg-blue-500', 'text-white');
  });

  it('shows future steps as inactive', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);
    
    // Step 3 and 4 should be inactive
    const step3Text = screen.getByText('Step 3');
    expect(step3Text).toHaveClass('text-gray-600');
    expect(step3Text).not.toHaveClass('font-medium', 'text-blue-600');
    
    const step3Container = step3Text.previousElementSibling;
    expect(step3Container).toHaveClass('bg-gray-200', 'text-gray-600');
  });

  it('shows step numbers for non-completed steps', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);
    
    // Step 2 (current) should show number 2
    const step2Container = screen.getByText('Step 2').previousElementSibling;
    expect(step2Container).toHaveTextContent('2');
    
    // Step 3 should show number 3
    const step3Container = screen.getByText('Step 3').previousElementSibling;
    expect(step3Container).toHaveTextContent('3');
  });

  it('renders progress lines between steps', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={1} />);
    
    // Should have 3 progress lines (between 4 steps)
    const progressLines = document.querySelectorAll('.w-8.h-0\\.5');
    expect(progressLines).toHaveLength(3);
  });

  it('shows completed progress lines in green', () => {
    render(<ProgressIndicator steps={mockSteps} currentStep={2} />);
    
    // First progress line should be green (between completed step 1 and step 2)
    const firstProgressLine = document.querySelector('.bg-green-500');
    expect(firstProgressLine).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <ProgressIndicator 
        steps={mockSteps} 
        currentStep={1} 
        className="custom-class" 
      />
    );
    
    const container = screen.getByText('Step 1').closest('.p-6');
    expect(container).toHaveClass('custom-class');
  });

  it('handles empty steps array', () => {
    render(<ProgressIndicator steps={[]} currentStep={0} />);
    
    // Should render without crashing
    const container = document.querySelector('.p-6');
    expect(container).toBeInTheDocument();
  });

  it('handles single step', () => {
    const singleStep = [
      { id: 'only-step', title: 'Only Step', completed: false, current: true }
    ];
    
    render(<ProgressIndicator steps={singleStep} currentStep={0} />);
    
    expect(screen.getByText('Only Step')).toBeInTheDocument();
    
    // Should not have any progress lines
    const progressLines = document.querySelectorAll('.w-8.h-0\\.5');
    expect(progressLines).toHaveLength(0);
  });

  it('handles all steps completed', () => {
    const completedSteps = mockSteps.map(step => ({
      ...step,
      completed: true,
      current: false
    }));
    
    render(<ProgressIndicator steps={completedSteps} currentStep={3} />);
    
    // All steps should show check icons
    completedSteps.forEach(step => {
      const stepText = screen.getByText(step.title);
      const stepContainer = stepText.previousElementSibling;
      expect(stepContainer).toHaveClass('bg-green-500', 'text-white');
    });
  });
});
