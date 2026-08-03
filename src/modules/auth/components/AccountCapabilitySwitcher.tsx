import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

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

const labels: Record<AccountCapability, string> = {
  student: 'Aluno',
  instructor: 'Instrutor',
  producer: 'Produtor',
  affiliate: 'Afiliado',
  company: 'Empresa',
  admin: 'Administrador',
  super_admin: 'Superadministrador',
};

const destinations: Record<AccountCapability, string> = {
  student: '/aluno',
  instructor: '/instrutor',
  producer: '/produtor',
  affiliate: '/afiliado',
  company: '/empresa',
  admin: '/admin',
  super_admin: '/admin',
};

const requestable = ['instructor', 'producer', 'affiliate'] as const;

const inferCapability = (pathname: string): AccountCapability => {
  if (pathname.startsWith('/instrutor')) return 'instructor';
  if (pathname.startsWith('/produtor')) return 'producer';
  if (pathname.startsWith('/afiliado')) return 'affiliate';
  if (pathname.startsWith('/empresa')) return 'company';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'student';
};

const AccountCapabilitySwitcher = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const current = inferCapability(location.pathname);
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
      navigate(destinations[capability]);
    },
    onError: (error) => toast({
      title: 'Ambiente não alterado',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      variant: 'destructive',
    }),
  });

  const requestMutation = useMutation({
    mutationFn: (capability: typeof requestable[number]) => accountCapabilitiesService.requestCapability(capability),
    onSuccess: async (_, capability) => {
      await queryClient.invalidateQueries({ queryKey: ['account-capabilities'] });
      toast({
        title: 'Ambiente ativado',
        description: `O ambiente de ${labels[capability]} já está disponível nesta conta.`,
      });
    },
    onError: (error) => toast({
      title: 'Ambiente não ativado',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      variant: 'destructive',
    }),
  });

  return (
    <div className="border-t border-white/8 p-3">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between gap-2 text-xs">
            <span className="truncate">Ambiente: {labels[current]}</span>
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
              <span className="flex-1">{labels[item.capability]}</span>
              {item.capability === current && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}

          {requestable.some((capability) => !activeNames.has(capability)) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Ativar outro ambiente</DropdownMenuLabel>
              {requestable.filter((capability) => !activeNames.has(capability)).map((capability) => (
                <DropdownMenuItem
                  key={capability}
                  disabled={requestMutation.isPending}
                  onClick={() => requestMutation.mutate(capability)}
                >
                  <PlusCircle className="mr-2 size-4" />
                  {labels[capability]}
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
