import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../../service/api';
import { getApiErrorMessage } from '../../service/apiResponse';
import {
  firstStringValue,
  getListPayload,
  normalizeSpecialtyLookup,
  normalizeText,
  resolveSpecialtyName,
  SpecialtyLookup,
} from '../marcacao/marcacaoUtils';
import adminStyles from './styleadm';

interface ConsultaMarcadasProps {
  onMenuPress?: () => void;
}

type ConsultaMarcada = {
  id: string;
  paciente: string;
  medico: string;
  especialidade: string;
  estado: string;
  data: string;
  hora: string;
  codigoConfirmacao: string;
  observacao: string;
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

export default function ConsultaMarcadas({ onMenuPress }: ConsultaMarcadasProps) {
  const [consultas, setConsultas] = useState<ConsultaMarcada[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('todas');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const selectedStatusLabel = STATUS_FILTERS.find((filter) => filter.value === selectedStatusFilter)?.label || 'Todas';
  const filteredConsultas = useMemo(
    () => filterConsultasByStatus(consultas, selectedStatusFilter),
    [consultas, selectedStatusFilter],
  );

  useEffect(() => {
    loadConsultas();
  }, []);

  async function loadConsultas() {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/consultasmarcadas');
      let specialtyById: Record<string, string> = {};

      try {
        const specialtiesResponse = await api.get('/especialidade/nomes');
        specialtyById = normalizeSpecialtyLookup(specialtiesResponse.data);
      } catch (specialtiesError) {
        console.warn('Nao foi possivel carregar nomes das especialidades:', specialtiesError);
      }

      setConsultas(normalizeConsultas(response.data, specialtyById));
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError, 'Nao foi possivel carregar as consultas marcadas.'));
    } finally {
      setLoading(false);
    }
  }

  function renderStatusFilter() {
    return (
      <View style={localStyles.filterBlock}>
        <Text style={localStyles.filterLabel}>Filtrar por estado</Text>
        <TouchableOpacity
          style={localStyles.filterButton}
          onPress={() => setShowStatusFilter((currentValue) => !currentValue)}
          activeOpacity={0.75}
        >
          <Text style={localStyles.filterButtonText}>{selectedStatusLabel}</Text>
          <Icon name={showStatusFilter ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color="#139CA3" />
        </TouchableOpacity>

        {showStatusFilter ? (
          <View style={localStyles.filterDropdown}>
            {STATUS_FILTERS.map((filter) => {
              const isSelected = selectedStatusFilter === filter.value;

              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[localStyles.filterOption, isSelected && localStyles.filterOptionSelected]}
                  onPress={() => {
                    setSelectedStatusFilter(filter.value);
                    setShowStatusFilter(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[localStyles.filterOptionText, isSelected && localStyles.filterOptionTextSelected]}>
                    {filter.label}
                  </Text>
                  {isSelected ? <Icon name="checkmark-outline" size={17} color="#139CA3" /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  }

  function renderConsultaCard(consulta: ConsultaMarcada) {
    return (
      <View key={consulta.id} style={localStyles.consultaCard}>
        <View style={localStyles.consultaHeader}>
          <View style={localStyles.consultaAvatar}>
            <Icon name="calendar-outline" size={24} color="#139CA3" />
          </View>
          <View style={localStyles.consultaHeaderInfo}>
            <Text style={localStyles.pacienteName}>{consulta.paciente}</Text>
            <Text style={localStyles.consultaSpecialty}>{consulta.especialidade}</Text>
          </View>
          <View style={[localStyles.statusBadge, getStatusBadgeStyle(consulta.estado)]}>
            <Text style={[localStyles.statusText, getStatusTextStyle(consulta.estado)]}>{consulta.estado}</Text>
          </View>
        </View>

        <View style={localStyles.infoBlock}>
          <View style={localStyles.infoRow}>
            <Icon name="person-outline" size={16} color="#64748B" />
            <Text style={localStyles.infoLabel}>Medico</Text>
            <Text style={localStyles.infoValue}>{consulta.medico}</Text>
          </View>

          <View style={localStyles.infoRow}>
            <Icon name="calendar-number-outline" size={16} color="#64748B" />
            <Text style={localStyles.infoLabel}>Data</Text>
            <Text style={localStyles.infoValue}>{consulta.data || '-'}</Text>
          </View>

          <View style={localStyles.infoRow}>
            <Icon name="time-outline" size={16} color="#64748B" />
            <Text style={localStyles.infoLabel}>Hora</Text>
            <Text style={localStyles.infoValue}>{consulta.hora || '-'}</Text>
          </View>
        </View>

        <View style={localStyles.codeBox}>
          <Icon name="qr-code-outline" size={24} color="#139CA3" />
          <View style={localStyles.codeInfo}>
            <Text style={localStyles.codeLabel}>Codigo de confirmacao</Text>
            <Text style={localStyles.codeText}>{consulta.codigoConfirmacao || '-'}</Text>
          </View>
        </View>

        {!!consulta.observacao ? <Text style={localStyles.observation}>{consulta.observacao}</Text> : null}
      </View>
    );
  }

  return (
    <ScrollView style={adminStyles.scrollView} contentContainerStyle={adminStyles.content} showsVerticalScrollIndicator>
      <View style={adminStyles.topBar}>
        <View style={adminStyles.brandAvatar}>
          <Text style={adminStyles.brandText}>FM</Text>
        </View>
        <TouchableOpacity style={adminStyles.iconButton} onPress={onMenuPress} activeOpacity={0.75}>
          <Icon name="menu-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={adminStyles.sectionHeader}>
        <Text style={adminStyles.title}>Consultas Marcadas</Text>
        <TouchableOpacity style={adminStyles.addButton} onPress={loadConsultas} disabled={loading} activeOpacity={0.75}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Icon name="refresh-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={adminStyles.addButtonText}>Atualizar</Text>
        </TouchableOpacity>
      </View>

      {renderStatusFilter()}

      {loading ? (
        <View style={adminStyles.emptyCard}>
          <ActivityIndicator color="#139CA3" />
          <Text style={adminStyles.emptyText}>A carregar consultas...</Text>
        </View>
      ) : null}

      {!!error && !loading ? (
        <View style={adminStyles.emptyCard}>
          <Icon name="alert-circle-outline" size={28} color="#C2414B" />
          <Text style={adminStyles.emptyTitle}>Erro</Text>
          <Text style={adminStyles.emptyText}>{error}</Text>
          <TouchableOpacity style={adminStyles.addButton} onPress={loadConsultas} activeOpacity={0.75}>
            <Icon name="refresh-outline" size={18} color="#FFFFFF" />
            <Text style={adminStyles.addButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error && consultas.length === 0 ? (
        <View style={adminStyles.emptyCard}>
          <Icon name="calendar-outline" size={28} color="#139CA3" />
          <Text style={adminStyles.emptyTitle}>Sem consultas</Text>
          <Text style={adminStyles.emptyText}>Ainda nao existem consultas marcadas.</Text>
        </View>
      ) : null}

      {!loading && !error && consultas.length > 0 && filteredConsultas.length === 0 ? (
        <View style={adminStyles.emptyCard}>
          <Icon name="filter-outline" size={28} color="#139CA3" />
          <Text style={adminStyles.emptyTitle}>Sem resultado neste filtro</Text>
          <Text style={adminStyles.emptyText}>Nao ha consultas com o estado selecionado.</Text>
        </View>
      ) : null}

      <View style={localStyles.consultaList}>
        {!loading && !error ? filteredConsultas.map(renderConsultaCard) : null}
      </View>
    </ScrollView>
  );
}

function normalizeStatusFilter(status: string) {
  const normalized = normalizeText(status);

  if (['cancelado', 'cancelada', 'canceladas'].includes(normalized)) return 'cancelado';
  if (['fechado', 'fechada', 'concluido', 'concluida', 'consultado'].includes(normalized)) return 'fechada';
  if (['em curso', 'emcurso', 'em andamento', 'andamento'].includes(normalized)) return 'em curso';

  return normalized;
}

function filterConsultasByStatus(consultas: ConsultaMarcada[], selectedStatus: string) {
  if (selectedStatus === 'todas') {
    return consultas;
  }

  return consultas.filter((consulta) => normalizeStatusFilter(consulta.estado) === selectedStatus);
}

function getStatusBadgeStyle(status: string) {
  const normalized = normalizeStatusFilter(status);

  if (normalized === 'cancelado') return localStyles.statusBadgeDanger;
  if (normalized === 'fechada') return localStyles.statusBadgeSuccess;
  if (normalized === 'pendente') return localStyles.statusBadgeNeutral;

  return localStyles.statusBadgeWarning;
}

function getStatusTextStyle(status: string) {
  const normalized = normalizeStatusFilter(status);

  if (normalized === 'cancelado') return localStyles.statusTextDanger;
  if (normalized === 'fechada') return localStyles.statusTextSuccess;
  if (normalized === 'pendente') return localStyles.statusTextNeutral;

  return localStyles.statusTextWarning;
}

function formatApiDate(value: unknown) {
  const rawDate = firstStringValue(value);
  if (!rawDate) return '';

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return rawDate;

  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getPacienteName(item: any) {
  const usuario = item?.usuario || item?.usuarioId || item?.user || item?.paciente || item?.pacienteId || {};

  return firstStringValue(
    usuario?.nome,
    usuario?.name,
    usuario?.nomeCompleto,
    usuario?.nome_completo,
    item?.nomePaciente,
    item?.pacienteNome,
    item?.usuarioNome,
    item?.nomeUsuario,
    'Paciente',
  );
}

function normalizeConsultas(data: any, specialtyById: SpecialtyLookup = {}): ConsultaMarcada[] {
  return getListPayload(data, ['marcacoes', 'consultas'])
    .map((item: any, index: number) => {
      const medico = item?.medico || item?.medicoId || item?.doctor || item?.profissional || {};
      const agenda = item?.agendaMedica || item?.agendaMedicaId || item?.agenda || {};

      return {
        id: firstStringValue(item?._id, item?.id, item?.marcacaoId, `${index}`),
        paciente: getPacienteName(item),
        medico: firstStringValue(medico?.nome, medico?.name, item?.nomeMedico, item?.medicoNome, item?.doctorName, 'Medico'),
        especialidade: resolveSpecialtyName(item, specialtyById),
        estado: firstStringValue(item?.status, item?.estado, item?.situacao, 'agendada').toLowerCase(),
        data: formatApiDate(
          item?.data ||
            item?.dataConsulta ||
            item?.data_consulta ||
            item?.dataMarcacao ||
            item?.dataConsultas ||
            agenda?.dataConsultas ||
            agenda?.data_consultas ||
            agenda?.data,
        ),
        hora: firstStringValue(
          item?.horario,
          item?.hora,
          item?.horaConsulta,
          item?.time,
          agenda?.horaInicio,
          agenda?.hora_inicio,
          agenda?.inicio,
        ),
        codigoConfirmacao: firstStringValue(
          item?.codigoConfirmacao,
          item?.codigo_confirmacao,
          item?.codigo,
          item?.confirmationCode,
          item?.confirmation_code,
        ),
        observacao: firstStringValue(item?.observacoes, item?.observacao, item?.descricao, item?.notes),
      };
    })
    .filter((item: ConsultaMarcada) => item.id);
}

const localStyles = StyleSheet.create({
  filterBlock: {
    marginBottom: 14,
  },
  filterLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
  },
  filterButton: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDE5EE',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  filterButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  filterDropdown: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 6,
  },
  filterOption: {
    minHeight: 40,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  filterOptionSelected: {
    backgroundColor: '#F0FAFA',
  },
  filterOptionText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  filterOptionTextSelected: {
    color: '#147A80',
    fontWeight: '800',
  },
  consultaList: {
    gap: 10,
  },
  consultaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  consultaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  consultaAvatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EAF7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  consultaHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  pacienteName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  consultaSpecialty: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginLeft: 8,
  },
  statusBadgeWarning: {
    backgroundColor: '#FFF8D8',
  },
  statusBadgeSuccess: {
    backgroundColor: '#E1F7F1',
  },
  statusBadgeDanger: {
    backgroundColor: '#FDE7EC',
  },
  statusBadgeNeutral: {
    backgroundColor: '#EEF2F7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  statusTextWarning: {
    color: '#A78008',
  },
  statusTextSuccess: {
    color: '#14846E',
  },
  statusTextDanger: {
    color: '#C2414B',
  },
  statusTextNeutral: {
    color: '#475569',
  },
  infoBlock: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  infoLabel: {
    width: 52,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  infoValue: {
    flex: 1,
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  codeBox: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: '#F0FAFA',
    borderWidth: 1,
    borderColor: '#C9ECEA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  codeInfo: {
    flex: 1,
  },
  codeLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  codeText: {
    color: '#147A80',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  observation: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
});
