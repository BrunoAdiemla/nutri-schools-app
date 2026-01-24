import React, { useState, useEffect } from 'react';

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface ExtraDateInputProps {
  existingDates: Date[];
  onDateSelect: (date: Date | null) => void;
  onAddDate: () => void;
  selectedDate: Date | null;
  disabled?: boolean;
}

const ExtraDateInput: React.FC<ExtraDateInputProps> = ({
  existingDates,
  onDateSelect,
  onAddDate,
  selectedDate,
  disabled = false
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult>({ isValid: false });

  const validateExtraDate = (date: Date, existingDates: Date[]): ValidationResult => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if date is in the past
    if (date < today) {
      return { isValid: false, error: 'Data não pode ser no passado' };
    }
    
    // Check if date already exists
    const dateExists = existingDates.some(existingDate => 
      existingDate.toDateString() === date.toDateString()
    );
    
    if (dateExists) {
      return { isValid: false, error: 'Esta data já existe no cardápio' };
    }
    
    return { isValid: true };
  };

  // Validate whenever selectedDate or existingDates change
  useEffect(() => {
    if (selectedDate) {
      const result = validateExtraDate(selectedDate, existingDates);
      setValidationResult(result);
    } else {
      setValidationResult({ isValid: false });
    }
  }, [selectedDate, existingDates]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      // Create date without timezone issues
      const [year, month, day] = e.target.value.split('-').map(Number);
      const newDate = new Date(year, month - 1, day);
      onDateSelect(newDate);
    } else {
      onDateSelect(null);
    }
  };

  const handleAddClick = () => {
    if (validationResult.isValid && selectedDate) {
      onAddDate();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Adicionar data extra
          </label>
          <input
            type="date"
            value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
            onChange={handleDateChange}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 transition-colors ${
              validationResult.error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'
            } disabled:bg-slate-100 disabled:cursor-not-allowed`}
          />
        </div>
        <button
          onClick={handleAddClick}
          disabled={!validationResult.isValid || disabled}
          className="px-6 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:hover:bg-slate-300 font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <i data-lucide="plus" className="w-4 h-4"></i>
          Adicionar
        </button>
      </div>
      
      {/* Error message */}
      {validationResult.error && (
        <div className="text-sm text-red-600 flex items-center gap-1">
          <i data-lucide="alert-circle" className="w-4 h-4"></i>
          {validationResult.error}
        </div>
      )}
      
      {/* Success indicator when valid */}
      {validationResult.isValid && selectedDate && (
        <div className="text-sm text-green-600 flex items-center gap-1">
          <i data-lucide="check-circle" className="w-4 h-4"></i>
          Data válida para adição
        </div>
      )}
    </div>
  );
};

export default ExtraDateInput;