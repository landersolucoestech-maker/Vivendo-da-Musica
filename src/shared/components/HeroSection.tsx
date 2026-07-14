import { Button } from "@/shared/components/ui/button";
import { Play } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";

const HeroSection = () => {
  return (
    <section id="home" className="relative overflow-hidden bg-background pt-32 pb-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Aprenda. Crie.
              <br />
              Conecte-se.
              <br />
              <span className="gradient-text">Viva da música.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
              Cursos, comunidade e marketplace em um só lugar para transformar talento musical em carreira.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <Link to={ROUTES.academy}>
                <Button size="lg" className="text-base px-7">
                  Explorar academia
                </Button>
              </Link>
              <Link to={ROUTES.marketplace}>
                <Button size="lg" variant="outline" className="text-base px-7">
                  Ver marketplace
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-border bg-card p-2">
              <div className="aspect-video rounded-lg bg-gradient-brand relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40" />
                <Button
                  size="lg"
                  aria-label="Reproduzir vídeo de apresentação"
                  className="relative z-10 rounded-full w-16 h-16 bg-white/20 hover:bg-white/30 text-white border border-white/30 p-0"
                >
                  <Play className="w-7 h-7" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
