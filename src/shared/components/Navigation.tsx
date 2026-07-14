import { useState, useEffect } from 'react';
import { Button } from "@/shared/components/ui/button";
import { Menu, X, ShoppingCart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ROUTES } from "@/shared/constants/routes";
import { useCart } from "@/modules/checkout/store/CartContext";

const NAV_LINKS = [
  { label: 'Academia', to: ROUTES.academy },
  { label: 'Marketplace', to: ROUTES.marketplace },
  { label: 'Comunidade', to: ROUTES.communityPublic },
  { label: 'Área VIP', to: ROUTES.vipArea },
  { label: 'Conteúdos', to: ROUTES.contentPortal },
  { label: 'Eventos', to: ROUTES.eventsPublic },
  { label: 'Oportunidades', to: ROUTES.opportunitiesPublic },
];

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { items } = useCart();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    navigate(user ? ROUTES.dashboard : ROUTES.register);
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-md border-b border-border z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to={ROUTES.home} className="flex flex-col leading-tight shrink-0">
            <span className="text-base font-extrabold tracking-tight">
              <span className="text-brand-medium">VIVENDO</span>
              <span className="text-foreground"> DA</span>
            </span>
            <span className="text-base font-extrabold tracking-tight text-foreground -mt-1">MÚSICA</span>
          </Link>

          <div className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link to={ROUTES.cart} aria-label="Carrinho" className="relative p-2 text-foreground hover:text-brand-medium transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {items.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-brand-medium text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>
            {user ? (
              <Link to={ROUTES.dashboard}>
                <Button size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to={ROUTES.login}>
                  <Button variant="ghost" size="sm">Entrar</Button>
                </Link>
                <Button size="sm" onClick={handleGetStarted}>
                  Criar conta
                </Button>
              </>
            )}
          </div>

          <button
            className="lg:hidden text-foreground"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="lg:hidden py-4 space-y-4 border-t border-border">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <Link to={ROUTES.dashboard} onClick={() => setIsOpen(false)}>
                <Button size="sm" className="w-full">Dashboard</Button>
              </Link>
            ) : (
              <div className="space-y-2">
                <Link to={ROUTES.login} onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">Entrar</Button>
                </Link>
                <Button size="sm" onClick={handleGetStarted} className="w-full">
                  Criar conta
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
