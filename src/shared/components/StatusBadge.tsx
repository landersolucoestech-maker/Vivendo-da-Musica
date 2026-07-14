import { cn } from "@/shared/utils/utils";

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/15 text-red-400 border-red-500/30',
  neutral: 'bg-white/5 text-muted-foreground border-border',
  info: 'bg-brand-medium/10 text-brand-medium border-brand-medium/30',
};

const STATUS_TONE_MAP: Record<string, StatusTone> = {
  // success-ish
  ativo: 'success', publicado: 'success', pago: 'success', emitido: 'success',
  aberta: 'success', resolvido: 'success', conectado: 'success', publicada: 'success',
  // warning-ish
  pendente: 'warning', rascunho: 'warning', 'em-andamento': 'warning', alta: 'warning',
  // danger-ish
  inativo: 'danger', expirado: 'danger', encerrada: 'danger', reembolsado: 'danger',
  alerta: 'danger', desconectado: 'danger', cancelada: 'danger', bloqueado: 'danger',
  // info-ish
  draft: 'neutral', live: 'info', replay: 'neutral', upcoming: 'info', aberto: 'info', agendada: 'info', ativa: 'success',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  const tone = STATUS_TONE_MAP[status.toLowerCase()] ?? 'neutral';
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border', TONE_CLASSES[tone])}>
      {label ?? status}
    </span>
  );
};

export default StatusBadge;
