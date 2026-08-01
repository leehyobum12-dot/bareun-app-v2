// app/providers/ToastProvider.jsx — alert()를 완전히 대체합니다
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);

/*
 * [T-1 수정] 타입별 지속 시간 차별화
 * - info/success: 2600ms (기존 유지)
 * - error: 4000ms (읽을 시간 확보)
 */
const DURATION = {
  info: 2600,
  success: 2600,
  error: 4000,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const timeoutRefs = useRef(new Set());

  const show = useCallback((message, type = 'info') => {
    const id = ++idRef.current
    setToasts(prev => {
      if (prev.some(t => t.message === message && t.type === type)) return prev
      return [...prev, { id, message, type }]
    })
    const timeoutId = setTimeout(() => {
      setToasts(current => current.filter(t => t.id !== id))
      timeoutRefs.current.delete(timeoutId)
    }, DURATION[type] ?? 2600)
    timeoutRefs.current.add(timeoutId)
  }, [])

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