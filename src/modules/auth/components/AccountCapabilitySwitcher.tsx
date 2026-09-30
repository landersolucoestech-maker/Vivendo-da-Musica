import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthContext } from '@/app/providers/AuthProvider';
import {
  accountCapabilitiesService,
  type AccountCapability,
} from '@/modules/auth/services/accountCapabilities.service';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useToast } from '@/shared/hooks/use-toast';

const capabilityLabels: Record<AccountCapability, string> = {
  student: 'Aluno',
  instructor: 'Instrutor',
  producer: 'Produtor',
  affiliate: 'Afiliado',
};

const capabilityDestinations: Record<AccountCapability, string> = {
  student: '/aluno',
  instructor: '/instrutor',
  producer: '/produtor',
  affiliate: '/afiliado',
};

const requestable = ['instructor', 'producer', 'affiliate'] as const;

const inferCapability = (pathname: string): AccountCapability | null => {
  if (pathname.startsWith('/instrutor')) return 'instructor';
  if (pathname.startsWith('/produtor')) return 'producer';
  if (pathname.startsWith('/afiliado')) return 'affiliate';
  if (pathname.startsWith('/aluno')) return 'student';
  return null;
};

const inferPortalLabel = (pathname: string, capability: AccountCapability | null) => {
  if (pathname.startsWith('/empresa')) return 'Empresa';
  if (pathname.startsWith('/admin')) return 'Administração';
  return capability ? capabilityLabels[capability] : 'Conta';
};

const AccountCapabilitySwitcher = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasCompanyAccess, isPlatformStaff } = useAuthContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const currentCapability = inferCapability(location.pathname);
  const currentLabel = inferPortalLabel(location.pathname, currentCapability);

  const { data } = useQuery({
    queryKey: ['account-capabilities'],
    queryFn: () => accountCapabilitiesService.list(),
  });

  const active = useMemo(
    () => (data ?? []).filter((item) => item.status === 'active'),
    [data],
  );
  const activeNames = new Set(active.map((item) => item.capability));

  const switchMutation = useMutation({
    mutationFn: (capability: AccountCapability) => accountCapabilitiesService.setDefault(capability),
    onSuccess: async (_, capability) => {
      await queryClient.invalidateQueries({ queryKey: ['account-capabilities'] });
      setOpen(false);
      navigate(capabilityDestinations[capability]);
    },
    onError: () => toast({
      title: 'Ambiente não alterado',
      description: 'Não foi possível alterar o ambiente da conta. Tente novamente.',
      variant: 'destructive',
    }),
  });

  const requestMutation = useMutation({
    mutationFn: (capability: typeof requestable[number]) =>
      accountCapabilitiesService.requestCapability(capability),
    onSuccess: async (_, capability) => {
      await queryClient.invalidateQueries({ queryKey: ['account-capabilities'] });
      toast({
        title: 'Ambiente ativado',
        description: `O ambiente de ${capabilityLabels[capability]} já está disponível nesta conta.`,
      });
    },
    onError: () => toast({
      title: 'Ambiente não ativado',
      description: 'Não foi possível ativar este ambiente. Tente novamente.',
      variant: 'destructive',
    }),
  });

  const navigateToAuthorityPortal = (destination: string) => {
    setOpen(false);
    navigate(destination);
  };

  return (
    <div className="border-t border-white/8 p-3">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between gap-2 text-xs">
            <span className="truncate">Ambiente: {currentLabel}</span>
            <ChevronsUpDown className="size-3.5 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-60">
          <DropdownMenuLabel>Ambientes ativos</DropdownMenuLabel>
          {active.map((item) => (
            <DropdownMenuItem
              key={item.capability}
              disabled={switchMutation.isPending}
              onClick={() => switchMutation.mutate(item.capability)}
            >
              <span className="flex-1">{capabilityLabels[item.capability]}</span>
              {item.capability === currentCapability && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}

          {hasCompanyAccess && (
            <DropdownMenuItem onClick={() => navigateToAuthorityPortal('/empresa')}>
              <span className="flex-1">Empresa</span>
              {location.pathname.startsWith('/empresa') && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          )}

          {isPlatformStaff && (
            <DropdownMenuItem onClick={() => navigateToAuthorityPortal('/admin')}>
              <span className="flex-1">Administração</span>
              {location.pathname.startsWith('/admin') && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          )}

          {requestable.some((capability) => !activeNames.has(capability)) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Ativar outro ambiente</DropdownMenuLabel>
              {requestable
                .filter((capability) => !activeNames.has(capability))
                .map((capability) => (
                  <DropdownMenuItem
                    key={capability}
                    disabled={requestMutation.isPending}
                    onClick={() => requestMutation.mutate(capability)}
                  >
                    <PlusCircle className="mr-2 size-4" />
                    {capabilityLabels[capability]}
                  </DropdownMenuItem>
                ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AccountCapabilitySwitcher;
