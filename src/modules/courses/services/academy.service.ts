import { supabase } from '@/integrations/supabase/client';
import { academyContentService } from '@/modules/courses/services/academyContent.service';
import type { AcademyContent } from '@/modules/courses/types/academyContent.types';
import type {
  CatalogCourse,
  CourseDisplayExtras,
  CourseReview,
  Instructor,
  MockCourse,
  Testimonial,
} from '@/modules/courses/types/course.types';
import type { CourseModule } from '@/modules/modules-manager/types/courseModule';

export interface Course {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  original_price_cents: number;
  discount_cents: number;
  price_cents: number | null;
  currency: string;
  instructor_id: string | null;
}

interface CourseReviewRow {
  course_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface EnrollmentRow {
  course_id: string;
  user_id: string;
}

interface ProfileNameRow {
  user_id: string;
  full_name: string | null;
}

interface CourseMetrics {
  rating: number;
  reviewCount: number;
  studentsCount: number;
  studentIds: Set<string>;
  reviews: CourseReview[];
}

const COURSE_SELECT = 'id, title, slug, short_description, description, thumbnail_url, category, original_price_cents, discount_cents, price_cents, currency, instructor_id';

const durationLabel = (minutes: number | null) => {
  const safeMinutes = Math.max(0, minutes ?? 0);
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  return hours > 0 ? `${hours}:${String(remainingMinutes).padStart(2, '0')}:00` : `${remainingMinutes}:00`;
};

const emptyMetrics = (): CourseMetrics => ({
  rating: 0,
  reviewCount: 0,
  studentsCount: 0,
  studentIds: new Set<string>(),
  reviews: [],
});

const loadCourseMetrics = async (courseIds: string[]): Promise<Map<string, CourseMetrics>> => {
  const uniqueCourseIds = [...new Set(courseIds.filter(Boolean))];
  const metricsByCourse = new Map(uniqueCourseIds.map((courseId) => [courseId, emptyMetrics()]));
  if (uniqueCourseIds.length === 0) return metricsByCourse;

  const { data: reviewData, error: reviewError } = await supabase
    .from('course_reviews')
    .select('course_id,user_id,rating,comment,created_at')
    .in('course_id', uniqueCourseIds)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (reviewError) throw reviewError;

  const reviewRows = (reviewData ?? []) as CourseReviewRow[];
  const reviewUserIds = [...new Set(reviewRows.map((review) => review.user_id))];
  const profileNames = new Map<string, string>();

  if (reviewUserIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id,full_name')
      .in('user_id', reviewUserIds);
    if (profileError) throw profileError;

    for (const profile of (profileData ?? []) as ProfileNameRow[]) {
      profileNames.set(profile.user_id, profile.full_name?.trim() || 'Aluno da plataforma');
    }
  }

  const ratingsByCourse = new Map<string, number[]>();
  for (const review of reviewRows) {
    const metrics = metricsByCourse.get(review.course_id) ?? emptyMetrics();
    const ratings = ratingsByCourse.get(review.course_id) ?? [];
    ratings.push(review.rating);
    ratingsByCourse.set(review.course_id, ratings);
    metrics.reviews.push({
      author: profileNames.get(review.user_id) ?? 'Aluno da plataforma',
      rating: review.rating,
      comment: review.comment,
    });
    metricsByCourse.set(review.course_id, metrics);
  }

  const { data: enrollmentData, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('course_id,user_id')
    .in('course_id', uniqueCourseIds)
    .eq('status', 'active');
  if (enrollmentError) throw enrollmentError;

  for (const enrollment of (enrollmentData ?? []) as EnrollmentRow[]) {
    const metrics = metricsByCourse.get(enrollment.course_id) ?? emptyMetrics();
    metrics.studentIds.add(enrollment.user_id);
    metricsByCourse.set(enrollment.course_id, metrics);
  }

  for (const courseId of uniqueCourseIds) {
    const metrics = metricsByCourse.get(courseId) ?? emptyMetrics();
    const ratings = ratingsByCourse.get(courseId) ?? [];
    metrics.reviewCount = ratings.length;
    metrics.rating = ratings.length > 0
      ? Math.round((ratings.reduce((total, rating) => total + rating, 0) / ratings.length) * 10) / 10
      : 0;
    metrics.studentsCount = metrics.studentIds.size;
    metricsByCourse.set(courseId, metrics);
  }

  return metricsByCourse;
};

export const academyService = {
  async listRealCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_SELECT)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Course[];
  },

  async listPublishedCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_SELECT)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Course[];
  },

  async listCourseModules(courseId?: string): Promise<CourseModule[]> {
    let query = supabase
      .from('course_modules')
      .select(`
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
      `)
      .order('order_index', { ascending: true });

    if (courseId) query = query.eq('course_id', courseId);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description ?? '',
      progress: 0,
      lessons: (module.lessons ?? [])
        .slice()
        .sort((first, second) => first.order_index - second.order_index)
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description ?? '',
          videoUrl: lesson.video_url ?? '',
          duration: durationLabel(lesson.duration_minutes),
          completed: false,
          order_index: lesson.order_index,
          module_id: lesson.module_id,
        })),
    }));
  },

  async listCatalogCourses(): Promise<MockCourse[]> {
    const courses = await this.listPublishedCourses();
    const metricsByCourse = await loadCourseMetrics(courses.map((course) => course.id));
    const catalog: MockCourse[] = [];

    for (const course of courses) {
      const { data: modules, error } = await supabase
        .from('course_modules')
        .select('title, order_index, lessons(title, duration_minutes, order_index)')
        .eq('course_id', course.id)
        .order('order_index', { ascending: true });

      if (error) throw error;

      const normalizedModules = (modules ?? []).map((module) => ({
        title: module.title,
        lessons: (module.lessons ?? [])
          .slice()
          .sort((first, second) => first.order_index - second.order_index)
          .map((lesson) => ({
            title: lesson.title,
            durationMinutes: lesson.duration_minutes ?? 0,
          })),
      }));

      const durationMinutes = normalizedModules.reduce(
        (courseTotal, module) => courseTotal + module.lessons.reduce((moduleTotal, lesson) => moduleTotal + lesson.durationMinutes, 0),
        0,
      );
      const metrics = metricsByCourse.get(course.id) ?? emptyMetrics();

      catalog.push({
        id: course.id,
        slug: course.slug,
        title: course.title,
        category: course.category ?? 'Produção Musical',
        level: 'Iniciante',
        instructorId: course.instructor_id ?? '',
        priceCents: course.price_cents ?? Math.max(0, course.original_price_cents - course.discount_cents),
        originalPriceCents: course.discount_cents > 0 ? course.original_price_cents : undefined,
        currency: course.currency,
        rating: metrics.rating,
        reviewCount: metrics.reviewCount,
        studentsCount: metrics.studentsCount,
        durationHours: Math.round((durationMinutes / 60) * 10) / 10,
        gradientFrom: '#8A2BE2',
        gradientTo: '#6C3AED',
        shortDescription: course.short_description ?? course.description ?? '',
        description: course.description ?? course.short_description ?? '',
        modules: normalizedModules,
        faq: [],
        reviews: metrics.reviews,
        relatedSlugs: [],
      });
    }

    return catalog;
  },

  async getCatalogCourseBySlug(slug: string): Promise<MockCourse | undefined> {
    return (await this.listCatalogCourses()).find((course) => course.slug === slug);
  },

  async getCatalogCourseById(id: string): Promise<MockCourse | undefined> {
    return (await this.listCatalogCourses()).find((course) => course.id === id);
  },

  async createCourse(payload: { title: string; slug: string; description: string; price_cents: number; currency: string }) {
    return supabase.from('courses').insert({
      ...payload,
      original_price_cents: payload.price_cents,
      discount_cents: 0,
      status: 'draft',
    });
  },

  async updateCourse(id: string, payload: { title: string; slug: string; description: string; price_cents: number; currency: string }) {
    return supabase.from('courses').update({
      ...payload,
      original_price_cents: payload.price_cents,
      discount_cents: 0,
    }).eq('id', id);
  },

  async listRelatedCourses(course: MockCourse): Promise<MockCourse[]> {
    return (await this.listCatalogCourses()).filter((candidate) => candidate.id !== course.id).slice(0, 3);
  },

  async listCourseCategories(): Promise<readonly string[]> {
    const courses = await this.listCatalogCourses();
    const categories: string[] = courses.map((course) => String(course.category));
    return [...new Set<string>(categories)].sort((left, right) => left.localeCompare(right, 'pt-BR'));
  },

  async listInstructors(): Promise<Instructor[]> {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('user_id, full_name')
      .eq('role', 'instructor')
      .order('full_name', { ascending: true });

    if (error) throw error;

    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('id,instructor_id')
      .eq('status', 'published')
      .not('instructor_id', 'is', null);
    if (courseError) throw courseError;

    const instructorCourses = new Map<string, string[]>();
    for (const course of courseData ?? []) {
      if (!course.instructor_id) continue;
      const courseIds = instructorCourses.get(course.instructor_id) ?? [];
      courseIds.push(course.id);
      instructorCourses.set(course.instructor_id, courseIds);
    }

    const allCourseIds = [...new Set([...instructorCourses.values()].flat())];
    const metricsByCourse = await loadCourseMetrics(allCourseIds);

    return ((profiles ?? []) as ProfileNameRow[]).map((profile) => {
      const courseIds = instructorCourses.get(profile.user_id) ?? [];
      const studentIds = new Set<string>();
      let ratingTotal = 0;
      let reviewCount = 0;

      for (const courseId of courseIds) {
        const metrics = metricsByCourse.get(courseId) ?? emptyMetrics();
        for (const studentId of metrics.studentIds) studentIds.add(studentId);
        ratingTotal += metrics.rating * metrics.reviewCount;
        reviewCount += metrics.reviewCount;
      }

      return {
        id: profile.user_id,
        name: profile.full_name ?? 'Instrutor',
        specialty: 'Instrutor',
        bio: '',
        rating: reviewCount > 0 ? Math.round((ratingTotal / reviewCount) * 10) / 10 : 0,
        studentsCount: studentIds.size,
        coursesCount: courseIds.length,
        gradientFrom: '#8A2BE2',
        gradientTo: '#6C3AED',
      };
    });
  },

  async getInstructorById(id: string): Promise<Instructor | undefined> {
    return (await this.listInstructors()).find((instructor) => instructor.id === id);
  },

  async listTestimonials(): Promise<Testimonial[]> {
    const courses = await this.listPublishedCourses();
    const metricsByCourse = await loadCourseMetrics(courses.map((course) => course.id));
    const testimonials: Testimonial[] = [];

    for (const course of courses) {
      const metrics = metricsByCourse.get(course.id) ?? emptyMetrics();
      for (const review of metrics.reviews) {
        testimonials.push({
          studentName: review.author,
          courseSlug: course.slug,
          courseTitle: course.title,
          rating: review.rating,
          text: review.comment,
        });
      }
    }

    return testimonials;
  },

  async getCourseExtras(slug: string): Promise<CourseDisplayExtras> {
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id,instructor_id')
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

    const metrics = course?.id
      ? (await loadCourseMetrics([course.id])).get(course.id) ?? emptyMetrics()
      : emptyMetrics();

    return {
      instructorName,
      rating: metrics.rating,
      reviewCount: metrics.reviewCount,
      studentsCount: metrics.studentsCount,
      level: 'Iniciante',
    };
  },

  async listCourseCards(): Promise<CatalogCourse[]> {
    const realCourses = await this.listPublishedCourses();
    let academyContents: AcademyContent[] = [];

    try {
      academyContents = await academyContentService.listPublished();
    } catch {
      academyContents = [];
    }

    const real: CatalogCourse[] = [];
    for (const course of realCourses) real.push(await this.mapRealCourseToCard(course));
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
      description: course.short_description ?? course.description,
      category: course.category ?? 'Produção Musical',
      level: extras.level,
      instructorName: extras.instructorName,
      rating: extras.rating,
      reviewCount: extras.reviewCount,
      studentsCount: extras.studentsCount,
      priceCents: course.price_cents ?? Math.max(0, course.original_price_cents - course.discount_cents),
      currency: course.currency,
      thumbnailUrl: course.thumbnail_url,
      gradientFrom: '#8A2BE2',
      gradientTo: '#6C3AED',
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
      isReal: true,
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
      level: 'Conteúdo',
      instructorName: 'Equipe Vivendo da Música',
      rating: 0,
      reviewCount: 0,
      studentsCount: 0,
      priceCents: 0,
      currency: 'BRL',
      thumbnailUrl: content.thumbnailUrl ?? content.bannerUrl ?? null,
      gradientFrom: '#8A2BE2',
      gradientTo: '#6C3AED',
      isReal: true,
      itemType: 'academy-content',
      hasVideo: Boolean(content.videoUrl),
      hasMaterials: Boolean(content.attachments?.length),
      hasWrittenContent: Boolean(content.body),
      status: content.status,
    };
  },
};
