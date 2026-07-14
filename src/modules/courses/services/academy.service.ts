import { supabase } from "@/integrations/supabase/client";
import { isDevAuthBypassEnabled } from "@/shared/utils/devAuthBypass";
import { MOCK_MODULES } from "@/shared/utils/devMockData";
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
  instructor_id: string | null;
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
      .select('id, title, slug, description, thumbnail_url, price_cents, currency, instructor_id')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async listPublishedCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, slug, description, thumbnail_url, price_cents, currency, instructor_id')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
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
    const courses = await this.listPublishedCourses();
    return Promise.all(courses.map(async (course) => {
      const { data, error } = await supabase
        .from('course_modules')
        .select('title, order_index, lessons(title, duration_minutes, order_index)')
        .eq('course_id', course.id)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        category: 'Produção Musical',
        level: 'Iniciante' as const,
        instructorId: course.instructor_id ?? '',
        priceCents: course.price_cents,
        currency: course.currency,
        rating: 0,
        reviewCount: 0,
        studentsCount: 0,
        durationHours: 0,
        gradientFrom: '#7C3AED',
        gradientTo: '#312E81',
        shortDescription: course.description ?? '',
        description: course.description ?? '',
        modules: (data ?? []).map((module) => ({
          title: module.title,
          lessons: (module.lessons ?? [])
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((lesson) => ({ title: lesson.title, durationMinutes: lesson.duration_minutes ?? 0 })),
        })),
        faq: [],
        reviews: [],
        relatedSlugs: [],
      };
    }));
  },

  async getCatalogCourseBySlug(slug: string): Promise<MockCourse | undefined> {
    return (await this.listCatalogCourses()).find((course) => course.slug === slug);
  },

  async getCatalogCourseById(id: string): Promise<MockCourse | undefined> {
    return (await this.listCatalogCourses()).find((course) => course.id === id);
  },

  async createCourse(payload: { title: string; slug: string; description: string; price_cents: number; currency: string }) {
    return supabase.from('courses').insert({ ...payload, status: 'draft' });
  },

  async updateCourse(id: string, payload: { title: string; slug: string; description: string; price_cents: number; currency: string }) {
    return supabase.from('courses').update(payload).eq('id', id);
  },

  async listRelatedCourses(course: MockCourse): Promise<MockCourse[]> {
    return (await this.listCatalogCourses()).filter((candidate) => candidate.id !== course.id).slice(0, 3);
  },

  async listCourseCategories(): Promise<readonly string[]> {
    const courses = await this.listCatalogCourses();
    const categories = courses.map((course: MockCourse) => course.category);
    return [...new Set<string>(categories)].sort();
  },

  async listInstructors(): Promise<Instructor[]> {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('user_id, full_name')
      .eq('role', 'instructor')
      .order('full_name', { ascending: true });
    if (error) throw error;

    return Promise.all((profiles ?? []).map(async (profile) => {
      const { count, error: countError } = await supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('instructor_id', profile.user_id)
        .eq('status', 'published');
      if (countError) throw countError;

      return {
        id: profile.user_id,
        name: profile.full_name ?? 'Instrutor',
        specialty: 'Instrutor',
        bio: '',
        rating: 0,
        studentsCount: 0,
        coursesCount: count ?? 0,
        gradientFrom: '#7C3AED',
        gradientTo: '#312E81',
      };
    }));
  },

  async getInstructorById(id: string): Promise<Instructor | undefined> {
    return (await this.listInstructors()).find((instructor) => instructor.id === id);
  },

  async listTestimonials(): Promise<Testimonial[]> {
    return [];
  },

  async getCourseExtras(slug: string): Promise<CourseDisplayExtras> {
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('slug', slug)
      .maybeSingle();
    if (courseError) throw courseError;

    let instructorName = 'Equipe Vivendo da Música';
    if (course?.instructor_id) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', course.instructor_id)
        .maybeSingle();
      if (profileError) throw profileError;
      instructorName = profile?.full_name ?? instructorName;
    }

    return { instructorName, rating: 0, reviewCount: 0, level: 'Iniciante' };
  },

  /** Ready-to-render catalog cards: real courses (Supabase) merged with the
   * mock catalog (deduped by slug), each enriched with instructor name.
   * Real courses are best-effort — if Supabase is unreachable, the catalog
   * still renders fully from the mock list instead of blocking on it. */
  async listCourseCards(): Promise<CatalogCourse[]> {
    const realCourses = await this.listPublishedCourses();
    const academyContents = await academyContentService.listPublished();

    const real = await Promise.all(realCourses.map((course) => this.mapRealCourseToCard(course)));
    const contents = academyContents.map((content) => this.mapAcademyContentToCard(content));

    return [...contents, ...real];
  },

  async listFeaturedCourseCards(): Promise<CatalogCourse[]> {
    return (await this.listCourseCards()).slice(0, 3);
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
      instructorName: 'Equipe Vivendo da Música',
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
