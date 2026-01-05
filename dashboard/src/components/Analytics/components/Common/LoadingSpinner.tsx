import React from 'react';
import { ClipLoader } from 'react-spinners';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  loading?: boolean;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  color = '#3B82F6',
  loading = true,
  text
}) => {
  if (!loading) return null;

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <ClipLoader size={size} color={color} loading={loading} />
      {text && (
        <p className="mt-4 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};
