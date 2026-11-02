// =============================================
// Onay Diyaloğu Komponenti
// Kritik işlemler için kullanıcı onayı alır
// =============================================

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Evet',
  cancelLabel = 'İptal',
  confirmColor,
  onConfirm,
  onCancel,
  icon,
  destructive = false,
}) => {
  // Tehlikeli işlemler için kırmızı, diğerleri için turuncu
  const actionColor = confirmColor || (destructive ? '#F44336' : '#FF6B35');

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      {/* Karartma arka planı */}
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          {/* Diyalog kutusu */}
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>
              {/* İkon */}
              {icon && (
                <View style={[styles.iconContainer, { backgroundColor: `${actionColor}15` }]}>
                  <Ionicons name={icon} size={32} color={actionColor} />
                </View>
              )}

              {/* Başlık */}
              <Text style={styles.title}>{title}</Text>

              {/* Mesaj */}
              <Text style={styles.message}>{message}</Text>

              {/* Butonlar */}
              <View style={styles.buttonRow}>
                {/* İptal butonu */}
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                  <Text style={styles.cancelText}>{cancelLabel}</Text>
                </TouchableOpacity>

                {/* Onay butonu */}
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: actionColor }]}
                  onPress={onConfirm}
                >
                  <Text style={styles.confirmText}>{confirmLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#757575',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ConfirmDialog;
