import { Instagram, Mail, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

import BrandSignature from '@/shared/components/BrandSignature';
import { ROUTES } from '@/shared/constants/routes';

const PLATFORM_LINKS = [
  { label: 'Academia', to: ROUTES.academy },
  { label: 'Marketplace', to: ROUTES.marketplace },
  { label: 'Comunidade', to: ROUTES.communityPublic },
  { label: 'Conteúdos', to: ROUTES.contentPortal },
  { label: 'Oportunidades', to: ROUTES.opportunitiesPublic },
];

const ACCOUNT_LINKS = [
  { label: 'Portal do aluno', to: ROUTES.dashboard },
  { label: 'Portal do instrutor', to: ROUTES.instructor },
  { label: 'Portal do produtor', to: ROUTES.producer },
  { label: 'Suporte', to: ROUTES.contact },
];

const Footer = () => (
  <footer className="border-t border-white/10 bg-[#070707]">
    <div className="vdm-container py-12 sm:py-16">
      <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
        <div className="max-w-sm">
          <BrandSignature size="lg" />
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Formação, ferramentas e conhecimento para quem deseja desenvolver uma carreira sustentável no mercado musical.
          </p>
          <div className="mt-6 flex gap-3">
            <a href="#" aria-label="Instagram" className="vdm-icon-button">
              <Instagram className="size-4" />
            </a>
            <a href="#" aria-label="YouTube" className="vdm-icon-button">
              <Youtube className="size-4" />
            </a>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Plataforma</h2>
          <ul className="mt-5 space-y-3">
            {PLATFORM_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-muted-foreground transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Acesso</h2>
          <ul className="mt-5 space-y-3">
            {ACCOUNT_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-muted-foreground transition hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">Contato</h2>
          <a
            href="mailto:contato@vivendodamusica.com"
            className="mt-5 flex items-center gap-2 text-sm text-muted-foreground transition hover:text-white"
          >
            <Mail className="size-4 text-primary" />
            contato@vivendodamusica.com
          </a>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Atendimento e suporte realizados pelos canais oficiais da plataforma.
          </p>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Vivendo da Música by Lander Solutions. Todos os direitos reservados.</p>
        <div className="flex gap-5">
          <Link to={ROUTES.privacyPolicy} className="transition hover:text-white">
            Política de Privacidade
          </Link>
          <Link to={ROUTES.termsOfUse} className="transition hover:text-white">
            Termos de Uso
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
