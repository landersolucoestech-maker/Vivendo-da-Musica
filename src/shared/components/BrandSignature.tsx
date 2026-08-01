import { VdmBrand } from '@/shared/components/brand/VdmBrand';
import { cn } from '@/shared/utils/utils';

interface BrandSignatureProps {
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
  className?: string;
  showTagline?: boolean;
}

const sizeClasses: Record<NonNullable<BrandSignatureProps['size']>, string> = {
  sm: 'scale-90 origin-left',
  md: '',
  lg: 'scale-110 origin-left',
};

const BrandSignature = ({
  size = 'md',
  compact = false,
  className,
  showTagline = false,
}: BrandSignatureProps) => (
  <VdmBrand
    compact={compact}
    showTagline={showTagline}
    className={cn(sizeClasses[size], className)}
  />
);

export default BrandSignature;
