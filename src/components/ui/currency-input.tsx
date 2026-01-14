import { forwardRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, prefix = 'Rp', ...props }, ref) => {
    const formatNumber = (num: number): string => {
      if (num === 0) return '';
      return new Intl.NumberFormat('id-ID').format(num);
    };

    const parseNumber = (str: string): number => {
      return parseInt(str.replace(/\D/g, ''), 10) || 0;
    };

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const numericValue = parseNumber(rawValue);
      onChange(numericValue);
    }, [onChange]);

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          {prefix}
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          className={cn('pl-10', className)}
          value={formatNumber(value)}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
