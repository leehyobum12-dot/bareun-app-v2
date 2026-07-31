// shared/ui/MobileFrame.jsx
export default function MobileFrame({ children, bg }) {
  return <div className="frame" style={bg ? { background: bg } : undefined}>{children}</div>;
}