import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';

import { EnrollmentGuard } from '@/app/guards/EnrollmentGuard';
import { ProtectedRoute } from '@/app/guards/ProtectedRoute';
import { RoleGuard } from '@/app/guards/RoleGuard';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { CartProvider } from '@/modules/checkout/store/CartContext';
import { FullScreenSpinner } from '@/shared/components/FullScreenSpinner';
import { Toaster as Sonner } from '@/shared/components/ui/sonner';
import { Toaster } from '@/shared/components/ui/toaster';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { ROUTES } from '@/shared/constants/routes';

const Index = lazy(() => import('./pages/Index'));
const Contact = lazy(() => import('./pages/Contact'));
const AccessDenied = lazy(() => import('./pages/AccessDenied'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const ComingSoon = lazy(() => import('./pages/ComingSoon'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Login = lazy(() => import('@/modules/auth/pages/Login'));
const Register = lazy(() => import('@/modules/auth/pages/Register'));
const ForgotPassword = lazy(() => import('@/modules/auth/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/modules/auth/pages/ResetPassword'));
const VerifyEmail = lazy(() => import('@/modules/auth/pages/VerifyEmail'));
const Verified = lazy(() => import('@/modules/auth/pages/Verified'));
const ValidateCertificatePage = lazy(() => import('@/modules/certificates/pages/ValidateCertificatePage'));

const Dashboard = lazy(() => import('@/modules/dashboard/pages/Dashboard'));
const Lesson = lazy(() => import('@/modules/lessons/pages/Lesson'));
const LessonBySlugRoute = lazy(() => import('@/modules/lessons/pages/LessonBySlugRoute'));
const EditProfile = lazy(() => import('@/modules/profile/pages/EditProfile'));

const AdminDashboard = lazy(() => import('@/modules/admin/pages/AdminDashboard'));
const AdminUsersPage = lazy(() => import('@/modules/admin/pages/AdminUsersPage'));
const AdminStudentsPage = lazy(() => import('@/modules/admin/pages/AdminStudentsPage'));
const AdminCoursesPage = lazy(() => import('@/modules/admin/pages/AdminCoursesPage'));
const AdminProductsPage = lazy(() => import('@/modules/admin/pages/AdminProductsPage'));
const AdminOrdersPage = lazy(() => import('@/modules/admin/pages/AdminOrdersPage'));
const AdminCouponsPage = lazy(() => import('@/modules/admin/pages/AdminCouponsPage'));
const AdminContentPage = lazy(() => import('@/modules/admin/pages/AdminContentPage'));
const AdminCertificatesPage = lazy(() => import('@/modules/admin/pages/AdminCertificatesPage'));
const AdminCommunityPage = lazy(() => import('@/modules/admin/pages/AdminCommunityPage'));
const AdminReportsPage = lazy(() => import('@/modules/admin/pages/AdminReportsPage'));
const AdminObservabilityPage = lazy(() => import('@/modules/admin/pages/AdminObservabilityPage'));
const AdminSettingsPage = lazy(() => import('@/modules/admin/pages/AdminSettingsPage'));
const AdminIntegrationsPage = lazy(() => import('@/modules/admin/pages/AdminIntegrationsPage'));
const AdminFinancePage = lazy(() => import('@/modules/admin/pages/AdminFinanceCanonicalPage'));
const AdminMarketingPage = lazy(() => import('@/modules/admin/pages/AdminMarketingPage'));
const AdminSupportPage = lazy(() => import('@/modules/admin/pages/AdminSupportPage'));
const AdminAuditPage = lazy(() => import('@/modules/admin/pages/AdminAuditPage'));
const AdminSecurityPage = lazy(() => import('@/modules/admin/pages/AdminSecurityPage'));

const CourseCatalogPage = lazy(() => import('@/modules/courses/pages/CourseCatalogPage'));
const CourseDetailPage = lazy(() => import('@/modules/courses/pages/CourseDetailPage'));
const StudentCourseDashboardPage = lazy(() => import('@/modules/courses/pages/StudentCourseDashboardPage'));
const ProductCatalogPage = lazy(() => import('@/modules/marketplace/pages/ProductCatalogPage'));
const BeatMarketplacePage = lazy(() => import('@/modules/marketplace/pages/BeatMarketplacePage'));
const BeatDetailPage = lazy(() => import('@/modules/marketplace/pages/BeatDetailPage'));
const ProducerBeatsDashboardPage = lazy(() => import('@/modules/marketplace/pages/ProducerBeatsDashboardPage'));
const ProducerDashboardPage = lazy(() => import('@/modules/producer/pages/ProducerDashboardPage'));
const ProducerProductsPage = lazy(() => import('@/modules/producer/pages/ProducerProductsPage'));
const ProducerOrdersPage = lazy(() => import('@/modules/producer/pages/ProducerOrdersPage'));
const AffiliatePortalPage = lazy(() => import('@/modules/affiliate/pages/AffiliatePortalPage'));
const ProductDetailPage = lazy(() => import('@/modules/marketplace/pages/ProductDetailPage'));
const CartPage = lazy(() => import('@/modules/checkout/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/modules/checkout/pages/CheckoutPage'));

const ContentPortalPage = lazy(() => import('@/modules/content-portal/pages/ContentPortalPage'));
const ContentArticleDetailPage = lazy(() => import('@/modules/content-portal/pages/ContentArticleDetailPage'));
const CommunityLandingPage = lazy(() => import('@/modules/community/pages/CommunityLandingPage'));
const LegalDocumentPage = lazy(() => import('@/modules/legal/pages/LegalDocumentPage'));
const PublicOpportunitiesPage = lazy(() => import('@/modules/opportunities/pages/PublicOpportunitiesPage'));
const PublicServicesPage = lazy(() => import('@/modules/services/pages/PublicServicesPage'));
const ServiceDetailPage = lazy(() => import('@/modules/services/pages/ServiceDetailPage'));

const MyCoursesPage = lazy(() => import('@/modules/dashboard/pages/MyCoursesPage'));
const OrdersPage = lazy(() => import('@/modules/dashboard/pages/OrdersPage'));
const FavoritesPage = lazy(() => import('@/modules/dashboard/pages/FavoritesPage'));
const NotificationsPage = lazy(() => import('@/modules/dashboard/pages/NotificationsPage'));
const SupportPage = lazy(() => import('@/modules/dashboard/pages/SupportPage'));
const StudentSettingsPage = lazy(() => import('@/modules/dashboard/pages/StudentSettingsPage'));
const CertificatesPage = lazy(() => import('@/modules/certificates/pages/CertificatesPage'));
const DownloadsPage = lazy(() => import('@/modules/marketplace/pages/DownloadsPage'));
const LibraryPage = lazy(() => import('@/modules/library/pages/LibraryPage'));
const CommunityPage = lazy(() => import('@/modules/community/pages/CommunityPage'));
const OpportunitiesPage = lazy(() => import('@/modules/opportunities/pages/OpportunitiesPage'));
const StudentServicesPage = lazy(() => import('@/modules/services/pages/StudentServicesPage'));
const StudentServiceRequestsPage = lazy(() => import('@/modules/services/pages/StudentServiceRequestsPage'));
const InstructorDashboard = lazy(() => import('@/modules/instructor/pages/InstructorDashboard'));
const InstructorCoursesPage = lazy(() => import('@/modules/instructor/pages/InstructorCoursesPage'));
const InstructorAudiencePage = lazy(() => import('@/modules/instructor/pages/InstructorAudiencePage'));
const InstructorReportsPage = lazy(() => import('@/modules/instructor/pages/InstructorReportsPage'));
const InstructorFinancePage = lazy(() => import('@/modules/instructor/pages/InstructorFinancePage'));
const ProducerServicesPage = lazy(() => import('@/modules/services/pages/ProducerServicesPage'));
const ProducerServiceRequestsPage = lazy(() => import('@/modules/services/pages/ProducerServiceRequestsPage'));
const CompanyDashboardPage = lazy(() => import('@/modules/company/pages/CompanyDashboardPage'));
const CompanyOpportunitiesPage = lazy(() => import('@/modules/company/pages/CompanyOpportunitiesPage'));
const CompanyCandidatesPage = lazy(() => import('@/modules/company/pages/CompanyCandidatesPage'));
const CompanyMessagesPage = lazy(() => import('@/modules/company/pages/CompanyMessagesPage'));
const CompanyProfilePage = lazy(() => import('@/modules/company/pages/CompanyProfilePage'));
const CompanyCreditsPage = lazy(() => import('@/modules/company/pages/CompanyCreditsPage'));

const queryClient = new QueryClient();
const routerBasename = import.meta.env.BASE_URL === '/'
  ? undefined
  : import.meta.env.BASE_URL.replace(/\/+$/, '');

const LessonRoute = () => {
  const { lessonId } = useParams();
  return <EnrollmentGuard lessonId={lessonId!}><Lesson /></EnrollmentGuard>;
};

const studentRoute = (element: JSX.Element) => <ProtectedRoute>{element}</ProtectedRoute>;
const adminRoute = (element: JSX.Element) => <ProtectedRoute><RoleGuard allow={['admin', 'super_admin']}>{element}</RoleGuard></ProtectedRoute>;
const instructorRoute = (element: JSX.Element) => <ProtectedRoute><RoleGuard allow={['instructor', 'admin', 'super_admin']}>{element}</RoleGuard></ProtectedRoute>;
const producerRoute = (element: JSX.Element) => <ProtectedRoute><RoleGuard allow={['producer', 'admin', 'super_admin']}>{element}</RoleGuard></ProtectedRoute>;
const affiliateRoute = (element: JSX.Element) => <ProtectedRoute><RoleGuard allow={['affiliate', 'admin', 'super_admin']}>{element}</RoleGuard></ProtectedRoute>;
const companyRoute = (element: JSX.Element) => <ProtectedRoute><RoleGuard allow={['company', 'admin', 'super_admin']}>{element}</RoleGuard></ProtectedRoute>;

const App = () => (
  <BrowserRouter basename={routerBasename}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<FullScreenSpinner />}>
              <Routes>
                <Route path={ROUTES.home} element={<Index />} />
                <Route path={ROUTES.login} element={<Login />} />
                <Route path={ROUTES.register} element={<Register />} />
                <Route path="/cadastro" element={<Navigate to={ROUTES.register} replace />} />
                <Route path={ROUTES.companyRegister} element={<Navigate to={`${ROUTES.register}?perfil=empresa`} replace />} />
                <Route path={ROUTES.forgotPassword} element={<ForgotPassword />} />
                <Route path="/recuperar-senha" element={<ForgotPassword />} />
                <Route path={ROUTES.resetPassword} element={<ResetPassword />} />
                <Route path={ROUTES.verifyEmail} element={<VerifyEmail />} />
                <Route path={ROUTES.verified} element={<Verified />} />
                <Route path={ROUTES.contact} element={<Contact />} />
                <Route path={ROUTES.privacyPolicy} element={<LegalDocumentPage />} />
                <Route path={ROUTES.termsOfUse} element={<LegalDocumentPage />} />
                <Route path={ROUTES.accessDenied} element={<AccessDenied />} />
                <Route path={ROUTES.comingSoon} element={<ComingSoon />} />
                <Route path={ROUTES.paymentSuccess} element={<PaymentSuccess />} />

                <Route path={ROUTES.academy} element={<CourseCatalogPage />} />
                <Route path="/academia/:courseSlug" element={<CourseDetailPage />} />
                <Route path="/academia/:courseSlug/aulas/:lessonSlug" element={<LessonBySlugRoute />} />
                <Route path={ROUTES.marketplace} element={<ProductCatalogPage />} />
                <Route path={ROUTES.marketplaceBeats} element={<BeatMarketplacePage />} />
                <Route path="/marketplace/beats/:beatSlug" element={<BeatDetailPage />} />
                <Route path="/marketplace/:productSlug" element={<ProductDetailPage />} />
                <Route path={ROUTES.servicesPublic} element={<PublicServicesPage />} />
                <Route path="/servicos/:serviceSlug" element={<ServiceDetailPage />} />
                <Route path={ROUTES.cart} element={<CartPage />} />
                <Route path={ROUTES.checkout} element={<CheckoutPage />} />
                <Route path={ROUTES.validateCertificate} element={<ValidateCertificatePage />} />

                <Route path={ROUTES.contentPortal} element={<ContentPortalPage />} />
                <Route path="/conteudos/:articleSlug" element={<ContentArticleDetailPage />} />
                <Route path={ROUTES.communityPublic} element={<CommunityLandingPage />} />
                <Route path={ROUTES.opportunitiesPublic} element={<PublicOpportunitiesPage />} />

                <Route path="/aula/:lessonId" element={<ProtectedRoute><LessonRoute /></ProtectedRoute>} />

                <Route path={ROUTES.dashboard} element={studentRoute(<Dashboard />)} />
                <Route path="/aluno/dashboard" element={<Navigate to={ROUTES.dashboard} replace />} />
                <Route path={ROUTES.myCourses} element={studentRoute(<MyCoursesPage />)} />
                <Route path="/aluno/cursos/:courseId" element={studentRoute(<StudentCourseDashboardPage />)} />
                <Route path={ROUTES.certificates} element={studentRoute(<CertificatesPage />)} />
                <Route path={ROUTES.downloads} element={studentRoute(<DownloadsPage />)} />
                <Route path="/aluno/beats" element={<Navigate to={ROUTES.downloads} replace />} />
                <Route path={ROUTES.library} element={studentRoute(<LibraryPage />)} />
                <Route path={ROUTES.community} element={studentRoute(<CommunityPage />)} />
                <Route path={ROUTES.opportunities} element={studentRoute(<OpportunitiesPage />)} />
                <Route path={ROUTES.studentServices} element={studentRoute(<StudentServicesPage />)} />
                <Route path={ROUTES.studentServiceRequests} element={studentRoute(<StudentServiceRequestsPage />)} />
                <Route path={ROUTES.orders} element={studentRoute(<OrdersPage />)} />
                <Route path={ROUTES.favorites} element={studentRoute(<FavoritesPage />)} />
                <Route path={ROUTES.editProfile} element={studentRoute(<EditProfile />)} />
                <Route path={ROUTES.settings} element={studentRoute(<StudentSettingsPage />)} />
                <Route path={ROUTES.notifications} element={studentRoute(<NotificationsPage />)} />
                <Route path={ROUTES.support} element={studentRoute(<SupportPage />)} />

                <Route path={ROUTES.instructor} element={instructorRoute(<InstructorDashboard />)} />
                <Route path={ROUTES.instructorCourses} element={instructorRoute(<InstructorCoursesPage />)} />
                <Route path={ROUTES.instructorAudience} element={instructorRoute(<InstructorAudiencePage />)} />
                <Route path={ROUTES.instructorReports} element={instructorRoute(<InstructorReportsPage />)} />
                <Route path={ROUTES.instructorFinance} element={instructorRoute(<InstructorFinancePage />)} />

                <Route path={ROUTES.producer} element={producerRoute(<ProducerDashboardPage />)} />
                <Route path={ROUTES.producerBeats} element={producerRoute(<ProducerBeatsDashboardPage />)} />
                <Route path={ROUTES.producerProducts} element={producerRoute(<ProducerProductsPage />)} />
                <Route path={ROUTES.producerOrders} element={producerRoute(<ProducerOrdersPage />)} />
                <Route path={ROUTES.producerServices} element={producerRoute(<ProducerServicesPage />)} />
                <Route path={ROUTES.producerServiceRequests} element={producerRoute(<ProducerServiceRequestsPage />)} />

                <Route path={ROUTES.affiliate} element={affiliateRoute(<AffiliatePortalPage />)} />
                <Route path={ROUTES.affiliateLinks} element={affiliateRoute(<AffiliatePortalPage />)} />
                <Route path={ROUTES.affiliateConversions} element={affiliateRoute(<AffiliatePortalPage />)} />
                <Route path={ROUTES.affiliateCommissions} element={affiliateRoute(<AffiliatePortalPage />)} />
                <Route path={ROUTES.affiliateWithdrawals} element={affiliateRoute(<AffiliatePortalPage />)} />
                <Route path={ROUTES.affiliateMaterials} element={affiliateRoute(<AffiliatePortalPage />)} />
                <Route path={ROUTES.affiliateProfile} element={affiliateRoute(<AffiliatePortalPage />)} />

                <Route path={ROUTES.company} element={companyRoute(<CompanyDashboardPage />)} />
                <Route path={ROUTES.companyOpportunities} element={companyRoute(<CompanyOpportunitiesPage />)} />
                <Route path={ROUTES.companyCandidates} element={companyRoute(<CompanyCandidatesPage />)} />
                <Route path={ROUTES.companyMessages} element={companyRoute(<CompanyMessagesPage />)} />
                <Route path={ROUTES.companyProfile} element={companyRoute(<CompanyProfilePage />)} />
                <Route path={ROUTES.companyCredits} element={companyRoute(<CompanyCreditsPage />)} />

                <Route path={ROUTES.admin} element={adminRoute(<AdminDashboard />)} />
                <Route path={ROUTES.adminUsers} element={adminRoute(<AdminUsersPage />)} />
                <Route path={ROUTES.adminStudents} element={adminRoute(<AdminStudentsPage />)} />
                <Route path={ROUTES.adminCourses} element={adminRoute(<AdminCoursesPage />)} />
                <Route path={ROUTES.adminProducts} element={adminRoute(<AdminProductsPage />)} />
                <Route path={ROUTES.adminProductNew} element={<Navigate to={ROUTES.adminProducts} replace />} />
                <Route path="/admin/produtos/:id" element={<Navigate to={ROUTES.adminProducts} replace />} />
                <Route path={ROUTES.adminOrders} element={adminRoute(<AdminOrdersPage />)} />
                <Route path={ROUTES.adminCoupons} element={adminRoute(<AdminCouponsPage />)} />
                <Route path={ROUTES.adminContent} element={adminRoute(<AdminContentPage />)} />
                <Route path={ROUTES.adminCertificates} element={adminRoute(<AdminCertificatesPage />)} />
                <Route path={ROUTES.adminCommunity} element={adminRoute(<AdminCommunityPage />)} />
                <Route path={ROUTES.adminReports} element={adminRoute(<AdminReportsPage />)} />
                <Route path={ROUTES.adminObservability} element={adminRoute(<AdminObservabilityPage />)} />
                <Route path={ROUTES.adminSettings} element={adminRoute(<AdminSettingsPage />)} />
                <Route path={ROUTES.adminIntegrations} element={adminRoute(<AdminIntegrationsPage />)} />
                <Route path={ROUTES.adminFinance} element={adminRoute(<AdminFinancePage />)} />
                <Route path={ROUTES.adminMarketing} element={adminRoute(<AdminMarketingPage />)} />
                <Route path={ROUTES.adminSupport} element={adminRoute(<AdminSupportPage />)} />
                <Route path={ROUTES.adminAudit} element={adminRoute(<AdminAuditPage />)} />
                <Route path={ROUTES.adminSecurity} element={adminRoute(<AdminSecurityPage />)} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;