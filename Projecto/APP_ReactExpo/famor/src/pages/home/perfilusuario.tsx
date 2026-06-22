import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../../service/api';
import { getApiErrorMessage } from '../../service/apiResponse';
import { getUsuarioPerfil, UsuarioPerfil } from '../../service/usuarioPerfilAPI';
import styles from './styles';

type PerfilDrawerRoute = 'home' | 'agendar' | 'consultas' | 'avisos' | 'perfil';

interface PerfilUsuarioProps {
  email: string;
  nome?: string;
  tipoUsuario?: string;
  membroDesde?: string;
  totalConsultas?: number;
  consultasConcluidas?: number;
  consultasCanceladas?: number;
  onNavigate?: (route: PerfilDrawerRoute) => void;
  onLogout?: () => void;
}

interface ConsultaTotais {
  totalConsultas: number;
  concluidas: number;
  canceladas: number;
}

const drawerItems: Array<{
  label: string;
  icon: string;
  route: PerfilDrawerRoute;
}> = [
  { label: 'Inicio', icon: 'home-outline', route: 'home' },
  { label: 'Agendar', icon: 'calendar-outline', route: 'agendar' },
  { label: 'Consultas', icon: 'clipboard-outline', route: 'consultas' },
  { label: 'Avisos', icon: 'notifications-outline', route: 'avisos' },
  { label: 'Perfil', icon: 'person-outline', route: 'perfil' },
];

function numberValue(...values: unknown[]) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }

  return 0;
}

function normalizeConsultaTotais(data: any): ConsultaTotais {
  const payload = data?.data || data?.dados || data?.totais || data || {};

  return {
    totalConsultas: numberValue(payload?.TotalConsultas, payload?.totalConsultas, payload?.Total, payload?.total),
    concluidas: numberValue(payload?.Concluidas, payload?.concluidas, payload?.consultasConcluidas),
    canceladas: numberValue(payload?.Canceladas, payload?.canceladas, payload?.consultasCanceladas),
  };
}

function getDisplayName(email: string, nome?: string) {
  if (nome?.trim()) return nome.trim();

  const emailName = email?.split('@')[0] || 'O Paciente';
  return emailName
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value?: string) {
  if (!value?.trim()) return 'Nao informado';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default function PerfilUsuario({
  email,
  nome,
  tipoUsuario = 'Administrador',
  membroDesde = '03 de junho de 2026',
  totalConsultas = 0,
  consultasConcluidas = 0,
  consultasCanceladas = 0,
  onNavigate,
  onLogout,
}: PerfilUsuarioProps) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [consultaTotais, setConsultaTotais] = useState<ConsultaTotais>({
    totalConsultas,
    concluidas: consultasConcluidas,
    canceladas: consultasCanceladas,
  });
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [perfilError, setPerfilError] = useState('');
  const [totaisError, setTotaisError] = useState('');
  const perfilEmail = perfil?.email || email;
  const displayName = getDisplayName(perfilEmail, perfil?.nome || nome);
  const displayFuncao = perfil?.funcao || tipoUsuario;
  const displayMorada = perfil?.morada || 'Nao informado';
  const displayDataRegisto = formatDate(perfil?.dataRegisto || membroDesde);
  const displayTotalConsultas = consultaTotais.totalConsultas;
  const displayConsultasConcluidas = consultaTotais.concluidas;
  const displayConsultasCanceladas = consultaTotais.canceladas;

  useEffect(() => {
    let mounted = true;

    async function loadPerfil() {
      setLoadingPerfil(true);
      setPerfilError('');

      try {
        const data = await getUsuarioPerfil();
        if (mounted) {
          setPerfil(data);
        }
      } catch (error: any) {
        if (mounted) {
          setPerfilError(error?.message || 'Nao foi possivel carregar o perfil do usuario.');
        }
      } finally {
        if (mounted) {
          setLoadingPerfil(false);
        }
      }
    }

    loadPerfil();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadConsultaTotais() {
      setTotaisError('');

      try {
        const response = await api.get('/consultastotas');
        if (mounted) {
          setConsultaTotais(normalizeConsultaTotais(response.data));
        }
      } catch (error: any) {
        if (mounted) {
          setTotaisError(getApiErrorMessage(error, 'Nao foi possivel carregar os totais das consultas.'));
        }
      }
    }

    loadConsultaTotais();

    return () => {
      mounted = false;
    };
  }, [totalConsultas, consultasConcluidas, consultasCanceladas]);

  function handleDrawerNavigate(route: PerfilDrawerRoute) {
    setDrawerVisible(false);
    onNavigate?.(route);
  }

  function handleLogoutPress() {
    setDrawerVisible(false);
    onLogout?.();
  }

  return (
    <View style={styles.perfilScreen}>
      <ScrollView style={styles.perfilScrollView} contentContainerStyle={styles.perfilContent}>
        <View style={styles.perfilTopBar}>
          <View style={styles.perfilBrandAvatar}>
            <Text style={styles.perfilBrandText}>FM</Text>
          </View>
          <TouchableOpacity style={styles.perfilMenuButton} onPress={() => setDrawerVisible(true)}>
            <Icon name="menu-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.perfilProfileHeader}>
          <View style={styles.perfilProfileIcon}>
            <Icon name="person-outline" size={44} color="#139CA3" />
          </View>
          <Text style={styles.perfilName}>{displayName}</Text>
          <View style={styles.perfilEmailRow}>
            <Icon name="mail-outline" size={14} color="#6B7280" />
            <Text style={styles.perfilEmail}>{perfilEmail}</Text>
          </View>
          <View style={styles.perfilRoleBadge}>
            <Icon name="shield-checkmark-outline" size={13} color="#139CA3" />
            <Text style={styles.perfilRoleText}>{displayFuncao}</Text>
          </View>
        </View>

        <View style={styles.perfilStatsRow}>
          <View style={styles.perfilStatCard}>
            <Text style={styles.perfilStatNumber}>{displayTotalConsultas}</Text>
            <Text style={styles.perfilStatLabel}>Total</Text>
          </View>
          <View style={styles.perfilStatCard}>
            <Text style={[styles.perfilStatNumber, styles.perfilStatSuccess]}>{displayConsultasConcluidas}</Text>
            <Text style={styles.perfilStatLabel}>Concluidas</Text>
          </View>
          <View style={styles.perfilStatCard}>
            <Text style={[styles.perfilStatNumber, styles.perfilStatDanger]}>{displayConsultasCanceladas}</Text>
            <Text style={styles.perfilStatLabel}>Canceladas</Text>
          </View>
        </View>

        {!!totaisError && (
          <View style={styles.perfilTotalsInfoBox}>
            <Text style={styles.perfilTotalsInfoText}>{totaisError}</Text>
          </View>
        )}

        <View style={styles.perfilInfoCard}>
          <View style={styles.perfilSectionHeader}>
            <Text style={styles.perfilSectionTitle}>Informacões</Text>
            {loadingPerfil && <ActivityIndicator size="small" color="#139CA3" />}
          </View>

          {!!perfilError && (
            <View style={styles.perfilErrorBox}>
              <Icon name="alert-circle-outline" size={18} color="#C2414B" />
              <Text style={styles.perfilErrorText}>{perfilError}</Text>
            </View>
          )}

          <View style={styles.perfilInfoItem}>
            <View style={styles.perfilInfoIcon}>
              <Icon name="person-outline" size={19} color="#6B7280" />
            </View>
            <View style={styles.perfilInfoTextGroup}>
              <Text style={styles.perfilInfoLabel}>Nome</Text>
              <Text style={styles.perfilInfoValue}>{displayName}</Text>
            </View>
          </View>

          <View style={styles.perfilInfoItem}>
            <View style={styles.perfilInfoIcon}>
              <Icon name="mail-outline" size={19} color="#6B7280" />
            </View>
            <View style={styles.perfilInfoTextGroup}>
              <Text style={styles.perfilInfoLabel}>Email</Text>
              <Text style={styles.perfilInfoValue}>{perfilEmail}</Text>
            </View>
          </View>

          <View style={styles.perfilInfoItem}>
            <View style={styles.perfilInfoIcon}>
              <Icon name="location-outline" size={19} color="#6B7280" />
            </View>
            <View style={styles.perfilInfoTextGroup}>
              <Text style={styles.perfilInfoLabel}>Morada</Text>
              <Text style={styles.perfilInfoValue}>{displayMorada}</Text>
            </View>
          </View>

          <View style={styles.perfilInfoItem}>
            <View style={styles.perfilInfoIcon}>
              <Icon name="briefcase-outline" size={19} color="#6B7280" />
            </View>
            <View style={styles.perfilInfoTextGroup}>
              <Text style={styles.perfilInfoLabel}>Funcao</Text>
              <Text style={styles.perfilInfoValue}>{displayFuncao}</Text>
            </View>
          </View>

          <View style={styles.perfilInfoItem}>
            <View style={styles.perfilInfoIcon}>
              <Icon name="calendar-outline" size={19} color="#6B7280" />
            </View>
            <View style={styles.perfilInfoTextGroup}>
              <Text style={styles.perfilInfoLabel}>Data de registo</Text>
              <Text style={styles.perfilInfoValue}>{displayDataRegisto}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.perfilLogoutButton} onPress={onLogout} disabled={!onLogout}>
          <Icon name="log-out-outline" size={18} color="#C2414B" />
          <Text style={styles.perfilLogoutText}>Terminar Sessao</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={drawerVisible} transparent animationType="fade" onRequestClose={() => setDrawerVisible(false)}>
        <View style={styles.perfilDrawerRoot}>
          <Pressable style={styles.perfilDrawerBackdrop} onPress={() => setDrawerVisible(false)} />
          <View style={styles.perfilDrawerPanel}>
            <View style={styles.perfilDrawerHeader}>
              <View style={styles.perfilDrawerAvatar}>
                <Text style={styles.perfilDrawerAvatarText}>FM</Text>
              </View>
              <View style={styles.perfilDrawerIdentity}>
                <Text style={styles.perfilDrawerName}>{displayName}</Text>
                <Text style={styles.perfilDrawerEmail}>{perfilEmail}</Text>
              </View>
              <TouchableOpacity style={styles.perfilDrawerCloseButton} onPress={() => setDrawerVisible(false)}>
                <Icon name="close-outline" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.perfilDrawerMenu}>
              {drawerItems.map((item) => (
                <TouchableOpacity
                  key={item.route}
                  style={styles.perfilDrawerItem}
                  onPress={() => handleDrawerNavigate(item.route)}
                >
                  <View style={styles.perfilDrawerItemIcon}>
                    <Icon name={item.icon} size={20} color="#139CA3" />
                  </View>
                  <Text style={styles.perfilDrawerItemText}>{item.label}</Text>
                  <Icon name="chevron-forward-outline" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.perfilDrawerLogoutButton} onPress={handleLogoutPress} disabled={!onLogout}>
              <Icon name="log-out-outline" size={18} color="#C2414B" />
              <Text style={styles.perfilDrawerLogoutText}>Terminar Sessao</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
