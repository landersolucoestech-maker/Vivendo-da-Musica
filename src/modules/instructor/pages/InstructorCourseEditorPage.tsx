import { useParams } from 'react-router-dom';

import InstructorCoursesPage from '@/modules/instructor/pages/InstructorCoursesPage';

const InstructorCourseEditorPage = () => {
  const { id } = useParams();
  return <InstructorCoursesPage initialMode={id ? 'edit' : 'create'} initialCourseId={id} />;
};

export default InstructorCourseEditorPage;
