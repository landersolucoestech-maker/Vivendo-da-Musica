interface FilterBarOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  options: (string | FilterBarOption)[];
  value: string;
  onChange: (value: string) => void;
}

const FilterBar = ({ options, value, onChange }: FilterBarProps) => (
  <div className="flex flex-wrap gap-2" role="group">
    {options.map((option) => {
      const optValue = typeof option === 'string' ? option : option.value;
      const optLabel = typeof option === 'string' ? option : option.label;
      return (
        <button
          key={optValue}
          onClick={() => onChange(optValue)}
          aria-pressed={value === optValue}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors border ${
            value === optValue
              ? 'bg-brand-medium/10 text-brand-medium border-brand-medium/30 font-medium'
              : 'text-muted-foreground border-border hover:bg-white/5 hover:text-foreground'
          }`}
        >
          {optLabel}
        </button>
      );
    })}
  </div>
);

export default FilterBar;
