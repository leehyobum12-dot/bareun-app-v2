// app/providers/ToastProvider.jsx — alert()를 완전히 대체합니다
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const timeoutRefs = useRef(new Set());

  const show = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    const timeoutId = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timeoutRefs.current.delete(timeoutId);
    }, 2600);
    timeoutRefs.current.add(timeoutId);
  }, []);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current.clear();
    };
  }, []);

  const api = useRef({
    info: m => show(m, 'info'),
    success: m => show(m, 'success'),
    error: m => show(m, 'error'),
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);