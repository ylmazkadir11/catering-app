// =============================================
// Stok Durumu Badge Komponenti
// Malzeme stok seviyesine göre renkli badge gösterir
// =============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStockStatusColor, getStockStatusLabel } from '../../utils/formatters';

interface StockStatusBadgeProps {
  currentStock: number;
  minimumStock: number;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const StockStatusBadge: React.FC<StockStatusBadgeProps> = ({
  currentStock,
  minimumStock,
  showLabel = true,
  size = 'medium',
}) => {
  const color = getStockStatusColor(currentStock, minimumStock);
  const label = getStockStatusLabel(currentStock, minimumStock);

  // Boyuta göre stil seç
  const sizeStyles = {
    small: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, borderRadius: 8 },
    medium: { paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, borderRadius: 10 },
    large: { paddingHorizontal: 14, paddingVertical: 6, fontSize: 14, borderRadius: 12 },
  };

  const selectedSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}20`, // %12 opaklıkta arka plan
          borderColor: color,
          paddingHorizontal: selectedSize.paddingHorizontal,
          paddingVertical: selectedSize.paddingVertical,
          borderRadius: selectedSize.borderRadius,
        },
      ]}
    >
      {/* Renkli nokta */}
      <View style={[styles.dot, { backgroundColor: color }]} />
      
      {/* Etiket */}
      {showLabel && (
        <Text style={[styles.label, { color, fontSize: selectedSize.fontSize }]}>
          {label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  label: {
    fontWeight: '600',
  },
});

export default StockStatusBadge;
