import ArticlesTeaserSection from '@/shared/components/ArticlesTeaserSection';
import ExploreAreasSection from '@/shared/components/ExploreAreasSection';
import FeaturedCoursesSection from '@/shared/components/FeaturedCoursesSection';
import Footer from '@/shared/components/Footer';
import HeroSection from '@/shared/components/HeroSection';
import InstructorsSection from '@/shared/components/InstructorsSection';
import Navigation from '@/shared/components/Navigation';
import StatsBar from '@/shared/components/StatsBar';
import TestimonialsSection from '@/shared/components/TestimonialsSection';

const Index = () => (
  <div className="vdm-page h-dvh overflow-hidden">
    <Navigation />
    <div className="h-full pt-16 sm:pt-20">
      <main
        data-testid="home-content-scroll"
        className="h-full overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
      >
        <HeroSection />
        <StatsBar />
        <ExploreAreasSection />
        <FeaturedCoursesSection />
        <InstructorsSection />
        <TestimonialsSection />
        <ArticlesTeaserSection />
        <Footer />
      </main>
    </div>
  </div>
);

export default Index;
