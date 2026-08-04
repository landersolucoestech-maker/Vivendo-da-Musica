import { useState } from 'react';
import { Menu, ShoppingCart, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuthContext } from '@/app/providers/AuthProvider';
import { useCart } from '@/modules/checkout/store/CartContext';
import { VdmBrand } from '@/shared/components/brand/VdmBrand';
import { Button } from '@/shared/components/ui/button';
import { ROUTES } from '@/shared/constants/routes';
import { getPortalRoute } from '@/shared/utils/portalRoute';

const NAV_LINKS = [
  { label: 'Academia', to: ROUTES.academy },
  { label: 'Marketplace', to: ROUTES.marketplace },
  { label: 'Serviços', to: ROUTES.servicesPublic },
  { label: 'Conteúdos', to: ROUTES.contentPortal },
  { label: 'Comunidade', to: ROUTES.communityPublic },
  { label: 'Oportunidades', to: ROUTES.opportunitiesPublic },
];

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { items } = useCart();
  const { session, role } = useAuthContext();
  const portalRoute = getPortalRoute(role);

  const handleGetStarted = () => {
    navigate(session ? portalRoute : ROUTES.register);
    setIsOpen(false);
  };

  return (
    <nav className="sticky inset-x-0 top-0 z-50 w-full border-b border-white/10 bg-[#0D0D0D]/94 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-5 sm:h-20">
          <Link to={ROUTES.home} className="shrink-0" aria-label="Vivendo da Música — início">
            <VdmBrand compact className="origin-left scale-90 sm:hidden" />
            <VdmBrand className="hidden origin-left scale-[0.82] sm:inline-flex md:scale-90 lg:scale-100" />
          </Link>

          <div className="hidden items-center gap-7 xl:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="relative py-2 text-sm font-medium text-muted-foreground transition hover:text-white after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-gradient-brand after:transition-transform hover:after:scale-x-100"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Link to={ROUTES.cart} aria-label="Carrinho" className="vdm-icon-button relative">
              <ShoppingCart className="size-5" />
              {items.length > 0 && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-gradient-brand text-[10px] font-bold text-white">
                  {items.length > 9 ? '9+' : items.length}
                </span>
              )}
            </Link>

            {session ? (
              <Button asChild size="sm"><Link to={portalRoute}>Meu portal</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to={ROUTES.login}>Entrar</Link></Button>
                <Button size="sm" onClick={handleGetStarted}>Criar conta</Button>
              </>
            )}
          </div>

          <button
            className="vdm-icon-button lg:hidden"
            onClick={() => setIsOpen((open) => !open)}
            aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {isOpen && (
          <div className="space-y-2 border-t border-white/10 py-4 lg:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <div className="grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-3">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to={ROUTES.cart} onClick={() => setIsOpen(false)}>Carrinho ({items.length})</Link>
              </Button>
              {session ? (
                <Button asChild size="sm" className="w-full sm:col-span-2">
                  <Link to={portalRoute} onClick={() => setIsOpen(false)}>Meu portal</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link to={ROUTES.login} onClick={() => setIsOpen(false)}>Entrar</Link>
                  </Button>
                  <Button size="sm" onClick={handleGetStarted} className="w-full">Criar conta</Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
