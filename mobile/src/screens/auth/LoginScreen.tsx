// =============================================
// Login Ekranı - Kimlik Doğrulama
// React Hook Form + Yup doğrulaması ile
// =============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Surface, HelperText } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { Ionicons } from '@expo/vector-icons';
import { useLoginMutation } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ErrorMessage from '../../components/common/ErrorMessage';

// Form doğrulama şeması
const loginSchema = yup.object().shape({
  username: yup.string().required('Kullanıcı adı zorunludur'),
  password: yup.string().required('Şifre zorunludur').min(4, 'Şifre en az 4 karakter olmalıdır'),
});

type LoginFormData = yup.InferType<typeof loginSchema>;

const LoginScreen: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginApi, { isLoading }] = useLoginMutation();
  const { login: handleLoginSuccess } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      const res = await loginApi(data).unwrap();
      if (res.success && res.data) {
        await handleLoginSuccess(res.data.token, res.data.user);
      } else {
        setServerError(res.message || 'Giriş yapılamadı.');
      }
    } catch (err: any) {
      setServerError(err.data?.message || err.message || 'Giriş yapılırken sunucu hatası oluştu.');
    }
  };

  // Hızlı test için demo doldurucu
  const fillDemo = (user: string, pass: string) => {
    setValue('username', user);
    setValue('password', pass);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Üst Logo ve Başlık Alanı */}
        <View style={styles.headerArea}>
          <View style={styles.iconCircle}>
            <Ionicons name="restaurant" size={48} color="#FF6B35" />
          </View>
          <Text style={styles.appTitle}>Catering Yönetim</Text>
          <Text style={styles.appSubtitle}>Profesyonel Mutfak & Stok Sistemi</Text>
        </View>

        {/* Giriş Kartı */}
        <Surface style={styles.card} elevation={3}>
          <Text style={styles.cardTitle}>Giriş Yap</Text>

          {serverError && (
            <ErrorMessage
              message={serverError}
              onRetry={() => setServerError(null)}
            />
          )}

          {/* Kullanıcı Adı */}
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Kullanıcı Adı"
                mode="outlined"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                autoCapitalize="none"
                left={<TextInput.Icon icon="account" />}
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

          {/* Şifre */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Şifre"
                mode="outlined"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry={!showPassword}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
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

          {/* Giriş Butonu */}
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
            buttonColor="#FF6B35"
          >
            Sisteme Giriş
          </Button>

          {/* Hızlı Demo Hesapları */}
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>Hızlı Test Hesapları:</Text>
            <View style={styles.demoButtonsRow}>
              <TouchableOpacity
                style={styles.demoPill}
                onPress={() => fillDemo('admin', 'admin123')}
              >
                <Text style={styles.demoPillText}>Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.demoPill}
                onPress={() => fillDemo('chef', 'chef123')}
              >
                <Text style={styles.demoPillText}>Şef</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.demoPill}
                onPress={() => fillDemo('depo', 'depo123')}
              >
                <Text style={styles.demoPillText}>Depo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Surface>
      </ScrollView>

      {isLoading && <LoadingOverlay message="Giriş yapılıyor..." />}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B35',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  loginButtonContent: {
    paddingVertical: 6,
  },
  demoSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 8,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoPill: {
    backgroundColor: '#FFF3EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD6C9',
  },
  demoPillText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LoginScreen;

