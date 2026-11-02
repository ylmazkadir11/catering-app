// =============================================
// Tam Ekran Yükleme Göstergesi
// API işlemleri süresince gösterilir
// =============================================

import React from 'react';
import { View, StyleSheet, Modal, ActivityIndicator, Text } from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Yükleniyor...',
}) => {
  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Yükleme göstergesi */}
          <ActivityIndicator size="large" color="#FF6B35" />
          
          {/* Mesaj */}
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default LoadingOverlay;
