import { Skeleton } from "@/shared/components/ui/skeleton";

interface LoadingStateProps {
  rows?: number;
  className?: string;
}

const LoadingState = ({ rows = 3, className = "h-16 rounded-lg" }: LoadingStateProps) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className={className} />
    ))}
  </div>
);

export default LoadingState;
