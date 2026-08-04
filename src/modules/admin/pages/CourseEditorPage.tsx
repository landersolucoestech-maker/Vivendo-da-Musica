import { useParams } from 'react-router-dom';

import AdminCoursesPage from '@/modules/admin/pages/AdminCoursesPage';

const CourseEditorPage = () => {
  const { id } = useParams();
  return <AdminCoursesPage initialMode={id ? 'edit' : 'create'} initialCourseId={id} />;
};

export default CourseEditorPage;
