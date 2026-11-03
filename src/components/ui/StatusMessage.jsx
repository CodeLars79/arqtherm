import { CheckCircle2, AlertTriangle, XCircle, Info, CircleDashed } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
  neutral: CircleDashed
};

/** Mensaje con icono y texto: el estado nunca depende solo del color. */
export default function StatusMessage({ tone = 'info', title, children, live = false, className = '' }) {
  const Icon = ICONS[tone] || Info;
  return (
    <div className={`status status--${tone} ${className}`} role={live ? 'status' : undefined}>
      <Icon className="status__icon" aria-hidden="true" size={18} strokeWidth={1.75} />
      <div className="status__content">
        {title && <p className="status__title">{title}</p>}
        {children && <div className="status__text">{children}</div>}
      </div>
    </div>
  );
}

/** Insignia compacta (icono + texto). */
export function Badge({ tone = 'neutral', children, icon = true }) {
  const Icon = ICONS[tone] || CircleDashed;
  return (
    <span className={`badge badge--${tone}`}>
      {icon && <Icon aria-hidden="true" size={13} strokeWidth={2} />}
      {children}
    </span>
  );
}
