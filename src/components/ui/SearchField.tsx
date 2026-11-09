import { forwardRef, type InputHTMLAttributes } from 'react';

import { SearchIcon } from '@/components/icons/SearchIcon';
import { cx } from '@/lib/utils/cx';

import { inputBoxClassName } from './Field';

interface SearchFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className'
> {
  /** Accessible name (the visible placeholder is not a label). */
  label: string;
  className?: string;
}

/** Figma "Input / Search" (BCC Search Bar), 442 wide in the voter list toolbar. */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { label, className, ...inputProps },
  ref,
) {
  return (
    <div className={cx(inputBoxClassName(false), className)}>
      <SearchIcon className="text-neutral-200" />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent text-body-2 outline-none placeholder:text-text-secondary [&::-webkit-search-cancel-button]:appearance-none"
        {...inputProps}
      />
    </div>
  );
});
