import { AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

const ErrorState = ({ title = "Não foi possível carregar os dados", description, onRetry }: ErrorStateProps) => (
  <div className="rounded-lg border border-destructive/30 bg-card p-10 text-center flex flex-col items-center gap-3">
    <AlertCircle className="w-8 h-8 text-destructive" />
    <p className="font-medium">{title}</p>
    {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
    {onRetry && <Button type="button" variant="outline" onClick={onRetry}>Tentar novamente</Button>}
  </div>
);

export default ErrorState;
