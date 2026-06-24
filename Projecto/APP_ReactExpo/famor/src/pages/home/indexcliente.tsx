import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import styles from './styles';
import { api } from '../../service/api';
import MarcacaoConsulta from '../marcacao/indexmarcacao';
import MinhasConsultas from '../marcacao/minhasconsultas';
import Especialidades from './especialidades';
import Historicos from './historicos';
import PerfilUsuario from './perfilusuario';
import {
  firstStringValue,
  getListPayload,
  getSessionUsuarioId,
  normalizeSpecialtyLookup,
  resolveSpecialtyName,
  SpecialtyLookup,
} from '../marcacao/marcacaoUtils';

interface HomeClientProps {
  email: string;
  usuarioId?: string;
  usuarioSessao?: any;
  onLogout?: () => void;
}

type HomeTab = 'home' | 'agendar' | 'consultas' | 'especialidades' | 'historicos' | 'avisos' | 'perfil';

type LatestAppointment = {
  id: string;
  doctor: string;
  specialty: string;
  status: string;
  dateText: string;
  timeText: string;
  sortDate: number;
};

const bottomTabs: Array<{
  key: HomeTab;
  label: string;
  icon: string;
  activeIcon: string;
}> = [
  { key: 'home', label: 'Inicio', icon: 'home-outline', activeIcon: 'home' },
  { key: 'agendar', label: 'Agendar', icon: 'calendar-outline', activeIcon: 'calendar' },
  { key: 'consultas', label: 'Consultas', icon: 'calendar-outline', activeIcon: 'calendar' },
  { key: 'avisos', label: 'Avisos', icon: 'notifications-outline', activeIcon: 'notifications' },
  { key: 'perfil', label: 'Perfil', icon: 'person-outline', activeIcon: 'person' },
];

const quickActions: Array<{
  key: HomeTab;
  title: string;
  subtitle: string;
  icon: string;
}> = [
  { key: 'agendar', title: 'Agendar Consulta', subtitle: 'Marcar nova consulta', icon: 'calendar-number-outline' },
  { key: 'consultas', title: 'Minhas Consultas', subtitle: 'Ver agendamentos', icon: 'medical-outline' },
  { key: 'especialidades', title: 'Especialidades', subtitle: 'Explorar medicos', icon: 'fitness-outline' },
  { key: 'historicos', title: 'Historico', subtitle: 'Consultas anteriores', icon: 'time-outline' },
];

const TODAY_APPOINTMENT_PATH = '/marcacaoultima';

function getSessionUserParams(activeUsuarioId: string) {
  if (!activeUsuarioId) {
    return undefined;
  }

  return {
    usuarioId: activeUsuarioId,
    idUsuario: activeUsuarioId,
    pacienteId: activeUsuarioId,
  };
}

function getGreetingByPeriod() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      text: 'Bom dia,',
      icon: 'sunny-outline',
      color: '#F59E0B',
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      text: 'Boa tarde,',
      icon: 'partly-sunny-outline',
      color: '#EA580C',
    };
  }

  return {
    text: 'Boa noite,',
    icon: 'moon-outline',
    color: '#4F46E5',
  };
}

function getAppointmentDate(item: any) {
  const agenda = item?.agendaMedica || item?.agendaMedicaId || item?.agenda || {};

  return firstStringValue(
    item?.Data,
    item?.DataConsulta,
    item?.DataConsultas,
    item?.data,
    item?.dataConsulta,
    item?.data_consulta,
    item?.dataMarcacao,
    item?.dataConsultas,
    agenda?.dataConsultas,
    agenda?.data_consultas,
    agenda?.data,
  );
}

function getAppointmentTime(item: any) {
  const agenda = item?.agendaMedica || item?.agendaMedicaId || item?.agenda || {};

  return firstStringValue(
    item?.Horario,
    item?.Hora,
    item?.HoraConsulta,
    item?.horario,
    item?.hora,
    item?.horaConsulta,
    item?.hora_consulta,
    item?.time,
    agenda?.horaInicio,
    agenda?.hora_inicio,
    agenda?.inicio,
  );
}

function getAppointmentSortDate(item: any) {
  const rawDate = getAppointmentDate(item);
  const rawTime = getAppointmentTime(item);
  const date = new Date(rawTime && !rawDate.includes('T') ? `${rawDate}T${rawTime}` : rawDate);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatAppointmentDate(item: any) {
  const rawDate = getAppointmentDate(item);
  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return firstStringValue(rawDate, '-');
  }

  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const day = String(date.getDate()).padStart(2, '0');

  return `${day} ${months[date.getMonth()]}`;
}

function formatAppointmentTime(item: any) {
  const rawDate = getAppointmentDate(item);
  const rawTime = getAppointmentTime(item);
  const date = new Date(rawDate);

  if (rawTime) {
    return rawTime.slice(0, 5);
  }

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getLatestAppointmentPayload(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const directPayload = firstStringValue(data?._id, data?.id, data?.marcacaoId) ? data : null;
  if (directPayload) {
    return directPayload;
  }

  return (
    data?.ultimaMarcacao ||
    data?.marcacaoUltima ||
    data?.MarcacaoUltima ||
    data?.ultimaConsulta ||
    data?.consultaUltima ||
    data?.ConsultaUltima ||
    data?.latestAppointment ||
    data?.lastAppointment ||
    data?.marcacao ||
    data?.agendamento ||
    data?.consulta ||
    getLatestAppointmentPayload(data?.data) ||
    getLatestAppointmentPayload(data?.dados) ||
    getLatestAppointmentPayload(data?.resultado) ||
    getLatestAppointmentPayload(data?.result) ||
    data
  );
}

function getLatestScheduledAppointment(data: any, specialtyById: SpecialtyLookup) {
  const payload = getLatestAppointmentPayload(data);
  const items = getListPayload(payload, ['marcacoes', 'consultas']);
  const appointmentItems = items.length ? items : payload && typeof payload === 'object' ? [payload] : [];

  const appointments = appointmentItems
    .map((item: any, index: number) => {
      const medico = item?.medico || item?.medicoId || item?.doctor || item?.profissional || {};

      return {
        id: firstStringValue(item?._id, item?.id, item?.marcacaoId, `${index}`),
        doctor: firstStringValue(
          item?.Medico,
          item?.medico,
          medico?.nome,
          medico?.name,
          item?.nomeMedico,
          item?.medicoNome,
          item?.doctorName,
          'Medico',
        ),
        specialty: firstStringValue(item?.Especialidade, item?.especialidade) || resolveSpecialtyName(item, specialtyById),
        status: firstStringValue(item?.status, item?.estado, item?.situacao, 'agendada').toLowerCase(),
        dateText: formatAppointmentDate(item),
        timeText: formatAppointmentTime(item),
        sortDate: getAppointmentSortDate(item),
      };
    })
    .filter((item: LatestAppointment) => item.id);

  // A mais recente fica em primeiro; se tiver duas no mesmo dia, a hora decide.
  return appointments.sort((left: LatestAppointment, right: LatestAppointment) => right.sortDate - left.sortDate)[0] || null;
}

export default function HomeClient({ email, usuarioId, usuarioSessao, onLogout }: HomeClientProps) {
  const [tab, setTab] = useState<HomeTab>('home');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingMarcacaoId, setEditingMarcacaoId] = useState('');
  const [latestAppointment, setLatestAppointment] = useState<LatestAppointment | null>(null);
  const [loadingLatestAppointment, setLoadingLatestAppointment] = useState(false);
  const activeUsuarioId = usuarioId || getSessionUsuarioId(usuarioSessao);
  const userName = email?.split('@')[0] || 'Usuario';
  const greeting = getGreetingByPeriod();

  useEffect(() => {
    if (tab === 'home') {
      loadLatestAppointment();
    }
  }, [activeUsuarioId, tab]);

  async function loadLatestAppointment() {
    setLoadingLatestAppointment(true);

    try {
      const response = await api.get(TODAY_APPOINTMENT_PATH, {
        params: getSessionUserParams(activeUsuarioId),
      });

      let specialtyById: SpecialtyLookup = {};
      try {
        const specialtiesResponse = await api.get('/especialidade/nomes');
        specialtyById = normalizeSpecialtyLookup(specialtiesResponse.data);
      } catch (error) {
        console.warn('Nao foi possivel carregar nomes das especialidades na home:', error);
      }

      setLatestAppointment(getLatestScheduledAppointment(response.data, specialtyById));
    } catch (error) {
      console.warn('Nao foi possivel carregar a ultima consulta agendada:', error);
      setLatestAppointment(null);
    } finally {
      setLoadingLatestAppointment(false);
    }
  }

  function openEditMarcacao(marcacaoId: string) {
    setEditingMarcacaoId(marcacaoId);
    setTab('agendar');
  }

  function openTab(nextTab: HomeTab) {
    setDrawerVisible(false);
    setEditingMarcacaoId('');
    setTab(nextTab);
  }

  function handleLogoutPress() {
    setDrawerVisible(false);
    onLogout?.();
  }

  function renderComingSoon(title: string) {
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>Em breve</Text>
            <View style={styles.headerIcon}>
              <Icon name="construct-outline" size={24} color="#2563EB" />
            </View>
          </View>
          <Text style={styles.name}>{title}</Text>
          <Text style={styles.location}>Funcionalidade ainda nao disponivel.</Text>
        </View>
      </ScrollView>
    );
  }

  function renderContent() {
    switch (tab) {
      case 'agendar':
        return (
          <MarcacaoConsulta
            usuarioId={activeUsuarioId}
            usuarioSessao={usuarioSessao}
            marcacaoId={editingMarcacaoId}
            onBack={() => setTab('home')}
            onOpenConsultas={() => setTab('consultas')}
          />
        );
      case 'consultas':
        return (
          <MinhasConsultas
            usuarioId={activeUsuarioId}
            usuarioSessao={usuarioSessao}
            onEditConsulta={openEditMarcacao}
            onMenuPress={() => setDrawerVisible(true)}
          />
        );
      case 'especialidades':
        return <Especialidades onBack={() => setTab('home')} />;
      case 'historicos':
        return <Historicos onBack={() => setTab('home')} />;
      case 'avisos':
        return renderComingSoon('Avisos');
      case 'perfil':
        return <PerfilUsuario email={email} nome={userName} onNavigate={setTab} onLogout={onLogout} />;
      default:
        return (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            <View style={styles.headerCard}>
              <View style={styles.greetingRow}>
                <Text style={styles.greeting}>{greeting.text}</Text>
                <View style={styles.headerIcon}>
                  <Icon name={greeting.icon} size={28} color={greeting.color} />
                </View>
              </View>
              <Text style={styles.name}>{userName}</Text>
              <Text style={styles.location}>Centro Medico Famor - Boa Esperanca, Calemba II, Luanda-Angola</Text>
            </View>

            <View style={styles.actionGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity key={action.key} style={styles.actionCard} onPress={() => openTab(action.key)}>
                  <View style={styles.actionIcon}>
                    <Icon name={action.icon} size={24} color="#2563EB" />
                  </View>
                  <Text style={styles.actionLabel}>{action.title}</Text>
                  <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Consultas de Hoje</Text>
              <TouchableOpacity style={styles.sectionLinkButton} onPress={() => openTab('consultas')}>
                <Text style={styles.sectionLink}>Ver todas</Text>
                <Icon name="chevron-forward" size={16} color="#2563EB" />
              </TouchableOpacity>
            </View>

            <View style={styles.appointmentCard}>
              {loadingLatestAppointment ? (
                <View style={styles.appointmentLoadingRow}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.appointmentSpecialty}>A carregar consulta...</Text>
                </View>
              ) : latestAppointment ? (
                <>
                  <View style={styles.appointmentHeader}>
                    <View style={styles.avatar}>
                      <Icon name="person-outline" size={24} color="#0C4A6E" />
                    </View>
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.appointmentDoctor}>{latestAppointment.doctor}</Text>
                      <Text style={styles.appointmentSpecialty}>{latestAppointment.specialty}</Text>
                    </View>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{latestAppointment.status}</Text>
                    </View>
                  </View>
                  <View style={styles.appointmentMeta}>
                    <View style={styles.dateRow}>
                      <Icon name="calendar-outline" size={15} color="#475569" />
                      <Text style={styles.dateText}>{latestAppointment.dateText}</Text>
                    </View>
                    <View style={styles.dateRow}>
                      <Icon name="time-outline" size={15} color="#475569" />
                      <Text style={styles.dateText}>{latestAppointment.timeText}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.appointmentHeader}>
                  <View style={styles.avatar}>
                    <Icon name="calendar-outline" size={24} color="#0C4A6E" />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentDoctor}>Sem consulta agendada para hoje</Text>
                    <Text style={styles.appointmentSpecialty}>Quando tiver consulta hoje, ela aparece aqui.</Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        );
    }
  }

  return (
    <View style={styles.page}>
      {renderContent()}
      <View style={styles.bottomBar}>
        {bottomTabs.map((item) => {
          const isActive = tab === item.key;

          return (
            <TouchableOpacity
              key={item.key}
              style={isActive ? styles.tabItemActive : styles.tabItem}
              onPress={() => openTab(item.key)}
            >
              <Icon
                name={isActive ? item.activeIcon : item.icon}
                size={22}
                color={isActive ? '#2563EB' : '#64748B'}
              />
              <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal visible={drawerVisible} transparent animationType="fade" onRequestClose={() => setDrawerVisible(false)}>
        <View style={styles.perfilDrawerRoot}>
          <Pressable style={styles.perfilDrawerBackdrop} onPress={() => setDrawerVisible(false)} />
          <View style={styles.perfilDrawerPanel}>
            <View style={styles.perfilDrawerHeader}>
              <View style={styles.perfilDrawerAvatar}>
                <Text style={styles.perfilDrawerAvatarText}>FM</Text>
              </View>
              <View style={styles.perfilDrawerIdentity}>
                <Text style={styles.perfilDrawerName}>{userName}</Text>
                <Text style={styles.perfilDrawerEmail}>{email}</Text>
              </View>
              <TouchableOpacity style={styles.perfilDrawerCloseButton} onPress={() => setDrawerVisible(false)}>
                <Icon name="close-outline" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.perfilDrawerMenu}>
              {bottomTabs.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.perfilDrawerItem}
                  onPress={() => openTab(item.key)}
                >
                  <View style={styles.perfilDrawerItemIcon}>
                    <Icon name={tab === item.key ? item.activeIcon : item.icon} size={20} color="#139CA3" />
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
