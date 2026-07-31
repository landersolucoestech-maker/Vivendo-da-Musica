import { cn } from '@/shared/utils/utils';

interface VdmBrandProps {
  compact?: boolean;
  className?: string;
  showTagline?: boolean;
}

export function VdmBrand({ compact = false, className, showTagline = false }: VdmBrandProps) {
  return (
    <div className={cn('inline-flex items-center gap-3', className)} aria-label="Vivendo da Música">
      <div className="flex items-center font-display text-2xl font-extrabold tracking-[-0.1em] sm:text-3xl">
        <span className="bg-gradient-brand bg-clip-text pr-0.5 text-transparent">V</span>
        <span className="relative text-white">
          D
          <span className="absolute left-[43%] top-1/2 block size-0 -translate-x-1/2 -translate-y-1/2 border-y-[5px] border-l-[8px] border-y-transparent border-l-brand-black sm:border-y-[6px] sm:border-l-[9px]" />
        </span>
        <span className="text-white">M</span>
      </div>

      {!compact && (
        <>
          <span className="h-9 w-px bg-white/28" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold uppercase leading-[1.05] tracking-[0.02em] text-white sm:text-base">
              Vivendo
              <br />
              da Música
            </span>
            {showTagline && (
              <span className="mt-1 text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-primary">
                Plataforma de educação musical
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
