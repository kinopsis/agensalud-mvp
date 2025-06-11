/**
 * Input UI Component
 * 
 * Basic input component for AI testing system compatibility
 * Created to fix deployment build error
 * 
 * @author AgentSalud Development Team
 * @date 2025-01-28
 */

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input: React.FC<InputProps> = ({ 
  className = '', 
  type = 'text',
  ...props 
}) => {
  const baseClasses = 'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <input
      type={type}
      className={`${baseClasses} ${className}`}
      {...props}
    />
  );
};
