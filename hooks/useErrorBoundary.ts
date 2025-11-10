import { useCallback } from 'react';
import { Alert } from 'react-native';

export function useErrorBoundary() {
  const handleError = useCallback((error: unknown) => {
    // Hata mesajını konsola yazdır
    console.error('Error caught by useErrorBoundary:', error);
    
    // Gerekirse daha fazla hata işleme mantığı eklenebilir
    // Örneğin: Sentry'e gönderme, analytics'e kaydetme, vb.
  }, []);

  return {
    handleError,
  };
}

