// shared/ui/EmptyState.jsx
import Button from './Button';
export default function EmptyState({ icon = '🍽️', title, description, actionLabel, onAction }) {
  return (
    <div className="card reveal" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, margin: '0 0 8px' }}>{title}</h3>
      {description && <p style={{ color: 'var(--ink-500)', fontSize: 'var(--text-sm)', margin: '0 0 24px', lineHeight: 1.6 }}>{description}</p>}
      {actionLabel && <Button variant="ghost" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}