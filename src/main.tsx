import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
}

const screenStyle = {
  alignItems: 'center',
  background: '#ffffff',
  color: '#18181b',
  display: 'flex',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: '24px',
} as const;

const cardStyle = {
  border: '1px solid #e4e4e7',
  borderRadius: '16px',
  boxShadow: '0 16px 48px rgba(24, 24, 27, 0.08)',
  maxWidth: '520px',
  padding: '32px',
  textAlign: 'center',
  width: '100%',
} as const;

const FatalErrorScreen = () => (
  <main role="alert" style={screenStyle}>
    <section style={cardStyle}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px' }}>
        Não foi possível abrir a plataforma
      </h1>
      <p style={{ color: '#52525b', lineHeight: 1.6, margin: '0 0 24px' }}>
        A aplicação encontrou uma falha durante o carregamento. Recarregue a página para tentar novamente.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          background: '#18181b',
          border: 0,
          borderRadius: '10px',
          color: '#ffffff',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: 600,
          padding: '12px 20px',
        }}
      >
        Recarregar página
      </button>
    </section>
  </main>
);

const BootstrapScreen = () => (
  <main aria-busy="true" aria-label="Carregando plataforma" style={screenStyle}>
    <section style={cardStyle}>
      <strong style={{ fontSize: '18px' }}>Carregando Vivendo da Música…</strong>
    </section>
  </main>
);

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Falha ao renderizar a aplicação.', error, errorInfo);
  }

  public render() {
    return this.state.hasError ? <FatalErrorScreen /> : this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento raiz da aplicação não encontrado.');
}

const root = createRoot(rootElement);
let applicationMounted = false;

const renderBootstrapFailure = (error: unknown) => {
  console.error('Falha durante a inicialização da aplicação.', error);
  root.render(<FatalErrorScreen />);
};

window.addEventListener('error', (event) => {
  if (!applicationMounted) renderBootstrapFailure(event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  if (!applicationMounted) renderBootstrapFailure(event.reason);
});

root.render(<BootstrapScreen />);

void import('./App')
  .then(({ default: App }) => {
    applicationMounted = true;
    root.render(
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>,
    );
  })
  .catch(renderBootstrapFailure);
