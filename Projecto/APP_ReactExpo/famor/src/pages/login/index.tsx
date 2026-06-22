import { useEffect, useState } from 'react';
import {
  Text,
  View,
  Image,
  TextInput,
  Pressable,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
} from 'react-native';
import styles from './styles';
import { LoginSession, loginUser } from '../../service/loginapi';

const logoImage = require('../../assets/imglogin/adaptive-icon.png');

interface LoginProps {
  onLogin: (session: LoginSession) => void;
  onRegister: () => void;
  onRecover: () => void;
}

export default function Login({ onLogin, onRegister, onRecover }: LoginProps) {
  const [email, changeEmail] = useState('');
  const [password, changePassword] = useState('');
  const [remember, toggleRemember] = useState(false);
  const [showPassword, toggleShowPassword] = useState(false);
  const [loading, changeLoading] = useState(false);
  const [readyToNavigate, setReadyToNavigate] = useState(false);
  const [authenticatedSession, setAuthenticatedSession] = useState<LoginSession | null>(null);
  const [showRedirectMessage, setShowRedirectMessage] = useState(false);

  useEffect(() => {
    if (!readyToNavigate || !authenticatedSession) {
      return;
    }

    setShowRedirectMessage(true);

    const timer = setTimeout(() => {
      setShowRedirectMessage(false);
      onLogin(authenticatedSession);
      setReadyToNavigate(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [readyToNavigate, authenticatedSession, onLogin]);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Alerta', 'Por favor, Digite o e-mail e a senha para prosseguir.');
      return;
    }

    changeLoading(true);
    try {
      const session = await loginUser(email.trim(), password, remember);
      Alert.alert('Sucesso', 'Login efetuado com sucesso!');
      setAuthenticatedSession(session);
      setReadyToNavigate(true);
    } catch (error: any) {
      const status = error?.response?.status;
      let message = error?.response?.data?.message || error?.message || 'Falha ao efetuar login.';
      if (status) {
        message = `${message} (status ${status})`;
      }
      Alert.alert('Erro', message);
      console.error('Login error:', error);
    } finally {
      changeLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <Image source={logoImage} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>Bem-vindo ao Centro Médico Famor</Text>
              <Text style={styles.subtitle}>Digite seus dados da sua conta para continuar</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite seu e-mail"
                placeholderTextColor="#9E9E9E"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor="#2563EB"
                value={email}
                onChangeText={changeEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Senha</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.input}
                  placeholder="Digite sua senha"
                  placeholderTextColor="#9E9E9E"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor="#2563EB"
                  value={password}
                  onChangeText={changePassword}
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => toggleShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

           
            <View style={styles.rowBetween}>
              <Pressable style={styles.checkboxContainer} onPress={() => toggleRemember((prev) => !prev)}>
                <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                  {remember && <View style={styles.checkboxDot} />}
                </View>
                <Text style={styles.checkboxLabel}>Lembrar-me</Text>
              </Pressable>

              <TouchableOpacity onPress={onRecover}>
                <Text style={styles.forgotText}>Esqueceu a senha?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Text>
            </TouchableOpacity>

            {showRedirectMessage && (
              <View style={styles.redirectMessage}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.redirectMessageText}>
                  Estamos preparando a página inicial...
                </Text>
              </View>
            )}

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Ainda nÃ£o tem conta?</Text>
              <TouchableOpacity onPress={onRegister}>
                <Text style={styles.registerLink}>Novo registo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

