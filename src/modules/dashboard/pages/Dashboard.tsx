import StudentLayout from '@/app/layouts/StudentLayout';
import {
  ContinueLearningSection,
  QuickActionsSection,
  StudentDashboardHero,
  StudentDashboardSidebar,
} from '@/modules/dashboard/components/StudentDashboardSections';
import { useStudentDashboard } from '@/modules/dashboard/hooks/useStudentDashboard';

const Dashboard = () => {
  const {
    activeModule,
    firstIncompleteLesson,
    firstName,
    joinDate,
    modulesWithProgress,
    normalizedProgress,
    recentCertificates,
    recommendedDownloads,
    remainingLessons,
    totalLessons,
    unreadNotifications,
  } = useStudentDashboard();

  return (
    <StudentLayout>
      <StudentDashboardHero
        firstIncompleteLesson={firstIncompleteLesson}
        firstName={firstName}
        normalizedProgress={normalizedProgress}
        remainingLessons={remainingLessons}
        unreadNotifications={unreadNotifications}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="min-w-0 space-y-6">
          <ContinueLearningSection
            activeModule={activeModule}
            firstIncompleteLesson={firstIncompleteLesson}
          />
          <QuickActionsSection />
        </div>

        <StudentDashboardSidebar
          joinDate={joinDate}
          modulesCount={modulesWithProgress.length}
          recentCertificates={recentCertificates}
          recommendedDownloads={recommendedDownloads}
          totalLessons={totalLessons}
        />
      </div>
    </StudentLayout>
  );
};

export default Dashboard;
