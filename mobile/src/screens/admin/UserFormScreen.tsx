// =============================================
// Kullanıcı Form Ekranı - Yeni Kullanıcı Ekleme / Düzenleme
// =============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button, Surface, HelperText, Switch } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useCreateUserMutation, useUpdateUserMutation } from '../../services/api';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import LoadingOverlay from '../../components/common/LoadingOverlay';

const ROLE_OPTIONS = [
  { label: 'Admin (Sistem Yöneticisi)', value: 1 },
  { label: 'Şef (Menü & Üretim Sorumlusu)', value: 2 },
  { label: 'Depo (Stok & Fatura Sorumlusu)', value: 3 },
];

const userSchema = yup.object().shape({
  full_name: yup.string().required('Ad Soyad zorunludur'),
  username: yup.string().required('Kullanıcı adı zorunludur'),
  email: yup.string().email('Geçerli bir e-posta giriniz').required('E-posta zorunludur'),
  password: yup.string().when('$isEditing', {
    is: false,
    then: (schema) => schema.required('Şifre zorunludur').min(6, 'En az 6 karakter olmalıdır'),
    otherwise: (schema) => schema.optional(),
  }),
  role_id: yup.number().required('Rol seçilmelidir'),
});

const UserFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const editingUser = route.params?.user;
  const isEditing = !!editingUser;

  const [isActive, setIsActive] = useState(editingUser ? editingUser.isActive : true);

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(userSchema),
    context: { isEditing },
    defaultValues: {
      full_name: editingUser?.fullName || '',
      username: editingUser?.username || '',
      email: editingUser?.email || '',
      password: '',
      role_id: editingUser?.role?.id || 2, // Varsayılan Şef
    },
  });

  const onSubmit = async (data: any) => {
    try {
      if (isEditing) {
        const updatePayload: any = {
          full_name: data.full_name,
          email: data.email,
          role_id: data.role_id,
          is_active: isActive,
        };
        if (data.password) {
          updatePayload.password = data.password;
        }
        await updateUser({ id: editingUser.id, data: updatePayload }).unwrap();
        Alert.alert('Başarılı', 'Kullanıcı güncellendi.');
      } else {
        await createUser({
          ...data,
          is_active: isActive,
        }).unwrap();
        Alert.alert('Başarılı', 'Kullanıcı oluşturuldu.');
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Hata', err.data?.message || err.message || 'İşlem gerçekleştirilemedi.');
    }
  };

  const isSaving = isCreating || isUpdating;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={styles.card} elevation={2}>
          <Text style={styles.title}>
            {isEditing ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Oluştur'}
          </Text>

          {/* Ad Soyad */}
          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Ad Soyad *"
                mode="outlined"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.full_name}
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
            )}
          />
          {errors.full_name && (
            <HelperText type="error" visible={!!errors.full_name}>
              {errors.full_name.message}
            </HelperText>
          )}

          {/* Kullanıcı Adı */}
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Kullanıcı Adı *"
                mode="outlined"
                autoCapitalize="none"
                disabled={isEditing}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.username}
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
            )}
          />
          {errors.username && (
            <HelperText type="error" visible={!!errors.username}>
              {errors.username.message}
            </HelperText>
          )}

          {/* E-posta */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="E-posta Adresi *"
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.email}
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
            )}
          />
          {errors.email && (
            <HelperText type="error" visible={!!errors.email}>
              {errors.email.message}
            </HelperText>
          )}

          {/* Şifre */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={isEditing ? 'Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)' : 'Şifre *'}
                mode="outlined"
                secureTextEntry
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={!!errors.password}
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF6B35"
              />
            )}
          />
          {errors.password && (
            <HelperText type="error" visible={!!errors.password}>
              {errors.password.message}
            </HelperText>
          )}

          {/* Rol Seçimi */}
          <View style={styles.dropdownContainer}>
            <Controller
              control={control}
              name="role_id"
              render={({ field: { onChange, value } }) => (
                <SearchableDropdown
                  label="Kullanıcı Rolü *"
                  placeholder="Rol seçin..."
                  options={ROLE_OPTIONS}
                  selectedValue={value}
                  onSelect={(val) => onChange(Number(val))}
                  error={errors.role_id?.message}
                />
              )}
            />
          </View>

          {/* Aktiflik Durumu Switch */}
          {isEditing && (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Hesap Aktif mi?</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                color="#FF6B35"
              />
            </View>
          )}

          {/* Butonlar */}
          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelBtn}
              textColor="#757575"
            >
              İptal
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              loading={isSaving}
              disabled={isSaving}
              buttonColor="#FF6B35"
              style={styles.saveBtn}
            >
              Kaydet
            </Button>
          </View>
        </Surface>
      </ScrollView>

      {isSaving && <LoadingOverlay message="Kaydediliyor..." />}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
  },
  input: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  dropdownContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    borderColor: '#BDBDBD',
  },
  saveBtn: {
    minWidth: 100,
  },
});

export default UserFormScreen;

