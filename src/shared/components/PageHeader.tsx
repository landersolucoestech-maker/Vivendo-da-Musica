import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

const PageHeader = ({ title, subtitle, eyebrow, actions }: PageHeaderProps) => (
  <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && <p className="vdm-eyebrow">{eyebrow}</p>}
      <h1 className={`${eyebrow ? 'mt-2' : ''} vdm-page-title`}>{title}</h1>
      {subtitle && <p className="vdm-page-description">{subtitle}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

export default PageHeader;
