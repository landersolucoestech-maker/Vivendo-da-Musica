import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';

const AdminSubscriptionsPage = () => <Navigate to={ROUTES.admin} replace />;

export default AdminSubscriptionsPage;
