// =============================================
// Arama Destekli Dropdown Komponenti
// Malzeme, reçete vb. seçimi için kullanılır
// =============================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface DropdownItem {
  id: number;
  label: string;
  subtitle?: string;
}

interface SearchableDropdownProps {
  label: string;
  placeholder?: string;
  items: DropdownItem[];
  selectedId?: number | null;
  onSelect: (item: DropdownItem) => void;
  disabled?: boolean;
  error?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  label,
  placeholder = 'Seçiniz...',
  items,
  selectedId,
  onSelect,
  disabled = false,
  error,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Seçili öğeyi bul
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  );

  // Arama filtresi
  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;
    return items.filter((item) =>
      item.label.toLowerCase().includes(searchText.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [items, searchText]);

  // Öğe seçildiğinde
  const handleSelect = (item: DropdownItem) => {
    onSelect(item);
    setModalVisible(false);
    setSearchText('');
  };

  // Modal kapatıldığında aramayı temizle
  const handleClose = () => {
    setModalVisible(false);
    setSearchText('');
  };

  return (
    <View style={styles.container}>
      {/* Etiket */}
      <Text style={styles.label}>{label}</Text>

      {/* Seçim butonu */}
      <TouchableOpacity
        style={[
          styles.selector,
          error ? styles.selectorError : null,
          disabled ? styles.selectorDisabled : null,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text
          style={[
            styles.selectorText,
            !selectedItem && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? '#BDBDBD' : '#757575'}
        />
      </TouchableOpacity>

      {/* Hata mesajı */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Seçim modalı */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modal}>
                {/* Modal başlık */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{label} Seç</Text>
                  <TouchableOpacity onPress={handleClose}>
                    <Ionicons name="close" size={24} color="#757575" />
                  </TouchableOpacity>
                </View>

                {/* Arama çubuğu */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color="#9E9E9E" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Ara..."
                    value={searchText}
                    onChangeText={setSearchText}
                    autoFocus
                    placeholderTextColor="#BDBDBD"
                  />
                  {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                      <Ionicons name="close-circle" size={18} color="#9E9E9E" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Öğe listesi */}
                <FlatList
                  data={filteredItems}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.item,
                        selectedId === item.id && styles.selectedItem,
                      ]}
                      onPress={() => handleSelect(item)}
                    >
                      <View style={styles.itemContent}>
                        <Text
                          style={[
                            styles.itemLabel,
                            selectedId === item.id && styles.selectedItemLabel,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.subtitle && (
                          <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                        )}
                      </View>
                      {selectedId === item.id && (
                        <Ionicons name="checkmark" size={20} color="#FF6B35" />
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
                    </View>
                  }
                  style={styles.list}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 6,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FAFAFA',
  },
  selectorError: {
    borderColor: '#F44336',
    backgroundColor: '#FFF5F5',
  },
  selectorDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#EEEEEE',
  },
  selectorText: {
    fontSize: 15,
    color: '#212121',
    flex: 1,
    marginRight: 8,
  },
  placeholderText: {
    color: '#BDBDBD',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
    marginLeft: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#212121',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#212121',
    padding: 0,
  },
  list: {
    flexGrow: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  selectedItem: {
    backgroundColor: '#FFF3EE',
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    color: '#212121',
    fontWeight: '500',
  },
  selectedItemLabel: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9E9E9E',
  },
});

export default SearchableDropdown;
