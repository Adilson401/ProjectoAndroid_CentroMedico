import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../../service/api';
import { registerUserByAdmin, RegistrationData } from '../../service/registarAPI';
import loginStyles from '../login/styles';
import styles from './styleadm';

interface RegistarUsuariosProps {
  onBack: () => void;
}

interface FuncaoOption {
  id: string;
  label: string;
}

interface UserForm {
  nome: string;
  morada: string;
  email: string;
  datanascimento: string;
  dataRegisto: string;
  passwordHash: string;
}

const DEFAULT_FUNCOES: FuncaoOption[] = [
  { id: '6a29bd0933dedb0a602a4f38', label: 'Paciente' },
  { id: 'administrador', label: 'Administrador' },
  { id: 'recepcao', label: 'Recepcao' },
  { id: 'usuario', label: 'Usuario' },
  { id: 'medico', label: 'Medico' },
];

function getInitialForm(): UserForm {
  return {
    nome: '',
    morada: '',
    email: '',
    datanascimento: '',
    dataRegisto: new Date().toISOString().split('T')[0],
    passwordHash: '',
  };
}

function getFuncoesPayload(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.funcoes)) return data.funcoes;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function normalizeFuncoes(data: any): FuncaoOption[] {
  return getFuncoesPayload(data)
    .map((item: any) => ({
      id: String(item?._id || item?.id || item?.funcaoId || '').trim(),
      label: String(item?.nome || item?.descricao || item?.funcao || item?.label || '').trim(),
    }))
    .filter((item: FuncaoOption) => item.id && item.label);
}

function getErrorMessage(error: any) {
  return error?.message || 'Nao foi possivel registar o usuario.';
}

export default function RegistarUsuarios({ onBack }: RegistarUsuariosProps) {
  const [form, setForm] = useState<UserForm>(getInitialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [funcoes, setFuncoes] = useState<FuncaoOption[]>(DEFAULT_FUNCOES);
  const [selectedFuncao, setSelectedFuncao] = useState<FuncaoOption>(DEFAULT_FUNCOES[0]);
  const [funcaoModalVisible, setFuncaoModalVisible] = useState(false);

  const isFormValid =
    form.nome.trim() &&
    form.morada.trim() &&
    form.email.trim() &&
    form.datanascimento.trim() &&
    form.passwordHash.trim() &&
    selectedFuncao?.id;

  useEffect(() => {
    let mounted = true;

    async function loadFuncoes() {
      try {
        const response = await api.get('/funcoes');
        const apiFuncoes = normalizeFuncoes(response.data);

        if (mounted && apiFuncoes.length) {
          setFuncoes(apiFuncoes);
          setSelectedFuncao(apiFuncoes[0]);
        }
      } catch (error) {
        console.warn('Nao foi possivel carregar funcoes. Usando lista local.', error);
      }
    }

    loadFuncoes();

    return () => {
      mounted = false;
    };
  }, []);

  function updateField(field: keyof UserForm, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(getInitialForm());
    setSelectedFuncao(funcoes[0] || DEFAULT_FUNCOES[0]);
  }

  function buildPayload(): RegistrationData {
    return {
      nome: form.nome.trim(),
      morada: form.morada.trim(),
      email: form.email.trim(),
      datanascimento: form.datanascimento.trim(),
      dataRegisto: form.dataRegisto.trim(),
      funcaoId: selectedFuncao.id,
      passwordHash: form.passwordHash.trim(),
      status: 'Activo',
    };
  }

  async function handleRegister() {
    if (!isFormValid) {
      Alert.alert('Alerta', 'Por favor, preencha todos os campos obrigatorios.');
      return;
    }

    setLoading(true);

    try {
      const response = await registerUserByAdmin(buildPayload());
      const successMessage = response?.message || response?.msg || 'Usuario registado com sucesso.';

      Alert.alert('Sucesso', successMessage, [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onBack();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function renderInput(
    label: string,
    field: keyof UserForm,
    placeholder: string,
    options?: {
      keyboardType?: 'default' | 'email-address';
      autoCapitalize?: 'none' | 'sentences' | 'words';
    },
  ) {
    return (
      <View style={loginStyles.inputGroup}>
        <Text style={loginStyles.inputLabel}>{label}</Text>
        <TextInput
          style={loginStyles.input}
          placeholder={placeholder}
          placeholderTextColor="#9E9E9E"
          keyboardType={options?.keyboardType || 'default'}
          autoCapitalize={options?.autoCapitalize || 'sentences'}
          autoCorrect={false}
          value={form[field]}
          onChangeText={(value) => updateField(field, value)}
        />
      </View>
    );
  }

  function renderFuncaoOption(funcao: FuncaoOption) {
    const isActive = selectedFuncao.id === funcao.id;

    return (
      <TouchableOpacity
        key={funcao.id}
        style={isActive ? styles.funcaoOptionActive : styles.funcaoOption}
        onPress={() => {
          setSelectedFuncao(funcao);
          setFuncaoModalVisible(false);
        }}
      >
        <Text style={isActive ? styles.funcaoOptionTextActive : styles.funcaoOptionText}>{funcao.label}</Text>
        {isActive && <Icon name="checkmark-circle" size={20} color="#139CA3" />}
      </TouchableOpacity>
    );
  }

  return (
    <KeyboardAvoidingView
      style={loginStyles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={loginStyles.scrollView}
          contentContainerStyle={loginStyles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={loginStyles.card}>
            <TouchableOpacity style={loginStyles.backButton} onPress={onBack}>
              <Text style={loginStyles.backButtonText}>{'< Voltar'}</Text>
            </TouchableOpacity>

            <View style={loginStyles.header}>
              <Text style={loginStyles.title}>Adicionar Usuario</Text>
              <Text style={loginStyles.subtitle}>Preencha os dados e selecione a funcao do usuario.</Text>
            </View>

            {renderInput('Nome', 'nome', 'Digite o nome', { autoCapitalize: 'words' })}
            {renderInput('Morada', 'morada', 'Digite a morada')}
            {renderInput('E-mail', 'email', 'Digite o e-mail', {
              keyboardType: 'email-address',
              autoCapitalize: 'none',
            })}
            {renderInput('Data de Nascimento', 'datanascimento', 'YYYY-MM-DD')}

            <View style={loginStyles.inputGroup}>
              <Text style={loginStyles.inputLabel}>Função</Text>
              <TouchableOpacity style={styles.funcaoSelectButton} onPress={() => setFuncaoModalVisible(true)}>
                <Text style={styles.funcaoSelectText}>{selectedFuncao.label}</Text>
                <Icon name="chevron-down-outline" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={loginStyles.inputGroup}>
              <Text style={loginStyles.inputLabel}>Senha</Text>
              <View style={loginStyles.inputWithIcon}>
                <TextInput
                  style={loginStyles.input}
                  placeholder="Digite a senha"
                  placeholderTextColor="#9E9E9E"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={form.passwordHash}
                  onChangeText={(value) => updateField('passwordHash', value)}
                />
                <TouchableOpacity
                  style={loginStyles.showPasswordButton}
                  onPress={() => setShowPassword((currentValue) => !currentValue)}
                  activeOpacity={0.7}
                >
                  <Text style={loginStyles.showPasswordText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[loginStyles.primaryButton, loading && loginStyles.primaryButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={loginStyles.primaryButtonText}>Adicionar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={loginStyles.secondaryButton} onPress={onBack}>
              <Text style={loginStyles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <Modal
        animationType="fade"
        transparent
        visible={funcaoModalVisible}
        onRequestClose={() => setFuncaoModalVisible(false)}
      >
        <View style={styles.funcaoModalOverlay}>
          <View style={styles.funcaoModalCard}>
            <Text style={styles.funcaoModalTitle}>Selecionar funcao</Text>
            {funcoes.map(renderFuncaoOption)}

            <TouchableOpacity style={styles.funcaoCancelButton} onPress={() => setFuncaoModalVisible(false)}>
              <Text style={styles.funcaoCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
