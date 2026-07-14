import { supabase } from "@/integrations/supabase/client";
import { isDevAuthBypassEnabled } from "@/shared/utils/devAuthBypass";
import { MOCK_MODULES } from "@/shared/utils/devMockData";
import { MOCK_COURSES, MOCK_COURSE_CATEGORIES, getCourseBySlug, getRelatedCourses } from "@/mocks/courses.mock";
import { MOCK_INSTRUCTORS } from "@/mocks/instructors.mock";
import { MOCK_TESTIMONIALS } from "@/mocks/testimonials.mock";
import { MOCK_COURSE_EXTRAS, DEFAULT_COURSE_EXTRAS } from "@/mocks/academy.mock";
import { academyContentService } from "@/modules/courses/services/academyContent.service";
import type { AcademyContent } from "@/modules/courses/types/academyContent.types";
import type { CourseModule } from "@/modules/modules-manager/types/courseModule";
import type { MockCourse, Instructor, Testimonial, CourseDisplayExtras, CatalogCourse } from "@/modules/courses/types/course.types";

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
}

/**
 * academy.service — single seam between Academia/course-detail/lesson-player
 * components and their data sources. Real courses/modules already come from
 * Supabase (RLS-gated); the catalog-volume pieces (mock courses, instructors,
 * testimonials, display extras) are mocked until a `category`/instructor
 * join exists on `courses`. Swapping any one of these for a real query later
 * only touches this file — hooks and components keep their current shape.
 */
export const academyService = {
  async listRealCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, slug, description, thumbnail_url, price_cents, currency');

    if (error) throw error;
    return data ?? [];
  },

  async listCourseModules(): Promise<CourseModule[]> {
    if (isDevAuthBypassEnabled) return MOCK_MODULES;

    const { data, error } = await supabase
      .from('course_modules')
      .select(
        `
        id,
        title,
        description,
        order_index,
        lessons (
          id,
          title,
          description,
          video_url,
          duration_minutes,
          order_index,
          module_id
        )
      `
      )
      .order('order_index', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description || 'Descrição não disponível',
      progress: 0, // calculated by useProgressCalculation
      lessons: (module.lessons ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || 'Descrição não disponível',
          videoUrl: lesson.video_url || '',
          duration: lesson.duration_minutes ? `${lesson.duration_minutes}:00` : '15:30',
          completed: false,
          order_index: lesson.order_index,
          module_id: lesson.module_id,
        })),
    }));
  },

  async listCatalogCourses(): Promise<MockCourse[]> {
    return MOCK_COURSES;
  },

  async getCatalogCourseBySlug(slug: string): Promise<MockCourse | undefined> {
    return getCourseBySlug(slug);
  },

  async getCatalogCourseById(id: string): Promise<MockCourse | undefined> {
    return MOCK_COURSES.find((c) => c.id === id);
  },

  async createCourse(payload: { title: string; slug: string; description: string; price_cents: number; currency: string }) {
    return supabase.from('courses').insert({ ...payload, status: 'draft' });
  },

  async updateCourse(id: string, payload: { title: string; slug: string; description: string; price_cents: number; currency: string }) {
    return supabase.from('courses').update(payload).eq('id', id);
  },

  async listRelatedCourses(course: MockCourse): Promise<MockCourse[]> {
    return getRelatedCourses(course);
  },

  async listCourseCategories(): Promise<readonly string[]> {
    return MOCK_COURSE_CATEGORIES;
  },

  async listInstructors(): Promise<Instructor[]> {
    return MOCK_INSTRUCTORS;
  },

  async getInstructorById(id: string): Promise<Instructor | undefined> {
    return MOCK_INSTRUCTORS.find((i) => i.id === id);
  },

  async listTestimonials(): Promise<Testimonial[]> {
    return MOCK_TESTIMONIALS;
  },

  async getCourseExtras(slug: string): Promise<CourseDisplayExtras> {
    return MOCK_COURSE_EXTRAS[slug] ?? DEFAULT_COURSE_EXTRAS;
  },

  /** Ready-to-render catalog cards: real courses (Supabase) merged with the
   * mock catalog (deduped by slug), each enriched with instructor name.
   * Real courses are best-effort — if Supabase is unreachable, the catalog
   * still renders fully from the mock list instead of blocking on it. */
  async listCourseCards(): Promise<CatalogCourse[]> {
    const [realCourses, mockCourses] = await Promise.all([
      this.listRealCourses().catch(() => [] as Course[]),
      this.listCatalogCourses(),
    ]);
    const academyContents = await academyContentService.listPublished().catch(() => [] as AcademyContent[]);

    const real = await Promise.all(realCourses.map((course) => this.mapRealCourseToCard(course)));
    const realSlugs = new Set(real.map((c) => c.slug));
    const mock = mockCourses.filter((c) => !realSlugs.has(c.slug)).map((c) => this.mapMockCourseToCard(c));
    const contents = academyContents.map((content) => this.mapAcademyContentToCard(content));

    return [...contents, ...real, ...mock];
  },

  async listFeaturedCourseCards(): Promise<CatalogCourse[]> {
    const featured = MOCK_COURSES.filter((c) => c.featured);
    return featured.map((c) => this.mapMockCourseToCard(c));
  },

  async mapRealCourseToCard(course: Course): Promise<CatalogCourse> {
    const extras = await this.getCourseExtras(course.slug);
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      category: 'Produção Musical',
      level: extras.level,
      instructorName: extras.instructorName,
      rating: extras.rating,
      reviewCount: extras.reviewCount,
      studentsCount: 8500,
      priceCents: course.price_cents,
      currency: course.currency,
      thumbnailUrl: course.thumbnail_url,
      gradientFrom: '#7C3AED',
      gradientTo: '#312E81',
      isReal: true,
      itemType: 'course',
    };
  },

  mapMockCourseToCard(course: MockCourse): CatalogCourse {
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.shortDescription,
      category: course.category,
      level: course.level,
      instructorName: MOCK_INSTRUCTORS.find((i) => i.id === course.instructorId)?.name ?? 'Equipe Vivendo da Música',
      rating: course.rating,
      reviewCount: course.reviewCount,
      studentsCount: course.studentsCount,
      priceCents: course.priceCents,
      currency: course.currency,
      thumbnailUrl: null,
      gradientFrom: course.gradientFrom,
      gradientTo: course.gradientTo,
      isReal: false,
      itemType: 'course',
    };
  },

  mapAcademyContentToCard(content: AcademyContent): CatalogCourse {
    return {
      id: content.id,
      slug: content.slug,
      title: content.title,
      description: content.description ?? content.subtitle ?? null,
      category: content.category ?? 'Academia',
      level: 'Conteudo',
      instructorName: 'Equipe Vivendo da Musica',
      rating: 0,
      reviewCount: 0,
      studentsCount: 0,
      priceCents: 0,
      currency: 'BRL',
      thumbnailUrl: content.thumbnailUrl ?? content.bannerUrl ?? null,
      gradientFrom: '#7C3AED',
      gradientTo: '#312E81',
      isReal: true,
      itemType: 'academy-content',
      hasVideo: !!content.videoUrl,
      hasMaterials: !!content.attachments?.length,
      hasWrittenContent: !!content.body,
      status: content.status,
    };
  },
};
