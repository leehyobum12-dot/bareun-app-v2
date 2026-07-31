// shared/ui/Button.jsx
export default function Button({ variant = 'primary', size, block, className = '', ...props }) {
  return (
    <button
      className={`btn btn-${variant} ${size === 'lg' ? 'btn-lg' : ''} ${block ? 'btn-block' : ''} ${className}`}
      {...props}
    />
  );
}