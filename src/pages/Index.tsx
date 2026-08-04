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
    <main
      data-testid="home-content-scroll"
      className="fixed bottom-0 left-0 right-0 top-16 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] sm:top-20"
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
);

export default Index;
