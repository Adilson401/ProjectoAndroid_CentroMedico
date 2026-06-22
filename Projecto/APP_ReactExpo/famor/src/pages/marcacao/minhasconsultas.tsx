import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../../service/api';
import { getApiErrorMessage, getApiSuccessMessage } from '../../service/apiResponse';
import {
  firstStringValue,
  getConsultationUsuarioId,
  getListPayload,
  getSessionUsuarioId,
  normalizeSpecialtyLookup,
  normalizeText,
  resolveSpecialtyName,
  SpecialtyLookup,
} from './marcacaoUtils';
import styles from './stylemarcacao';

interface MinhasConsultasProps {
  usuarioId?: string;
  usuarioSessao?: any;
  onEditConsulta?: (marcacaoId: string) => void;
  onMenuPress?: () => void;
}

type Consultation = {
  id: string;
  doctor: string;
  specialty: string;
  status: string;
  date: string;
  time: string;
  confirmationCode: string;
  observation: string;
};

const STATUS_FILTERS = [
  { label: 'Todas', value: 'todas' },
  { label: 'Agendado', value: 'agendado' },
  { label: 'Aberto', value: 'aberto' },
  { label: 'Em curso', value: 'em curso' },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Fechada', value: 'fechada' },
  { label: 'Canceladas', value: 'cancelado' },
];

export default function MinhasConsultas({ usuarioId, usuarioSessao, onEditConsulta, onMenuPress }: MinhasConsultasProps) {
  const activeUsuarioId = usuarioId || getSessionUsuarioId(usuarioSessao);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);
  const [consultationsError, setConsultationsError] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');
  const [cancelingConsultationId, setCancelingConsultationId] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('todas');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const selectedStatusLabel = STATUS_FILTERS.find((filter) => filter.value === selectedStatusFilter)?.label || 'Todas';
  const filteredConsultations = useMemo(
    () => filterConsultationsByStatus(consultations, selectedStatusFilter),
    [consultations, selectedStatusFilter],
  );

  useEffect(() => {
    loadConsultations();
  }, [activeUsuarioId]);

  async function loadConsultations() {
    setLoadingConsultations(true);
    setConsultationsError('');
    setCancelError('');
    setCancelSuccess('');

    try {
      const response = await api.get('/marcacaofeitas', {
        params: activeUsuarioId ? { usuarioId: activeUsuarioId } : undefined,
      });

      let specialtyById: Record<string, string> = {};
      try {
        const specialtiesResponse = await api.get('/especialidade/nomes');
        specialtyById = normalizeSpecialtyLookup(specialtiesResponse.data);
      } catch (specialtiesError) {
        console.warn('Nao foi possivel carregar nomes das especialidades:', specialtiesError);
      }

      setConsultations(normalizeConsultations(response.data, activeUsuarioId, specialtyById));
    } catch (error: any) {
      setConsultationsError(getApiErrorMessage(error, 'Nao foi possivel carregar as consultas.'));
    } finally {
      setLoadingConsultations(false);
    }
  }

  async function cancelConsultation(id: string) {
    setCancelingConsultationId(id);
    setCancelError('');
    setCancelSuccess('');

    try {
      const response = await api.put(`/marcacaofeitasestado/${id}`, {
        estado: 'Cancelado',
      });

      setConsultations((currentConsultations) =>
        currentConsultations.map((consultation) =>
          consultation.id === id ? { ...consultation, status: 'cancelado' } : consultation,
        ),
      );
      setCancelSuccess(getApiSuccessMessage(response.data, 'Consulta cancelada com sucesso.'));
    } catch (error: any) {
      setCancelError(getApiErrorMessage(error, 'Nao foi possivel cancelar a consulta.'));
    } finally {
      setCancelingConsultationId('');
    }
  }

  function renderConsultationCard(consultation: Consultation) {
    const isCanceled = isCanceledStatus(consultation.status);
    const isCanceling = cancelingConsultationId === consultation.id;

    return (
      <View key={consultation.id} style={styles.consultationCard}>
        <View style={styles.consultationCardHeader}>
          <View style={styles.consultationAvatar}>
            <Icon name="person-outline" size={26} color="#159CA3" />
          </View>
          <View style={styles.consultationHeaderInfo}>
            <Text style={styles.consultationDoctorName}>{consultation.doctor}</Text>
            <Text style={styles.consultationSpecialty}>{consultation.specialty}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusBadgeStyle(consultation.status)]}>
            <Text style={[styles.statusText, getStatusTextStyle(consultation.status)]}>{consultation.status}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.metaText}>{consultation.date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.metaText}>{consultation.time}</Text>
          </View>
        </View>

        <View style={styles.consultationCodeBox}>
          <Icon name="qr-code-outline" size={28} color="#159CA3" />
          <View>
            <Text style={styles.consultationCodeLabel}>Codigo de Confirmacao</Text>
            <Text style={styles.consultationCodeText}>{consultation.confirmationCode || '-'}</Text>
          </View>
        </View>

        {!!consultation.observation ? <Text style={styles.consultationObservation}>"{consultation.observation}"</Text> : null}

        <View style={styles.consultationActionRow}>
          <TouchableOpacity
            style={styles.consultationEditButton}
            onPress={() => onEditConsulta?.(consultation.id)}
            activeOpacity={0.75}
          >
            <Icon name="create-outline" size={18} color="#159CA3" />
            <Text style={styles.consultationEditText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.consultationCancelButton}
            onPress={() => cancelConsultation(consultation.id)}
            disabled={isCanceling || isCanceled}
            activeOpacity={0.75}
          >
            {isCanceling ? (
              <ActivityIndicator size="small" color="#D1435B" />
            ) : (
              <Icon name="close-outline" size={19} color="#D1435B" />
            )}
            <Text style={styles.consultationCancelText}>Cancelar consulta</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderStatusFilter() {
    return (
      <View style={styles.filterBlock}>
        <Text style={styles.filterLabel}>Filtrar por estado</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowStatusFilter((currentValue) => !currentValue)}
          activeOpacity={0.75}
        >
          <Text style={styles.filterButtonText}>{selectedStatusLabel}</Text>
          <Icon name={showStatusFilter ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color="#159CA3" />
        </TouchableOpacity>

        {showStatusFilter ? (
          <View style={styles.filterDropdown}>
            {STATUS_FILTERS.map((filter) => {
              const isSelected = selectedStatusFilter === filter.value;

              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[styles.filterOption, isSelected && styles.filterOptionSelected]}
                  onPress={() => {
                    setSelectedStatusFilter(filter.value);
                    setShowStatusFilter(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextSelected]}>
                    {filter.label}
                  </Text>
                  {isSelected ? <Icon name="checkmark-outline" size={17} color="#159CA3" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>FM</Text>
        </View>
        <TouchableOpacity style={styles.menuButton} onPress={onMenuPress} activeOpacity={0.75}>
          <Icon name="menu-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Minhas Consultas</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadConsultations}
            disabled={loadingConsultations}
            activeOpacity={0.75}
          >
            <Icon name="refresh-outline" size={21} color={loadingConsultations ? '#9CA3AF' : '#159CA3'} />
          </TouchableOpacity>
        </View>

        {renderStatusFilter()}

        {loadingConsultations ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator color="#159CA3" />
            <Text style={styles.feedbackText}>A carregar consultas...</Text>
          </View>
        ) : null}

        {!!consultationsError && !loadingConsultations ? (
          <View style={styles.feedbackCard}>
            <Icon name="alert-circle-outline" size={24} color="#C2414B" />
            <Text style={styles.feedbackTitle}>Nao foi possivel carregar</Text>
            <Text style={styles.feedbackText}>{consultationsError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadConsultations}>
              <Icon name="refresh-outline" size={17} color="#159CA3" />
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!!cancelError && !loadingConsultations ? (
          <View style={styles.inlineError}>
            <Icon name="alert-circle-outline" size={17} color="#C2414B" />
            <Text style={styles.inlineErrorText}>{cancelError}</Text>
          </View>
        ) : null}

        {!!cancelSuccess && !loadingConsultations ? (
          <View style={styles.inlineSuccess}>
            <Icon name="checkmark-circle-outline" size={17} color="#159CA3" />
            <Text style={styles.inlineSuccessText}>{cancelSuccess}</Text>
          </View>
        ) : null}

        {!loadingConsultations && !consultationsError && consultations.length === 0 ? (
          <View style={styles.feedbackCard}>
            <Icon name="calendar-outline" size={24} color="#159CA3" />
            <Text style={styles.feedbackTitle}>Sem consultas</Text>
            <Text style={styles.feedbackText}>Ainda nao existem consultas marcadas.</Text>
          </View>
        ) : null}

        {!loadingConsultations && !consultationsError && consultations.length > 0 && filteredConsultations.length === 0 ? (
          <View style={styles.feedbackCard}>
            <Icon name="filter-outline" size={24} color="#159CA3" />
            <Text style={styles.feedbackTitle}>Sem resultado neste filtro</Text>
            <Text style={styles.feedbackText}>Nao ha consultas com o estado selecionado.</Text>
          </View>
        ) : null}

        {filteredConsultations.map(renderConsultationCard)}

      </ScrollView>
    </View>
  );
}

function isCanceledStatus(status: string) {
  return ['cancelado', 'cancelada', 'canceladas'].includes(normalizeText(status));
}

function normalizeStatusFilter(status: string) {
  const normalized = normalizeText(status);

  if (['cancelado', 'cancelada', 'canceladas'].includes(normalized)) return 'cancelado';
  if (['fechado', 'fechada', 'concluido', 'concluida', 'consultado'].includes(normalized)) return 'fechada';
  if (['em curso', 'emcurso', 'em andamento', 'andamento'].includes(normalized)) return 'em curso';

  return normalized;
}

function filterConsultationsByStatus(consultations: Consultation[], selectedStatus: string) {
  if (selectedStatus === 'todas') {
    return consultations;
  }

  return consultations.filter((consultation) => normalizeStatusFilter(consultation.status) === selectedStatus);
}

function getStatusBadgeStyle(status: string) {
  const normalized = normalizeStatusFilter(status);

  if (normalized === 'cancelado') return styles.statusBadgeDanger;
  if (normalized === 'fechada') return styles.statusBadgeSuccess;
  if (normalized === 'pendente') return styles.statusBadgeNeutral;

  return styles.statusBadgeWarning;
}

function getStatusTextStyle(status: string) {
  const normalized = normalizeStatusFilter(status);

  if (normalized === 'cancelado') return styles.statusTextDanger;
  if (normalized === 'fechada') return styles.statusTextSuccess;
  if (normalized === 'pendente') return styles.statusTextNeutral;

  return styles.statusTextWarning;
}

function formatApiDate(value: unknown) {
  const rawDate = firstStringValue(value);
  if (!rawDate) return '';

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return rawDate;

  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function normalizeConsultations(data: any, activeUsuarioId = '', specialtyById: SpecialtyLookup = {}): Consultation[] {
  return getListPayload(data, ['marcacoes', 'consultas'])
    .filter((item: any) => {
      if (!activeUsuarioId) return true;

      const consultationUsuarioId = getConsultationUsuarioId(item);
      return !consultationUsuarioId || consultationUsuarioId === activeUsuarioId;
    })
    .map((item: any, index: number) => {
      const medico = item?.medico || item?.medicoId || item?.doctor || item?.profissional || {};
      const agenda = item?.agendaMedica || item?.agendaMedicaId || item?.agenda || {};

      return {
        id: firstStringValue(item?._id, item?.id, item?.marcacaoId, `${index}`),
        doctor: firstStringValue(medico?.nome, medico?.name, item?.nomeMedico, item?.medicoNome, item?.doctorName, 'MÃ©dico'),
        specialty: resolveSpecialtyName(item, specialtyById),
        status: firstStringValue(item?.status, item?.estado, item?.situacao, 'agendada').toLowerCase(),
        date: formatApiDate(
          item?.data ||
            item?.dataConsulta ||
            item?.data_consulta ||
            item?.dataMarcacao ||
            item?.dataConsultas ||
            agenda?.dataConsultas ||
            agenda?.data_consultas ||
            agenda?.data,
        ),
        time: firstStringValue(
          item?.horario,
          item?.hora,
          item?.horaConsulta,
          item?.time,
          agenda?.horaInicio,
          agenda?.hora_inicio,
          agenda?.inicio,
        ),
        confirmationCode: firstStringValue(
          item?.codigoConfirmacao,
          item?.codigo_confirmacao,
          item?.codigo,
          item?.confirmationCode,
          item?.confirmation_code,
        ),
        observation: firstStringValue(item?.observacoes, item?.observacao, item?.descricao, item?.notes),
      };
    })
    .filter((item: Consultation) => item.id);
}



