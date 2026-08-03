export interface MockLesson {
  title: string;
  durationMinutes: number;
  free?: boolean;
}

export interface MockModule {
  title: string;
  lessons: MockLesson[];
}

export interface CourseReview {
  author: string;
  rating: number;
  comment: string;
}

export interface CourseFaqItem {
  question: string;
  answer: string;
}

export interface MockCourse {
  id: string;
  slug: string;
  title: string;
  category: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  instructorId: string;
  priceCents: number;
  originalPriceCents?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  studentsCount: number;
  durationHours: number;
  thumbnailUrl: string | null;
  gradientFrom: string;
  gradientTo: string;
  shortDescription: string;
  description: string;
  modules: MockModule[];
  faq: CourseFaqItem[];
  reviews: CourseReview[];
  relatedSlugs: string[];
  featured?: boolean;
}

export interface Instructor {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  rating: number;
  studentsCount: number;
  coursesCount: number;
  gradientFrom: string;
  gradientTo: string;
}

export interface CourseDisplayExtras {
  instructorName: string;
  rating: number;
  reviewCount: number;
  studentsCount: number;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
}

export interface Testimonial {
  studentName: string;
  courseSlug: string;
  courseTitle: string;
  rating: number;
  text: string;
}

export interface CatalogCourse {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  level: string;
  instructorName: string;
  rating: number;
  reviewCount: number;
  studentsCount: number;
  priceCents: number;
  currency: string;
  thumbnailUrl: string | null;
  gradientFrom: string;
  gradientTo: string;
  isReal: boolean;
  itemType?: 'course' | 'academy-content';
  hasVideo?: boolean;
  hasMaterials?: boolean;
  hasWrittenContent?: boolean;
  status?: 'draft' | 'published';
}
