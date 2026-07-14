export interface InstructorDashboardData {
  courses: number;
  publishedCourses: number;
  activeStudents: number;
  paidSales: number;
  revenueCents: number;
  currency: string;
  recentCourses: {
    id: string;
    title: string;
    status: 'draft' | 'published' | 'archived';
    createdAt: string;
  }[];
}

export interface InstructorCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
}

export interface InstructorCourseModule {
  id: string;
  title: string;
  orderIndex: number;
  lessons: {
    id: string;
    title: string;
    durationMinutes: number | null;
    videoUrl: string | null;
  }[];
}

export interface InstructorStudent {
  enrollmentId: string;
  userId: string;
  fullName: string;
  courseId: string;
  courseTitle: string;
  status: 'active' | 'revoked';
  source: 'manual' | 'stripe';
  enrolledAt: string;
}

export interface InstructorCourseReview {
  id: string;
  courseTitle: string;
  studentName: string;
  rating: number;
  comment: string;
  status: 'published' | 'hidden';
  instructorResponse: string | null;
  createdAt: string;
}

export interface InstructorAudienceData {
  students: InstructorStudent[];
  reviews: InstructorCourseReview[];
}

export interface InstructorReportsData {
  revenueCents: number;
  paidSales: number;
  averageTicketCents: number;
  activeEnrollments: number;
  certificatesIssued: number;
  certificationRate: number;
  currency: string;
  courses: {
    id: string;
    title: string;
    revenueCents: number;
    paidSales: number;
    activeEnrollments: number;
    certificatesIssued: number;
  }[];
}
