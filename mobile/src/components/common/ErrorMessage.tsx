// =============================================
// Hata Mesajı Komponenti
// API hataları ve form hatalarını gösterir
// =============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  type?: 'error' | 'warning' | 'info';
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  retryLabel = 'Tekrar Dene',
  type = 'error',
}) => {
  // Tipe göre stil ve ikon seç
  const typeConfig = {
    error: {
      backgroundColor: '#FFEBEE',
      borderColor: '#F44336',
      color: '#B71C1C',
      icon: 'alert-circle' as const,
    },
    warning: {
      backgroundColor: '#FFF8E1',
      borderColor: '#FF9800',
      color: '#E65100',
      icon: 'warning' as const,
    },
    info: {
      backgroundColor: '#E3F2FD',
      borderColor: '#2196F3',
      color: '#0D47A1',
      icon: 'information-circle' as const,
    },
  };

  const config = typeConfig[type];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      {/* İkon */}
      <Ionicons name={config.icon} size={20} color={config.color} style={styles.icon} />
      
      {/* Mesaj */}
      <View style={styles.content}>
        <Text style={[styles.message, { color: config.color }]}>{message}</Text>
        
        {/* Tekrar Dene butonu */}
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <Text style={[styles.retryText, { color: config.color }]}>{retryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  icon: {
    marginRight: 10,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default ErrorMessage;
