import { useEffect, useState } from 'react';
import {
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as Linking from 'expo-linking';
import styles from './styles';
import { recoverPassword, resetPassword } from '../../service/senhaRecuperarAPI';

const logoImage = require('../../assets/imglogin/adaptive-icon.png');
const TOKEN_QUERY_KEYS = ['token', 'resetToken'];
const CODE_QUERY_KEYS = ['codigo', 'code'];
const EMAIL_QUERY_KEYS = ['email', 'mail'];

interface RecoverPasswordProps {
  onBack: () => void;
}

function getFirstQueryValue(params: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = params.get(key);
    if (value) return value;
  }

  return '';
}

function getUrlSearchParams(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return new URLSearchParams();

  try {
    const parsedUrl = new URL(trimmedValue);
    return new URLSearchParams(parsedUrl.search);
  } catch {
    const queryStartIndex = trimmedValue.indexOf('?');
    const queryString = queryStartIndex >= 0 ? trimmedValue.slice(queryStartIndex + 1) : trimmedValue;
    return new URLSearchParams(queryString);
  }
}

function parseResetPasswordLink(value: string) {
  const params = getUrlSearchParams(value);
  const token = getFirstQueryValue(params, TOKEN_QUERY_KEYS);
  const codigo = getFirstQueryValue(params, CODE_QUERY_KEYS);

  return {
    token: token || codigo,
    codigo,
    email: getFirstQueryValue(params, EMAIL_QUERY_KEYS),
  };
}

export default function RecoverPassword({ onBack }: RecoverPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [codigoConfirmacao, setCodigoConfirmacao] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [isLinkReset, setIsLinkReset] = useState(false);

  useEffect(() => {
    const handleUrl = (url?: string | null) => {
      if (!url) return;

      const { token: parsedToken, codigo: parsedCodigo, email: parsedEmail } = parseResetPasswordLink(url);

      if (parsedToken) {
        setToken(parsedToken);
        setCodigoConfirmacao(parsedCodigo);
        setIsLinkReset(true);
      } else {
        setCodigoConfirmacao('');
        setIsLinkReset(false);
      }

      if (parsedEmail) {
        setEmail(parsedEmail);
      }

      if (parsedToken) {
        setShowResetModal(true);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => subscription.remove();
  }, []);

  function handleTokenChange(value: string) {
    const { token: parsedToken, codigo: parsedCodigo, email: parsedEmail } = parseResetPasswordLink(value);

    if (parsedToken) {
      setToken(parsedToken);
      setCodigoConfirmacao(parsedCodigo);
      setIsLinkReset(true);
      if (parsedEmail) {
        setEmail(parsedEmail);
      }
      return;
    }

    setToken(value);
    setCodigoConfirmacao(value);
    setIsLinkReset(false);
  }

  async function handleRecover() {
    if (!email.trim()) {
      Alert.alert('Alerta', 'Por favor, informe o e-mail para recuperação de senha.');
      return;
    }

    setLoading(true);
    try {
      const response = await recoverPassword(email.trim());
      const message =
        typeof response === 'string'
          ? response
          : response?.message ||
            response?.msg ||
            response?.error ||
            response?.data?.message ||
            'Verifique seu e-mail para continuar com a recuperação de senha.';

      Alert.alert(
        'Verifique o seu e-mail',
        message || 'Se o link chegar à sua caixa de entrada, pode abrir o formulário de nova password aqui.'
      );
      setIsLinkReset(false);
      setShowResetModal(true);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível enviar o e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email.trim()) {
      Alert.alert('Alerta', 'Informe o e-mail para concluir a recuperação.');
      return;
    }

    if (!token.trim()) {
      Alert.alert('Alerta', 'Insira o token ou cole o link recebido por e-mail.');
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Alerta', 'Preencha a nova senha e a confirmação.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Alerta', 'As senhas não coincidem.');
      return;
    }

    setResetLoading(true);
    try {
      const response = await resetPassword({
        email: email.trim(),
        token: token.trim(),
        codigo: codigoConfirmacao.trim() || undefined,
        codigoConfirmacao: codigoConfirmacao.trim() || undefined,
        passwordHash: newPassword,
        password: newPassword,
        confirmPassword,
      });

      const message =
        typeof response === 'string'
          ? response
          : response?.message ||
            response?.msg ||
            response?.error ||
            response?.data?.message ||
            'Senha atualizada com sucesso.';

      Alert.alert('Sucesso', message, [
        {
          text: 'OK',
          onPress: () => {
            setShowResetModal(false);
            setNewPassword('');
            setConfirmPassword('');
            setToken('');
            setCodigoConfirmacao('');
            onBack();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível atualizar a senha.');
    } finally {
      setResetLoading(false);
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
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Voltar</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Image source={logoImage} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>Recuperar senha</Text>
              <Text style={styles.subtitle}>Informe seu e-mail para receber o link de recuperação.</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>E-mail</Text>
                <Text style={styles.arrowIndicator}>→</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Digite seu e-mail"
                placeholderTextColor="#9E9E9E"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleRecover}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Enviando...' : 'Recuperar →'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <Modal
        animationType="fade"
        transparent
        visible={showResetModal}
        onRequestClose={() => {
          if (!resetLoading) {
            setShowResetModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Definir nova senha</Text>
            <Text style={styles.modalSubtitle}>
              {isLinkReset
                ? 'Foi detetado um link de recuperação. O código é usado apenas para confirmar o reset e permanece oculto no ecrã.'
                : 'Se recebeu um código por e-mail, pode colocá-lo aqui. O valor fica oculto para maior segurança.'}
            </Text>

            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="Código de confirmação"
              placeholderTextColor="#9E9E9E"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={token}
              onChangeText={handleTokenChange}
              editable={!resetLoading}
            />

            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="Nova senha"
              placeholderTextColor="#9E9E9E"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!resetLoading}
            />

            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="Confirmar nova senha"
              placeholderTextColor="#9E9E9E"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!resetLoading}
            />

            <TouchableOpacity
              style={[styles.primaryButton, resetLoading && styles.primaryButtonDisabled]}
              onPress={handleResetPassword}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Atualizar senha</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setShowResetModal(false)}
              disabled={resetLoading}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
