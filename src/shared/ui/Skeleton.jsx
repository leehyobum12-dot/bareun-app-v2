// shared/ui/Skeleton.jsx
export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }} aria-hidden>
      <div className="skeleton" style={{ width: '55%', height: 20 }} />
      <div className="skeleton" style={{ width: '85%', height: 13 }} />
      <div className="skeleton" style={{ width: 110, height: 26, borderRadius: 999 }} />
    </div>
  );
}