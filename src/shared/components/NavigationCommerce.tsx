import { Menu, ShoppingCart } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

import { Button } from '@/shared/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/shared/components/ui/sheet';

const links = [
  { label: 'Academia', href: '/academia' },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'Serviços', href: '/servicos' },
  { label: 'Conteúdos', href: '/conteudos' },
  { label: 'Comunidade', href: '/comunidade' },
  { label: 'Oportunidades', href: '/oportunidades' },
];

const Brand = () => (
  <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Vivendo da Música — início">
    <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 font-display text-sm font-black text-white shadow-[0_0_24px_rgba(124,58,237,0.25)]">VDM</span>
    <span className="hidden font-display text-sm font-bold uppercase leading-tight tracking-wide text-white sm:block">
      Vivendo<br />da Música
    </span>
  </Link>
);

const NavigationCommerce = () => (
  <header className="sticky top-0 z-50 border-b border-white/8 bg-[#080808]/95 backdrop-blur-xl">
    <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center gap-6 px-4 sm:px-6 lg:px-8">
      <Brand />

      <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex" aria-label="Navegação principal">
        {links.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => [
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-white/[0.06] text-white' : 'text-[#b8b8b8] hover:text-white',
            ].join(' ')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto hidden items-center gap-2 lg:flex">
        <Button asChild variant="ghost" size="icon" aria-label="Carrinho">
          <Link to="/carrinho"><ShoppingCart className="size-5" /></Link>
        </Button>
        <Button asChild variant="ghost"><Link to="/login">Entrar</Link></Button>
        <Button asChild><Link to="/registrar">Criar conta</Link></Button>
      </div>

      <div className="ml-auto flex items-center gap-2 lg:hidden">
        <Button asChild variant="ghost" size="icon" aria-label="Carrinho">
          <Link to="/carrinho"><ShoppingCart className="size-5" /></Link>
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Abrir menu"><Menu className="size-5" /></Button>
          </SheetTrigger>
          <SheetContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-md border-white/10 bg-[#0a0a0a] p-6">
            <div className="mb-8"><Brand /></div>
            <nav className="space-y-2" aria-label="Navegação móvel">
              {links.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) => [
                    'block rounded-xl px-4 py-3 text-sm font-medium',
                    isActive ? 'bg-primary/18 text-white' : 'text-[#c7c7c7] hover:bg-white/[0.05] hover:text-white',
                  ].join(' ')}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-8 grid gap-3">
              <Button asChild variant="outline"><Link to="/login">Entrar</Link></Button>
              <Button asChild><Link to="/registrar">Criar conta</Link></Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </header>
);

export default NavigationCommerce;
