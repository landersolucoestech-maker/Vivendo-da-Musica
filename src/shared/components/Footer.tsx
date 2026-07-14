import { Mail, Phone, Instagram, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to={ROUTES.home} className="flex flex-col leading-tight">
              <span className="text-lg font-extrabold tracking-tight">
                <span className="text-brand-medium">VIVENDO</span>
                <span className="text-foreground"> DA</span>
              </span>
              <span className="text-lg font-extrabold tracking-tight text-foreground -mt-1">MÚSICA</span>
            </Link>
            <p className="text-muted-foreground">
              A plataforma completa para transformar seu talento musical em carreira e negócio.
            </p>
            <div className="flex space-x-4">
              <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-brand-medium transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" aria-label="YouTube" className="text-muted-foreground hover:text-brand-medium transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-foreground font-semibold mb-4">Plataforma</h4>
            <ul className="space-y-2">
              <li><Link to={ROUTES.academy} className="text-muted-foreground hover:text-brand-medium transition-colors">Academia</Link></li>
              <li><Link to={ROUTES.marketplace} className="text-muted-foreground hover:text-brand-medium transition-colors">Marketplace</Link></li>
              <li><Link to={ROUTES.communityPublic} className="text-muted-foreground hover:text-brand-medium transition-colors">Comunidade</Link></li>
              <li><Link to={ROUTES.premiumLibraryPublic} className="text-muted-foreground hover:text-brand-medium transition-colors">Biblioteca Premium</Link></li>
              <li><Link to={ROUTES.dashboard} className="text-muted-foreground hover:text-brand-medium transition-colors">Área do Aluno</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-semibold mb-4">Suporte</h4>
            <ul className="space-y-2">
              <li><Link to={ROUTES.contact} className="text-muted-foreground hover:text-brand-medium transition-colors">Contato</Link></li>
              <li><Link to={ROUTES.eventsPublic} className="text-muted-foreground hover:text-brand-medium transition-colors">Eventos</Link></li>
              <li><Link to={ROUTES.contentPortal} className="text-muted-foreground hover:text-brand-medium transition-colors">Conteúdos</Link></li>
              <li><Link to={ROUTES.opportunitiesPublic} className="text-muted-foreground hover:text-brand-medium transition-colors">Oportunidades</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-semibold mb-4">Contato</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="break-all">contato@vivendodamusica.com</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                <Phone className="w-4 h-4 shrink-0" />
                <span>(11) 99999-9999</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © 2026 Vivendo da Música. Todos os direitos reservados.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-muted-foreground hover:text-brand-medium text-sm transition-colors">
              Política de Privacidade
            </a>
            <a href="#" className="text-muted-foreground hover:text-brand-medium text-sm transition-colors">
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
