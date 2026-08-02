import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import PublicLayout from '@/app/layouts/PublicLayout';
import { supabase } from '@/integrations/supabase/client';
import { setAffiliateReferralSlug } from '@/modules/affiliate/utils/referralSession';
import EmptyState from '@/shared/components/EmptyState';
import LoadingState from '@/shared/components/LoadingState';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/constants/routes';

interface AffiliateReferralRedirectPageProps {
  slug: string;
}

const isSafeDestination = (value: string) => {
  if (value.startsWith('/') && !value.startsWith('//')) return true;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const AffiliateReferralRedirectPage = ({ slug }: AffiliateReferralRedirectPageProps) => {
  const [destination, setDestination] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const resolveReferral = async () => {
      const { data, error } = await supabase.rpc('resolve_affiliate_referral', {
        target_slug: slug,
      });

      const resolved = Array.isArray(data) ? data[0]?.destination_url : null;
      if (!active) return;

      if (error || typeof resolved !== 'string' || !isSafeDestination(resolved)) {
        setFailed(true);
        return;
      }

      setAffiliateReferralSlug(slug);

      if (resolved.startsWith('/')) {
        setDestination(resolved);
        return;
      }

      window.location.replace(resolved);
    };

    void resolveReferral();
    return () => {
      active = false;
    };
  }, [slug]);

  if (destination) return <Navigate to={destination} replace />;

  if (failed) {
    return (
      <PublicLayout>
        <EmptyState
          title="Link de indicação indisponível"
          description="Este link não existe, foi desativado ou possui um destino inválido."
          action={
            <Link to={ROUTES.home}>
              <Button>Voltar ao início</Button>
            </Link>
          }
        />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <LoadingState rows={2} className="h-16 rounded-lg" />
    </PublicLayout>
  );
};

export default AffiliateReferralRedirectPage;
