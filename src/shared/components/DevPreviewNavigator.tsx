import { env } from '@/app/config/env';
import { ROUTES } from '@/shared/constants/routes';

const groups = [
  {
    label: 'Público',
    routes: [
      ['Home', ROUTES.home],
      ['Login', ROUTES.login],
      ['Cadastro', ROUTES.register],
      ['Contato', ROUTES.contact],
      ['Academia', ROUTES.academy],
      ['Marketplace', ROUTES.marketplace],
      ['Beats', ROUTES.marketplaceBeats],
      ['Carrinho', ROUTES.cart],
      ['Checkout', ROUTES.checkout],
      ['Área VIP', ROUTES.vipArea],
      ['Biblioteca Premium', ROUTES.premiumLibraryPublic],
      ['Conteúdos', ROUTES.contentPortal],
      ['Eventos', ROUTES.eventsPublic],
      ['Comunidade', ROUTES.communityPublic],
      ['Oportunidades', ROUTES.opportunitiesPublic],
      ['Validar certificado', ROUTES.validateCertificate],
    ],
  },
  {
    label: 'Aluno',
    routes: [
      ['Dashboard', ROUTES.dashboard],
      ['Meus cursos', ROUTES.myCourses],
      ['Certificados', ROUTES.certificates],
      ['Downloads', ROUTES.downloads],
      ['Biblioteca Premium', ROUTES.premiumLibrary],
      ['Comunidade', ROUTES.community],
      ['Oportunidades', ROUTES.opportunities],
      ['Eventos', ROUTES.events],
      ['Pedidos', ROUTES.orders],
      ['Favoritos', ROUTES.favorites],
      ['Perfil', ROUTES.editProfile],
      ['Configurações', ROUTES.settings],
      ['Notificações', ROUTES.notifications],
      ['Suporte', ROUTES.support],
      ['Aula demo', ROUTES.lesson('mock-lesson-1')],
    ],
  },
  {
    label: 'Instrutor',
    routes: [
      ['Dashboard', ROUTES.instructor],
      ['Cursos', ROUTES.instructorCourses],
      ['Novo curso', ROUTES.instructorCourseNew],
      ['Audiência', ROUTES.instructorAudience],
      ['Relatórios', ROUTES.instructorReports],
    ],
  },
  {
    label: 'Produtor',
    routes: [
      ['Dashboard', ROUTES.producer],
      ['Beats', ROUTES.producerBeats],
      ['Produtos', ROUTES.producerProducts],
      ['Pedidos', ROUTES.producerOrders],
    ],
  },
  {
    label: 'Admin',
    routes: [
      ['Dashboard', ROUTES.admin],
      ['Usuários', ROUTES.adminUsers],
      ['Alunos', ROUTES.adminStudents],
      ['Assinaturas', ROUTES.adminSubscriptions],
      ['Cursos', ROUTES.adminCourses],
      ['Novo curso', ROUTES.adminCourseNew],
      ['Produtos', ROUTES.adminProducts],
      ['Novo produto', ROUTES.adminProductNew],
      ['Pedidos', ROUTES.adminOrders],
      ['Cupons', ROUTES.adminCoupons],
      ['Conteúdos', ROUTES.adminContent],
      ['Eventos', ROUTES.adminEvents],
      ['Certificados', ROUTES.adminCertificates],
      ['Comunidade', ROUTES.adminCommunity],
      ['Relatórios', ROUTES.adminReports],
      ['Observabilidade', ROUTES.adminObservability],
      ['Configurações', ROUTES.adminSettings],
      ['Integrações', ROUTES.adminIntegrations],
      ['Financeiro', ROUTES.adminFinance],
      ['Marketing', ROUTES.adminMarketing],
      ['Suporte', ROUTES.adminSupport],
      ['Auditoria', ROUTES.adminAudit],
      ['Segurança', ROUTES.adminSecurity],
    ],
  },
] as const;

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const hrefFor = (route: string) => `${base}${route}` || '/';

export const DevPreviewNavigator = () => {
  if (!env.isPagesPreview) return null;

  return (
    <details
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 2147483647,
        width: 320,
        maxHeight: '75vh',
        overflow: 'auto',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,.18)',
        background: 'rgba(12,12,14,.96)',
        color: '#fff',
        boxShadow: '0 18px 50px rgba(0,0,0,.45)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <summary style={{ cursor: 'pointer', padding: '12px 14px', fontWeight: 800 }}>
        DEV — TODAS AS ROTAS
      </summary>
      <div style={{ padding: '0 12px 14px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, opacity: 0.72 }}>
          Autenticação e guards desativados apenas neste preview.
        </p>
        {groups.map((group) => (
          <section key={group.label} style={{ marginTop: 12 }}>
            <strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>{group.label}</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {group.routes.map(([label, route]) => (
                <a
                  key={`${group.label}-${label}`}
                  href={hrefFor(route)}
                  style={{
                    display: 'block',
                    padding: '7px 8px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,.07)',
                    color: '#fff',
                    textDecoration: 'none',
                    fontSize: 12,
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </details>
  );
};
