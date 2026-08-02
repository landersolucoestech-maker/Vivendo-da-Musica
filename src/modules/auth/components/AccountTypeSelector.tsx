import { AudioLines, Building2, GraduationCap, Megaphone, Presentation } from 'lucide-react';

import { ACCOUNT_PROFILES } from '@/modules/auth/data/accountProfiles';
import type { AccountProfile, AuthMode } from '@/modules/auth/types/accountProfile';
import { cn } from '@/shared/utils/utils';

const PROFILE_ICONS = {
  student: GraduationCap,
  producer: AudioLines,
  instructor: Presentation,
  company: Building2,
  affiliate: Megaphone,
} as const;

interface AccountTypeSelectorProps {
  mode: AuthMode;
  value?: AccountProfile | null;
  onSelect: (profile: AccountProfile) => void;
}

const AccountTypeSelector = ({ mode, value, onSelect }: AccountTypeSelectorProps) => (
  <section aria-labelledby="account-profile-title">
    <div className="text-center">
      <p className="vdm-eyebrow">Tipo de perfil</p>
      <h1 id="account-profile-title" className="mt-3 font-display text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
        {mode === 'login' ? 'Como você deseja entrar?' : 'Qual conta você deseja criar?'}
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
        Selecione o perfil para carregar somente os campos, validações e opções aplicáveis ao seu acesso.
      </p>
    </div>

    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {ACCOUNT_PROFILES.map((profile) => {
        const Icon = PROFILE_ICONS[profile.value];
        const selected = profile.value === value;
        return (
          <button
            key={profile.value}
            type="button"
            onClick={() => onSelect(profile.value)}
            aria-pressed={selected}
            className={cn(
              'group flex min-h-52 flex-col rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-primary/70 bg-primary/12 shadow-[0_16px_45px_rgba(138,43,226,0.18)]'
                : 'border-white/10 bg-white/[0.025] hover:border-primary/40 hover:bg-primary/[0.07]',
            )}
          >
            <span className="vdm-icon-button size-11 border-primary/25 bg-primary/10 text-primary transition group-hover:border-primary/50">
              <Icon className="size-5" />
            </span>
            <span className="mt-5 font-display text-lg font-semibold text-white">{profile.label}</span>
            <span className="mt-2 text-sm leading-6 text-muted-foreground">{profile.selectorDescription}</span>
          </button>
        );
      })}
    </div>
  </section>
);

export default AccountTypeSelector;
