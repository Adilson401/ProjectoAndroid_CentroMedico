import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../../service/api';
import { getApiErrorMessage as getDefaultApiErrorMessage } from '../../service/apiResponse';
import PerfilUsuario from '../home/perfilusuario';
import MarcacaoConsulta from '../marcacao/indexmarcacao';
import RegistarUsuarios from './registarusuarios';
import styles from './styleadm';

type AdminTab = 'inicio' | 'agendar' | 'consultas' | 'usuarios' | 'avisos' | 'perfil';
type AdminSegment = 'medicos' | 'consultas';
type PerfilRoute = 'home' | 'agendar' | 'consultas' | 'avisos' | 'perfil';

const LIST_USERS_PATH = '/usuarios/listagemusuario';
const DELETE_USER_PATH = '/usuarios';
const UPDATE_USER_PATH = '/usuarios';
const PAINEL_ADM_PATH = '/paineladm';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  address: string;
  birthDate: string;
  roleId: string;
  role: string;
  status: string;
  active: boolean;
}

interface UpdateUserForm {
  nome: string;
  email: string;
  morada: string;
  datanascimento: string;
  funcaoId: string;
  status: string;
  passwordHash: string;
}

interface FuncaoOption {
  id: string;
  label: string;
}

interface PainelAdmResumo {
  totalMedicos: number;
  totalConsultasHoje: number;
  totalUsuarios: number;
  medicosEmConsulta: DoctorSummary[];
}

interface DoctorSummary {
  id: string;
  name: string;
  specialty: string;
  registration: string;
  totalConsultasHoje: number;
  consultasHoje: any[];
}

interface PainelAdmProps {
  email?: string;
  usuarioId?: string;
  usuarioSessao?: any;
  nome?: string;
  tipoUsuario?: string;
  membroDesde?: string;
  onNavigate?: (route: AdminTab) => void;
  onLogout?: () => void;
}

const bottomTabs: Array<{
  key: AdminTab;
  label: string;
  icon: string;
  activeIcon: string;
}> = [
  { key: 'inicio', label: 'Inicio', icon: 'home-outline', activeIcon: 'home' },
  { key: 'agendar', label: 'Agendar', icon: 'calendar-number-outline', activeIcon: 'calendar-number' },
  { key: 'consultas', label: 'Consultas', icon: 'calendar-outline', activeIcon: 'calendar' },
  { key: 'usuarios', label: 'Usuarios', icon: 'people-outline', activeIcon: 'people' },
  { key: 'avisos', label: 'Avisos', icon: 'notifications-outline', activeIcon: 'notifications' },
  { key: 'perfil', label: 'Perfil', icon: 'person-outline', activeIcon: 'person' },
];

const DEFAULT_FUNCOES: FuncaoOption[] = [
  { id: '6a29bd0933dedb0a602a4f38', label: 'Paciente' },
  { id: 'administrador', label: 'Administrador' },
  { id: 'recepcao', label: 'Recepcao' },
  { id: 'usuario', label: 'Usuario' },
  { id: 'medico', label: 'Medico' },
];

const STATUS_OPTIONS = ['Activo', 'Inactivo'];

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function normalizeText(value: unknown) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isInactiveStatus(status: string) {
  return ['inativo', 'inactio', 'inactivo', 'inactive', 'desativado', 'desactivo', '0', 'false'].includes(normalizeText(status));
}

function getUsersPayload(data: any) {
  // A API pode devolver a lista dentro de chaves diferentes.
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.usuarios)) return data.usuarios;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;

  const nestedPayload =
    data?.data?.usuarios ||
    data?.data?.users ||
    data?.data?.items ||
    data?.resultado ||
    data?.result ||
    data?.payload ||
    data?.lista;

  if (Array.isArray(nestedPayload)) return nestedPayload;

  return [];
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
      id: String(item?._id || item?.id || item?.funcaoId || item?.codigo || '').trim(),
      label: String(item?.nome || item?.descricao || item?.funcao || item?.label || '').trim(),
    }))
    .filter((item: FuncaoOption) => item.id && item.label);
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function getResumoPayload(data: any) {
  return data?.data || data?.dados || data?.resumo || data || {};
}

function getMedicosEmConsultaPayload(payload: any) {
  if (Array.isArray(payload?.MedicosEmConsulta)) return payload.MedicosEmConsulta;
  if (Array.isArray(payload?.medicosEmConsulta)) return payload.medicosEmConsulta;
  if (Array.isArray(payload?.medicos)) return payload.medicos;
  if (Array.isArray(payload?.doctors)) return payload.doctors;
  return [];
}

function normalizeDoctorSummary(item: any): DoctorSummary {
  const id = String(item?.id || item?.medicoId || item?._id || '').trim();
  const name = String(item?.nome || item?.medico || item?.name || 'Medico sem nome');

  return {
    id: id || name,
    name,
    specialty: String(item?.especialidade || item?.specialty || 'Sem especialidade'),
    registration: String(item?.numeroOrdem || item?.numeroordem || item?.registration || 'Sem ordem'),
    totalConsultasHoje: numberValue(item?.totalConsultasHoje, item?.consultasHoje?.length),
    consultasHoje: Array.isArray(item?.consultasHoje) ? item.consultasHoje : [],
  };
}

function normalizePainelAdmResumo(data: any): PainelAdmResumo {
  const payload = getResumoPayload(data);

  return {
    totalMedicos: numberValue(payload?.TotalMedicos, payload?.totalMedicos),
    totalConsultasHoje: numberValue(payload?.TotalConsultasHoje, payload?.totalConsultasHoje),
    totalUsuarios: numberValue(payload?.TotalUsuarios, payload?.totalUsuarios),
    medicosEmConsulta: getMedicosEmConsultaPayload(payload).map(normalizeDoctorSummary),
  };
}

function getDashboardStats(resumo: PainelAdmResumo) {
  return [
    { label: 'Medicos', value: String(resumo.totalMedicos), icon: 'medkit-outline', color: '#139CA3', backgroundColor: '#E0F7F6' },
    { label: 'Consultas Hoje', value: String(resumo.totalConsultasHoje), icon: 'calendar-outline', color: '#E7C948', backgroundColor: '#FFF8D8' },
    { label: 'Ativas', value: String(resumo.medicosEmConsulta.length), icon: 'time-outline', color: '#2EB8A6', backgroundColor: '#E0F7F6' },
    { label: 'Total', value: String(resumo.totalUsuarios), icon: 'people-outline', color: '#2B80B9', backgroundColor: '#E7F2FA' },
  ];
}

function getRole(user: any) {
  const funcao = user?.funcao || user?.funcaoId || user?.funcao_id || user?.role || user?.tipoUsuario;

  if (typeof funcao === 'object' && funcao) {
    return (
      funcao?.nome ||
      funcao?.descricao ||
      funcao?.designacao ||
      funcao?.name ||
      funcao?.label ||
      funcao?.tipo ||
      funcao?._id ||
      funcao?.id ||
      'Sem funcao'
    );
  }

  return (
    funcao ||
    user?.funcaoNome ||
    user?.nomeFuncao ||
    user?.descricaoFuncao ||
    user?.perfil ||
    user?.perfilNome ||
    user?.role ||
    user?.tipoUsuario ||
    user?.tipo_usuario ||
    'Sem funcao'
  );
}

function getRoleId(user: any) {
  // Para actualizar, guardamos o ID da funcao e nao so o nome.
  const funcao = user?.funcao || user?.Funcao || user?.role || user?.tipoUsuario;

  if (typeof funcao === 'object' && funcao) {
    return String(funcao?._id || funcao?.id || funcao?.Id || funcao?.funcaoId || funcao?.codigo || '').trim();
  }

  return String(user?.funcaoId || user?.funcao_id || user?.idFuncao || user?.id_funcao || '').trim();
}

function getUserAddress(user: any) {
  return user?.morada || user?.Morada || user?.endereco || user?.Endereco || user?.address || '';
}

function getUserBirthDate(user: any) {
  const birthDate =
    user?.datanascimento ||
    user?.dataNascimento ||
    user?.data_nascimento ||
    user?.DataNascimento ||
    user?.Data_Nascimento ||
    user?.nascimento ||
    '';

  return formatDateForInput(birthDate);
}

function formatDateForInput(value: unknown) {
  // Mantem a data simples para editar e enviar: AAAA-MM-DD.
  if (!hasValue(value)) return '';

  const dateText = String(value).trim();
  const isoMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const localMatch = dateText.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (localMatch) return `${localMatch[3]}-${localMatch[2]}-${localMatch[1]}`;

  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;

  return date.toISOString().split('T')[0];
}

function getStatusValue(status: string) {
  return isInactiveStatus(status) ? 'Inactivo' : 'Activo';
}

function getStatus(user: any) {
  const status = getRawStatus(user);

  if (status === undefined || status === null || status === '') return 'Ativo';
  if (typeof status === 'boolean') return status ? 'Ativo' : 'Inativo';
  if (status === 1) return 'Ativo';
  if (status === 0) return 'Inativo';
  if (typeof status === 'object' && status) {
    const statusLabel = status?.nome || status?.descricao || status?.label || status?.estado;
    const statusId = status?.Id ?? status?.id ?? status?._id ?? status?.codigo;

    if (statusLabel) return statusLabel;
    if (statusId === 1 || String(statusId).trim() === '1') return 'Ativo';
    if (statusId === 0 || String(statusId).trim() === '0') return 'Inativo';
  }

  return status || 'Sem estado';
}

function getRawStatus(user: any) {
  const statusKeys = [
    'estado',
    'status',
    'estadoUsuario',
    'estado_usuario',
    'estadoId',
    'estado_id',
    'idEstado',
    'id_estado',
    'situacao',
    'activo',
    'ativo',
    'isActive',
  ];

  return statusKeys
    .map((key) => user?.[key] ?? user?.[key.charAt(0).toUpperCase() + key.slice(1)])
    .find((value) => value !== undefined && value !== null);
}

function isActiveUser(user: any) {
  const status = getRawStatus(user);

  // A rota ja devolve usuarios activos; so excluimos inactivos explicitos.
  if (status === undefined || status === null || status === '') return true;
  if (typeof status === 'boolean') return status;
  if (status === 1) return true;
  if (status === 0) return false;
  if (typeof status === 'object' && status) {
    const statusId = status?.Id ?? status?.id ?? status?._id ?? status?.codigo;
    const statusLabel = status?.nome || status?.descricao || status?.label || status?.estado;

    if (statusId === 1 || String(statusId).trim() === '1') return true;
    if (statusId === 0 || String(statusId).trim() === '0') return false;

    return ['ativo', 'activo', 'active'].includes(normalizeText(statusLabel));
  }

  return ['1', 'ativo', 'activo', 'active'].includes(normalizeText(status));
}

function getUserApiId(user: any) {
  // Sem este ID real nao conseguimos editar nem apagar na API.
  const idKeys = [
    '_id',
    'id',
    'usuarioId',
    'usuario_id',
    'idUsuario',
    'id_usuario',
    'codigoUsuario',
    'codigo_usuario',
    'utilizadorId',
    'utilizador_id',
    'idUtilizador',
    'id_utilizador',
  ];

  const sources = [user, user?.usuario, user?.user];
  const found = sources.flatMap((source) => idKeys.map((key) => source?.[key] ?? source?.[key.toLowerCase()])).find(hasValue);
  return found !== undefined && found !== null ? String(found).trim() : '';
}

function getApiErrorMessage(error: any, fallbackMessage = 'Nao foi possivel concluir a operacao.') {
  if (error?.response?.status === 500) {
    return 'O servidor encontrou um erro. Verifique se o ID enviado existe na API.';
  }

  return getDefaultApiErrorMessage(error, fallbackMessage);
}

function normalizeUsers(data: any): AdminUser[] {
  return getUsersPayload(data)
    .map((user: any) => {
      const id = getUserApiId(user);

      // Sem ID real nao conseguimos chamar DELETE /usuarios/id.
      if (!id) {
        console.warn('Usuario ignorado porque veio sem ID da API:', user);
        return null;
      }

      return {
        id,
        name: String(user?.nome || user?.name || 'Usuario sem nome'),
        email: String(user?.email || 'Sem email'),
        address: String(getUserAddress(user)),
        birthDate: String(getUserBirthDate(user)),
        roleId: getRoleId(user),
        role: String(getRole(user)),
        status: String(getStatus(user)),
        active: isActiveUser(user),
      };
    })
    .filter((user: AdminUser | null): user is AdminUser => Boolean(user))
    .filter((user: AdminUser) => user.active);
}

export default function PainelAdm({
  email = '',
  usuarioId,
  usuarioSessao,
  nome,
  tipoUsuario = 'Administrador',
  membroDesde,
  onNavigate,
  onLogout,
}: PainelAdmProps) {
  const [tab, setTab] = useState<AdminTab>('inicio');
  const [segment, setSegment] = useState<AdminSegment>('medicos');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [updateVisible, setUpdateVisible] = useState(false);
  const [updateForm, setUpdateForm] = useState<UpdateUserForm>({
    nome: '',
    email: '',
    morada: '',
    datanascimento: '',
    funcaoId: '',
    status: 'Activo',
    passwordHash: '',
  });
  const [funcoes, setFuncoes] = useState<FuncaoOption[]>(DEFAULT_FUNCOES);
  const [funcaoModalVisible, setFuncaoModalVisible] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [deletingUserId, setDeletingUserId] = useState('');
  const [updatingUser, setUpdatingUser] = useState(false);
  const [painelResumo, setPainelResumo] = useState<PainelAdmResumo>({
    totalMedicos: 0,
    totalConsultasHoje: 0,
    totalUsuarios: 0,
    medicosEmConsulta: [],
  });
  const [loadingPainel, setLoadingPainel] = useState(false);
  const [painelError, setPainelError] = useState('');

  async function loadUsers() {
    // Carrega usuarios activos a partir da rota oficial da API.
    setLoadingUsers(true);
    setUsersError('');

    try {
      const response = await api.get(LIST_USERS_PATH);
      const activeUsers = normalizeUsers(response.data);

      setUsers(activeUsers);
    } catch (error: any) {
      setUsersError(error?.response?.data?.message || error?.message || 'Nao foi possivel carregar usuarios.');
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadPainelResumo() {
    // Busca os numeros do painel no backend, sem valores fixos na tela.
    setLoadingPainel(true);
    setPainelError('');

    try {
      const response = await api.get(PAINEL_ADM_PATH);
      setPainelResumo(normalizePainelAdmResumo(response.data));
    } catch (error: any) {
      setPainelError(getApiErrorMessage(error, 'Nao foi possivel carregar o painel administrativo.'));
    } finally {
      setLoadingPainel(false);
    }
  }

  useEffect(() => {
    loadPainelResumo();
    loadUsers();
    loadFuncoes();
  }, []);

  async function loadFuncoes() {
    try {
      const response = await api.get('/funcoes');
      const apiFuncoes = normalizeFuncoes(response.data);

      if (apiFuncoes.length) {
        setFuncoes(apiFuncoes);
      }
    } catch (error) {
      console.warn('Nao foi possivel carregar funcoes. Usando lista local.', error);
    }
  }

  function handleTabPress(nextTab: AdminTab) {
    setTab(nextTab);
    onNavigate?.(nextTab);
  }

  function handleDrawerPress(nextTab: AdminTab) {
    setDrawerVisible(false);
    handleTabPress(nextTab);
  }

  function handleLogoutPress() {
    setDrawerVisible(false);
    onLogout?.();
  }

  function handleOpenRegister() {
    setDrawerVisible(false);
    setRegisterVisible(true);
  }

  function handleCloseRegister() {
    setRegisterVisible(false);
    setTab('usuarios');
    loadUsers();
  }

  function openUpdateModal(user: AdminUser) {
    // Setamos o usuario escolhido antes de abrir o modal preenchido.
    setSelectedUser(user);
    setUpdateForm({
      nome: user.name,
      email: user.email,
      morada: user.address,
      datanascimento: formatDateForInput(user.birthDate),
      funcaoId: user.roleId || funcoes.find((funcao) => normalizeText(funcao.label) === normalizeText(user.role))?.id || '',
      status: getStatusValue(user.status),
      passwordHash: '',
    });
    setUpdateVisible(true);
  }

  function closeUpdateModal() {
    setUpdateVisible(false);
    setFuncaoModalVisible(false);
    setSelectedUser(null);
    setUpdatingUser(false);
  }

  function changeUpdateField(field: keyof UpdateUserForm, value: string) {
    setUpdateForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function updateSelectedUser() {
    // A API recebe usuarioId para saber exactamente quem actualizar.
    if (!selectedUser?.id) {
      Alert.alert('Erro', 'Nao foi possivel identificar o usuario selecionado para actualizar.');
      return;
    }

    if (!updateForm.nome.trim() || !updateForm.email.trim()) {
      Alert.alert('Atencao', 'Informe o nome e o email do usuario.');
      return;
    }

    setUpdatingUser(true);

    try {
      const payload: any = {
        usuarioId: selectedUser.id,
        nome: updateForm.nome.trim(),
        email: updateForm.email.trim(),
        morada: updateForm.morada.trim(),
        datanascimento: formatDateForInput(updateForm.datanascimento),
        funcaoId: updateForm.funcaoId,
        status: updateForm.status,
      };

      if (updateForm.passwordHash.trim()) {
        payload.passwordHash = updateForm.passwordHash.trim();
      }

      await api.put(`${UPDATE_USER_PATH}/${selectedUser.id}`, payload);

      Alert.alert('Sucesso', 'Usuario actualizado com sucesso.');
      closeUpdateModal();
      loadUsers();
    } catch (error: any) {
      Alert.alert('Erro', getApiErrorMessage(error, 'Nao foi possivel actualizar o usuario.'));
    } finally {
      setUpdatingUser(false);
    }
  }

  function confirmDeleteUser(user: AdminUser) {
    setSelectedUser(user);

    Alert.alert('Apagar usuario', `Deseja apagar ${user.name}?`, [
      {
        text: 'Cancelar',
        style: 'cancel',
        onPress: () => setSelectedUser(null),
      },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => deleteSelectedUser(user),
      },
    ]);
  }

  async function deleteSelectedUser(userToDelete = selectedUser) {
    if (!userToDelete?.id) {
      Alert.alert('Erro', 'Nao foi possivel identificar o usuario selecionado para apagar.');
      return;
    }

    setDeletingUserId(userToDelete.id);

    try {
      await api.delete(`${DELETE_USER_PATH}/${userToDelete.id}`);
      setUsers((currentUsers) => currentUsers.filter((item) => item.id !== userToDelete.id));
      Alert.alert('Sucesso', 'Usuario apagado com sucesso.');
    } catch (error: any) {
      console.error('deleteUser error:', {
        selectedUserId: userToDelete.id,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      Alert.alert('Erro', getApiErrorMessage(error, 'Nao foi possivel apagar o usuario.'));
    } finally {
      setDeletingUserId('');
      setSelectedUser(null);
    }
  }

  function handlePerfilNavigate(route: PerfilRoute) {
    const nextTab = route === 'home' ? 'inicio' : route;
    handleTabPress(nextTab);
  }

  function getSelectedFuncaoLabel() {
    return funcoes.find((funcao) => funcao.id === updateForm.funcaoId)?.label || selectedUser?.role || 'Selecionar funcao';
  }

  function renderComingSoon(title: string) {
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <View style={styles.brandAvatar}>
            <Text style={styles.brandText}>FM</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => setDrawerVisible(true)}>
            <Icon name="menu-outline" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.emptyCard}>
          <Icon name="construct-outline" size={28} color="#139CA3" />
          <Text style={styles.emptyTitle}>{title}</Text>
          <Text style={styles.emptyText}>Funcionalidade ainda nao disponivel.</Text>
        </View>
      </ScrollView>
    );
  }

  function renderDoctors() {
    const doctors = painelResumo.medicosEmConsulta;

    return (
      <>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Equipe Medica</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleOpenRegister}>
            <Icon name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {loadingPainel && (
          <View style={styles.emptyCard}>
            <ActivityIndicator color="#139CA3" />
            <Text style={styles.emptyText}>A carregar painel...</Text>
          </View>
        )}

        {!!painelError && !loadingPainel && (
          <View style={styles.emptyCard}>
            <Icon name="alert-circle-outline" size={28} color="#C2414B" />
            <Text style={styles.emptyTitle}>Erro</Text>
            <Text style={styles.emptyText}>{painelError}</Text>
            <TouchableOpacity style={styles.addButton} onPress={loadPainelResumo}>
              <Icon name="refresh-outline" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loadingPainel && !painelError && doctors.length === 0 && (
          <View style={styles.emptyCard}>
            <Icon name="medkit-outline" size={28} color="#139CA3" />
            <Text style={styles.emptyTitle}>Sem medicos em consulta</Text>
            <Text style={styles.emptyText}>Hoje ainda nao ha consultas activas para listar.</Text>
          </View>
        )}

        {!loadingPainel && !painelError && doctors.map((doctor) => (
          <View key={doctor.id} style={styles.doctorCard}>
            <View style={styles.doctorIcon}>
              <Icon name="medkit-outline" size={26} color="#139CA3" />
            </View>

            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.doctorMeta}>
                {doctor.specialty} - {doctor.registration}
              </Text>
              <View style={styles.dayRow}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayText}>{doctor.totalConsultasHoje} hoje</Text>
                </View>
              </View>
            </View>

            <View style={styles.doctorActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Icon name="create-outline" size={19} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Icon name="trash-outline" size={18} color="#C2414B" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </>
    );
  }

  function renderConsultas() {
    return (
      <View style={styles.emptyCard}>
        <Icon name="calendar-outline" size={28} color="#139CA3" />
        <Text style={styles.emptyTitle}>Consultas</Text>
        <Text style={styles.emptyText}>As consultas administrativas serao listadas aqui.</Text>
      </View>
    );
  }

  function renderUsuarios() {
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <View style={styles.brandAvatar}>
            <Text style={styles.brandText}>FM</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => setDrawerVisible(true)}>
            <Icon name="menu-outline" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.title}>Usuarios</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleOpenRegister}>
            <Icon name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {loadingUsers && (
          <View style={styles.emptyCard}>
            <ActivityIndicator color="#139CA3" />
            <Text style={styles.emptyText}>A carregar usuarios...</Text>
          </View>
        )}

        {!!usersError && !loadingUsers && (
          <View style={styles.emptyCard}>
            <Icon name="alert-circle-outline" size={28} color="#C2414B" />
            <Text style={styles.emptyTitle}>Erro</Text>
            <Text style={styles.emptyText}>{usersError}</Text>
            <TouchableOpacity style={styles.addButton} onPress={loadUsers}>
              <Icon name="refresh-outline" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loadingUsers && !usersError && users.length === 0 && (
          <View style={styles.emptyCard}>
            <Icon name="people-outline" size={28} color="#139CA3" />
            <Text style={styles.emptyTitle}>Sem usuarios activos</Text>
            <Text style={styles.emptyText}>Ainda nao existem usuarios activos para listar.</Text>
          </View>
        )}

        <View style={styles.userList}>
          {!loadingUsers && !usersError && users.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Icon name="person-outline" size={22} color="#139CA3" />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.userMetaRow}>
                  <View style={styles.userRoleBadge}>
                    <Text style={styles.userRoleText}>{user.role}</Text>
                  </View>
                  <Text style={isInactiveStatus(user.status) ? styles.userStatusInactive : styles.userStatus}>
                    {user.status}
                  </Text>
                </View>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => openUpdateModal(user)}>
                  <Icon name="create-outline" size={19} color="#111827" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteActionButton}
                  onPress={() => confirmDeleteUser(user)}
                  disabled={deletingUserId === user.id}
                >
                  {deletingUserId === user.id ? (
                    <ActivityIndicator size="small" color="#C2414B" />
                  ) : (
                    <Icon name="trash-outline" size={18} color="#C2414B" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  function renderHome() {
    const dashboardStats = getDashboardStats(painelResumo);

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <View style={styles.brandAvatar}>
            <Text style={styles.brandText}>FM</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => setDrawerVisible(true)}>
            <Icon name="menu-outline" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Painel Administrativo</Text>

        {loadingPainel && (
          <View style={styles.emptyCard}>
            <ActivityIndicator color="#139CA3" />
            <Text style={styles.emptyText}>A carregar resumo do painel...</Text>
          </View>
        )}

        {!!painelError && !loadingPainel && (
          <View style={styles.emptyCard}>
            <Icon name="alert-circle-outline" size={28} color="#C2414B" />
            <Text style={styles.emptyTitle}>Erro no painel</Text>
            <Text style={styles.emptyText}>{painelError}</Text>
            <TouchableOpacity style={styles.addButton} onPress={loadPainelResumo}>
              <Icon name="refresh-outline" size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsGrid}>
          {dashboardStats.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: item.backgroundColor }]}>
                <Icon name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentButton, segment === 'medicos' && styles.segmentButtonActive]}
            onPress={() => setSegment('medicos')}
          >
            <Text style={[styles.segmentText, segment === 'medicos' && styles.segmentTextActive]}>Medicos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentButton, segment === 'consultas' && styles.segmentButtonActive]}
            onPress={() => setSegment('consultas')}
          >
            <Text style={[styles.segmentText, segment === 'consultas' && styles.segmentTextActive]}>Consultas</Text>
          </TouchableOpacity>
        </View>

        {segment === 'medicos' ? renderDoctors() : renderConsultas()}
      </ScrollView>
    );
  }

  function renderContent() {
    if (registerVisible) {
      return (
        <RegistarUsuarios
          onBack={handleCloseRegister}
        />
      );
    }

    if (tab === 'inicio') return renderHome();
    if (tab === 'consultas') return renderComingSoon('Consultas');
    if (tab === 'agendar') {
      return (
        <MarcacaoConsulta
          usuarioId={usuarioId}
          usuarioSessao={usuarioSessao}
          onBack={() => handleTabPress('inicio')}
          onOpenConsultas={() => handleTabPress('consultas')}
        />
      );
    }
    if (tab === 'usuarios') return renderUsuarios();
    if (tab === 'avisos') return renderComingSoon('Avisos');
    return (
      <PerfilUsuario
        email={email}
        nome={nome}
        tipoUsuario={tipoUsuario}
        membroDesde={membroDesde}
        onNavigate={handlePerfilNavigate}
        onLogout={onLogout}
      />
    );
  }

  return (
    <View style={styles.page}>
      {renderContent()}

      {!registerVisible && <View style={styles.bottomBar}>
        {bottomTabs.map((item) => {
          const isActive = tab === item.key;

          return (
            <TouchableOpacity
              key={item.key}
              style={isActive ? styles.tabItemActive : styles.tabItem}
              onPress={() => handleTabPress(item.key)}
            >
              <View style={isActive ? styles.tabIconBoxActive : styles.tabIconBox}>
                <Icon
                  name={isActive ? item.activeIcon : item.icon}
                  size={21}
                  color={isActive ? '#FFFFFF' : '#64748B'}
                />
              </View>
              <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>}

      {!registerVisible && <Modal visible={drawerVisible} transparent animationType="fade" onRequestClose={() => setDrawerVisible(false)}>
        <View style={styles.drawerRoot}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerVisible(false)} />

          <View style={styles.drawerPanel}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatar}>
                <Text style={styles.drawerAvatarText}>FM</Text>
              </View>
              <View style={styles.drawerIdentity}>
                <Text style={styles.drawerTitle}>Painel Administrativo</Text>
                <Text style={styles.drawerSubtitle}>Centro Medico Famor</Text>
              </View>
              <TouchableOpacity style={styles.drawerCloseButton} onPress={() => setDrawerVisible(false)}>
                <Icon name="close-outline" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerMenu}>
              {bottomTabs.map((item) => {
                const isActive = tab === item.key;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={isActive ? styles.drawerItemActive : styles.drawerItem}
                    onPress={() => handleDrawerPress(item.key)}
                  >
                    <View style={isActive ? styles.drawerItemIconActive : styles.drawerItemIcon}>
                      <Icon
                        name={isActive ? item.activeIcon : item.icon}
                        size={20}
                        color={isActive ? '#FFFFFF' : '#139CA3'}
                      />
                    </View>
                    <Text style={isActive ? styles.drawerItemTextActive : styles.drawerItemText}>{item.label}</Text>
                    <Icon name="chevron-forward-outline" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.drawerLogoutButton} onPress={handleLogoutPress} disabled={!onLogout}>
              <Icon name="log-out-outline" size={18} color="#C2414B" />
              <Text style={styles.drawerLogoutText}>Terminar Sessao</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>}

      {!registerVisible && <Modal visible={updateVisible} transparent animationType="fade" onRequestClose={closeUpdateModal}>
        <View style={styles.updateModalOverlay}>
          <View style={styles.updateModalCard}>
            <View style={styles.updateModalHeader}>
              <Text style={styles.updateModalTitle}>Actualizar usuario</Text>
              <TouchableOpacity style={styles.updateCloseButton} onPress={closeUpdateModal}>
                <Icon name="close-outline" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.updateField}>
              <Text style={styles.updateLabel}>Nome</Text>
              <TextInput
                style={styles.updateInput}
                value={updateForm.nome}
                onChangeText={(value) => changeUpdateField('nome', value)}
                placeholder="Nome do usuario"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.updateField}>
              <Text style={styles.updateLabel}>Email</Text>
              <TextInput
                style={styles.updateInput}
                value={updateForm.email}
                onChangeText={(value) => changeUpdateField('email', value)}
                placeholder="Email"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.updateField}>
              <Text style={styles.updateLabel}>Morada</Text>
              <TextInput
                style={styles.updateInput}
                value={updateForm.morada}
                onChangeText={(value) => changeUpdateField('morada', value)}
                placeholder="Morada"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.updateField}>
              <Text style={styles.updateLabel}>Data de nascimento</Text>
              <TextInput
                style={styles.updateInput}
                value={updateForm.datanascimento}
                onChangeText={(value) => changeUpdateField('datanascimento', value)}
                placeholder="AAAA-MM-DD"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.updateField}>
              <Text style={styles.updateLabel}>Funcao</Text>
              <TouchableOpacity style={styles.updateSelectButton} onPress={() => setFuncaoModalVisible(true)}>
                <Text style={styles.updateSelectText}>{getSelectedFuncaoLabel()}</Text>
                <Icon name="chevron-down-outline" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.updateField}>
              <Text style={styles.updateLabel}>Estado</Text>
              <View style={styles.statusOptions}>
                {STATUS_OPTIONS.map((status) => {
                  const isActive = updateForm.status === status;

                  return (
                    <TouchableOpacity
                      key={status}
                      style={isActive ? styles.statusOptionActive : styles.statusOption}
                      onPress={() => changeUpdateField('status', status)}
                    >
                      <Text style={isActive ? styles.statusOptionTextActive : styles.statusOptionText}>{status}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.updateField}>
              <Text style={styles.updateLabel}>Senha</Text>
              <TextInput
                style={styles.updateInput}
                value={updateForm.passwordHash}
                onChangeText={(value) => changeUpdateField('passwordHash', value)}
                placeholder="Preencha apenas se quiser alterar"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.updateActions}>
              <TouchableOpacity style={styles.updateCancelButton} onPress={closeUpdateModal} disabled={updatingUser}>
                <Text style={styles.updateCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.updateSaveButton} onPress={updateSelectedUser} disabled={updatingUser}>
                {updatingUser ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.updateSaveText}>Actualizar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>}

      {!registerVisible && <Modal visible={funcaoModalVisible} transparent animationType="fade" onRequestClose={() => setFuncaoModalVisible(false)}>
        <View style={styles.funcaoModalOverlay}>
          <View style={styles.funcaoModalCard}>
            <Text style={styles.funcaoModalTitle}>Selecionar funcao</Text>

            {funcoes.map((funcao) => {
              const isActive = updateForm.funcaoId === funcao.id;

              return (
                <TouchableOpacity
                  key={funcao.id}
                  style={isActive ? styles.funcaoOptionActive : styles.funcaoOption}
                  onPress={() => {
                    changeUpdateField('funcaoId', funcao.id);
                    setFuncaoModalVisible(false);
                  }}
                >
                  <Text style={isActive ? styles.funcaoOptionTextActive : styles.funcaoOptionText}>{funcao.label}</Text>
                  {isActive && <Icon name="checkmark-circle" size={20} color="#139CA3" />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.funcaoCancelButton} onPress={() => setFuncaoModalVisible(false)}>
              <Text style={styles.funcaoCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>}
    </View>
  );
}

