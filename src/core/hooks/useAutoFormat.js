// src/core/hooks/useAutoFormat.js
import { useCallback } from 'react'
import { formatPhoneNumber, formatBizNumber } from '@/core/utils/formatters'

/**
 * [v3.2] 자동 포맷팅 커스텀 훅
 * 
 * 사용법:
 * const { handlePhone, handleBizNumber } = useAutoFormat(setValue)
 */
export function useAutoFormat(setValue) {
  const createHandler = useCallback((fieldName, formatter) => {
    return (e) => {
      const input = e.target
      const cursorPosition = input.selectionStart
      const oldValue = input.value
      const formatted = formatter(oldValue)
      
      if (oldValue !== formatted) {
        let newCursorPosition = cursorPosition
        if (formatted.length > oldValue.length) {
          const addedHyphens = formatted.slice(0, cursorPosition).split('-').length - 
                              oldValue.slice(0, cursorPosition).split('-').length
          newCursorPosition += addedHyphens
        }
        
        setValue(fieldName, formatted, { shouldValidate: false })
        
        requestAnimationFrame(() => {
          input.setSelectionRange(newCursorPosition, newCursorPosition)
        })
      }
    }
  }, [setValue])

  return {
    handlePhone: useCallback((e) => createHandler('phone', formatPhoneNumber)(e), [createHandler]),
    handleBizNumber: useCallback((e) => createHandler('biz_reg_number', formatBizNumber)(e), [createHandler]),
  }
}