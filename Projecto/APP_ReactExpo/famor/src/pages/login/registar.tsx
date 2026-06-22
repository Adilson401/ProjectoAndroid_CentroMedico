import { useState } from 'react';
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
import styles from './styles';
import {
  registerUser,
  verifyRegistrationCode,
  RegistrationData,
} from '../../service/registarAPI';
import { setAuthToken } from '../../service/loginapi';

const logoImage = require('../../assets/imglogin/adaptive-icon.png');

interface RegisterProps {
  onBack: () => void;
}

export default function Register({ onBack }: RegisterProps) {
  const [nome, setNome] = useState('');
  const [morada, setMorada] = useState('');
  const [email, setEmail] = useState('');
  const [datanascimento, setDataNascimento] = useState('');
  const [dataRegisto, setDataRegisto] = useState(new Date().toISOString().split('T')[0]);
  const [passwordHash, setPasswordHash] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  const funcaoId = '6a29bd0933dedb0a602a4f38';
  const status = 'Activo';

  function getErrorAlertConfig(message: string) {
    const normalized = message.toLowerCase();

    if (message.trim()) {
      return {
        title: 'Erro',
        text: message,
      };
    }

    if (
      normalized.includes('jÃ¡ estÃ¡') ||
      (normalized.includes('email') && (normalized.includes('exist') || normalized.includes('utiliz')))
    ) {
      return {
        title: 'E-mail jÃ¡ registado',
        text: message || 'JÃ¡ existe uma conta com este e-mail.',
      };
    }

    if (normalized.includes('codigo') && (normalized.includes('expir') || normalized.includes('expired'))) {
      return {
        title: 'CÃ³digo expirado',
        text: message || 'O cÃ³digo jÃ¡ nÃ£o Ã© vÃ¡lido.',
      };
    }

    if (
      normalized.includes('codigo') &&
      (normalized.includes('inval') || normalized.includes('incor') || normalized.includes('errad'))
    ) {
      return {
        title: 'CÃ³digo invÃ¡lido',
        text: message || 'O cÃ³digo introduzido estÃ¡ incorreto.',
      };
    }

    if (
      normalized.includes('rota') ||
      normalized.includes('endpoint') ||
      normalized.includes('api') ||
      normalized.includes('servidor') ||
      normalized.includes('ligar ao servidor') ||
      normalized.includes('network')
    ) {
      return {
        title: 'Problema de ligaÃ§Ã£o',
        text: message || 'NÃ£o foi possÃ­vel contactar a API.',
      };
    }

    return {
      title: 'Erro',
      text: message || 'NÃ£o foi possÃ­vel concluir a operaÃ§Ã£o.',
    };
  }

  function resetForm() {
    setNome('');
    setMorada('');
    setEmail('');
    setDataNascimento('');
    setDataRegisto(new Date().toISOString().split('T')[0]);
    setPasswordHash('');
    setVerificationCode('');
  }

  async function handleRegister() {
    if (!nome.trim() || !morada.trim() || !email.trim() || !datanascimento.trim() || !passwordHash.trim()) {
      Alert.alert('Alerta', 'Por favor, preencha todos os campos obrigatorios.');
      return;
    }

    setLoading(true);
    const registrationData: RegistrationData = {
      nome: nome.trim(),
      morada: morada.trim(),
      email: email.trim(),
      datanascimento: datanascimento.trim(),
      dataRegisto: dataRegisto.trim(),
      funcaoId,
      passwordHash: passwordHash.trim(),
      status,
    };

    try {
      const response = await registerUser(registrationData);
      const successMessage =
        response?.message ||
        response?.msg ||
        'Cadastro efetuado. Verifique o seu e-mail para confirmar a conta.';

      setVerificationCode('');
      setVerificationModalVisible(true);
      Alert.alert('Verifique o seu e-mail', successMessage);
    } catch (error: any) {
      console.error('registerUser error:', error?.message ?? error);
      const config = getErrorAlertConfig(error?.message || 'Nao foi possivel concluir o cadastro.');
      Alert.alert(config.title, config.text);
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (!email.trim()) {
      Alert.alert('Alerta', 'Informe o e-mail para receber novamente o codigo.');
      return;
    }

    setResendingCode(true);
    try {
      const response = await registerUser({
        nome: nome.trim(),
        morada: morada.trim(),
        email: email.trim(),
        datanascimento: datanascimento.trim(),
        dataRegisto: dataRegisto.trim(),
        funcaoId,
        passwordHash: passwordHash.trim(),
        status,
      });

      const successMessage =
        response?.message ||
        response?.msg ||
        'O codigo foi reenviaado para o seu e-mail.';

      Alert.alert('Sucesso', successMessage);
    } catch (error: any) {
      console.error('resendCode error:', error?.message ?? error);
      const config = getErrorAlertConfig(error?.message || 'Nao foi possivel reenviar o codigo.');
      Alert.alert(config.title, config.text);
    } finally {
      setResendingCode(false);
    }
  }

  async function handleVerifyCode() {
    if (!verificationCode.trim()) {
      Alert.alert('Alerta', 'Informe o codigo de verificacao.');
      return;
    }

    setVerifyingCode(true);

    try {
      const response = await verifyRegistrationCode({
        email: email.trim(),
        codigo: verificationCode.trim(),
      });

      const token = response?.token || response?.data?.token;
      if (token) {
        await setAuthToken(token, true);
      }

      const successMessage = response?.message || response?.msg || 'Conta verificada com sucesso!';

      Alert.alert('Sucesso', successMessage, [
        {
          text: 'OK',
          onPress: () => {
            setVerificationModalVisible(false);
            resetForm();
            onBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error('verifyRegistrationCode error:', error?.message ?? error);
      const config = getErrorAlertConfig(error?.message || 'Nao foi possivel verificar o codigo.');
      Alert.alert(config.title, config.text);
    } finally {
      setVerifyingCode(false);
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
              <Text style={styles.backButtonText}>{'< Voltar'}</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <Image source={logoImage} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>Cadastro Centro Medico Famaor</Text>
              <Text style={styles.subtitle}>Preencha seus dados para criar uma conta.</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Nome</Text>
                <Text style={styles.arrowIndicator}></Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Digite seu nome"
                placeholderTextColor="#9E9E9E"
                autoCapitalize="words"
                autoCorrect={false}
                value={nome}
                onChangeText={setNome}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Morada</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite sua morada"
                placeholderTextColor="#9E9E9E"
                autoCapitalize="sentences"
                autoCorrect={false}
                value={morada}
                onChangeText={setMorada}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>E-mail</Text>
                <Text style={styles.arrowIndicator}></Text>
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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Data de Nascimento</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9E9E9E"
                value={datanascimento}
                onChangeText={setDataNascimento}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Senha</Text>
                <Text style={styles.arrowIndicator}></Text>
              </View>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.input}
                  placeholder="Digite sua senha"
                  placeholderTextColor="#9E9E9E"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={passwordHash}
                  onChangeText={setPasswordHash}
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Registrando...' : 'Cadastrar ->'}
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
        visible={verificationModalVisible}
        onRequestClose={() => {
          if (!verifyingCode) {
            setVerificationModalVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Verifique o seu e-mail</Text>
            <Text style={styles.modalSubtitle}>
              Escreva o codigo recebido em {email.trim()}.
            </Text>

            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="Digite o codigo"
              placeholderTextColor="#9E9E9E"
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              value={verificationCode}
              onChangeText={setVerificationCode}
              editable={!verifyingCode}
            />

            <TouchableOpacity
              style={[styles.primaryButton, verifyingCode && styles.primaryButtonDisabled]}
              onPress={handleVerifyCode}
              disabled={verifyingCode}
            >
              {verifyingCode ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Verificar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resendCode}
              disabled={verifyingCode || resendingCode}
            >
              <Text style={styles.secondaryButtonText}>
                {resendingCode ? 'A reenviar...' : 'Reenviar codigo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setVerificationModalVisible(false)}
              disabled={verifyingCode}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

