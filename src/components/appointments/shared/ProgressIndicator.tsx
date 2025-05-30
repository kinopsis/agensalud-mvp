'use client';

/**
 * ProgressIndicator Component
 * Unified progress indicator for appointment booking flows
 * Shows current step and completion status
 */

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { FlowStep } from './types';

interface ProgressIndicatorProps {
  steps: FlowStep[];
  currentStep: number;
  className?: string;
}

export default function ProgressIndicator({ 
  steps, 
  currentStep, 
  className = '' 
}: ProgressIndicatorProps) {
  return (
    <div className={`p-6 border-b border-gray-200 ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
              ${step.completed ? 'bg-green-500 text-white' :
                step.current ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}
            `}>
              {step.completed ? <CheckCircle className="h-5 w-5" /> : index + 1}
            </div>
            <span className={`ml-2 text-sm transition-colors ${
              step.current ? 'font-medium text-blue-600' : 'text-gray-600'
            }`}>
              {step.title}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-4 transition-colors ${
                step.completed ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
