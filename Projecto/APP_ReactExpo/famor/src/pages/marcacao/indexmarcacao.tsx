import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../../service/api';
import { getApiErrorMessage } from '../../service/apiResponse';
import {
  firstStringValue,
  getSessionUsuarioId,
  getSpecialtiesPayload,
  getSpecialtyId,
  getSpecialtyName,
  normalizeText,
} from './marcacaoUtils';
import styles from './stylemarcacao';

interface MarcacaoConsultaProps {
  usuarioId?: string;
  usuarioSessao?: any;
  marcacaoId?: string;
  onBack: () => void;
  onOpenConsultas?: () => void;
}

type Specialty = {
  id: string;
  name: string;
  icon: string;
  color: string;
  background: string;
};

type Doctor = {
  id: string;
  name: string;
  license: string;
  description: string;
  days: string[];
  schedules: DoctorSchedule[];
};

type DoctorSchedule = {
  id: string;
  dateKey: string;
  dataConsultas: string;
  horaInicio: string;
  horaFim: string;
  estado: string;
};

type AppointmentPayload = {
  usuarioId: string;
  especialidadeId?: string;
  medicoId: string;
  agendaMedicaId: string;
  dataConsultas: string;
  observacao: string;
  codigoConfirmacao: string;
  estado: string;
};

const DEFAULT_CONFIRMATION_CODE = 'FM-9BNMJY';

const specialtyVisuals = [
  { id: 'clinica', name: 'ClÃ­nica Geral', icon: 'medical-outline', color: '#159CA3', background: '#E3F7F6' },
  { id: 'pediatria', name: 'Pediatria', icon: 'happy-outline', color: '#D6B436', background: '#FFF8D7' },
  { id: 'ginecologia', name: 'Ginecologia', icon: 'shield-outline', color: '#E15C73', background: '#FDE7EC' },
  { id: 'cardiologia', name: 'Cardiologia', icon: 'heart-outline', color: '#E34F69', background: '#FDE7EC' },
  { id: 'ortopedia', name: 'Ortopedia', icon: 'git-branch-outline', color: '#2BBEA5', background: '#E1F7F1' },
  { id: 'dermatologia', name: 'Dermatologia', icon: 'eyedrop-outline', color: '#2E77A8', background: '#E9F4FB' },
  { id: 'oftalmologia', name: 'Oftalmologia', icon: 'eye-outline', color: '#159CA3', background: '#E3F7F6' },
  { id: 'neurologia', name: 'Neurologia', icon: 'sparkles-outline', color: '#159CA3', background: '#E3F7F6' },
  { id: 'urologia', name: 'Urologia', icon: 'pulse-outline', color: '#D6B436', background: '#FFF8D7' },
  { id: 'otorrino', name: 'Otorrinolaringologia', icon: 'ear-outline', color: '#159CA3', background: '#E3F7F6' },
];

const fallbackSpecialties: Specialty[] = specialtyVisuals;

type CalendarDay = {
  key: string;
  date: Date;
  day: number;
  isCurrentMonth: boolean;
};

const weekDays = ['seg', 'ter', 'qua', 'qui', 'sex', 'sÃ¡b', 'dom'];
const monthNames = [
  'janeiro',
  'fevereiro',
  'marÃ§o',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const weekDayNames = ['domingo', 'segunda-feira', 'terÃ§a-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sÃ¡bado'];

function padNumber(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function formatApiDateKey(value: unknown) {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getUTCFullYear()}-${padNumber(date.getUTCMonth() + 1)}-${padNumber(date.getUTCDate())}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDisplayDate(date: Date) {
  return `${weekDayNames[date.getDay()]}, ${date.getDate()} de ${monthNames[date.getMonth()]} de ${date.getFullYear()}`;
}

function formatShortDate(date: Date) {
  return `${padNumber(date.getDate())}/${padNumber(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatMonthTitle(date: Date) {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function getMonthGrid(monthDate: Date): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const mondayBasedStart = (firstDayOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayBasedStart);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      key: formatDateKey(date),
      date,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

function generateHours(start: string, end: string) {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  const slots: string[] = [];

  for (let totalMinutes = startTotalMinutes; totalMinutes <= endTotalMinutes; totalMinutes += 30) {
    slots.push(`${padNumber(Math.floor(totalMinutes / 60))}:${padNumber(totalMinutes % 60)}`);
  }

  return slots;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return NaN;
  }

  return hour * 60 + minute;
}

function getConfirmationCode(data: any) {
  const payload = data?.marcacao || data?.agendamento || data?.data || data?.resultado || data?.result || data;

  return firstStringValue(
    payload?.codigoConfirmacao,
    payload?.codigo_confirmacao,
    payload?.codigo,
    payload?.confirmationCode,
    payload?.confirmation_code,
    data?.codigoConfirmacao,
    data?.codigo_confirmacao,
    data?.codigo,
    data?.confirmationCode,
    data?.confirmation_code,
  );
}

function getSpecialtyVisual(name: string, index: number) {
  const normalizedName = normalizeText(name);
  const directMatch = specialtyVisuals.find((item) => {
    const visualName = normalizeText(item.name);
    return normalizedName.includes(visualName) || visualName.includes(normalizedName);
  });

  if (directMatch) {
    return directMatch;
  }

  return specialtyVisuals[index % specialtyVisuals.length];
}

function normalizeSpecialties(data: any): Specialty[] {
  return getSpecialtiesPayload(data)
    .map((item: any, index: number) => {
      const name = getSpecialtyName(item);

      if (!name) {
        return null;
      }

      const visual = getSpecialtyVisual(name, index);
      const id = getSpecialtyId(item) || visual.id || name;

      return {
        id,
        name,
        icon: visual.icon,
        color: visual.color,
        background: visual.background,
      };
    })
    .filter((item: Specialty | null): item is Specialty => Boolean(item));
}

function getDoctorsPayload(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.agendas)) return data.agendas;
  if (Array.isArray(data?.agendaMedica)) return data.agendaMedica;
  if (Array.isArray(data?.agenda)) return data.agenda;
  if (Array.isArray(data?.medicos)) return data.medicos;
  if (Array.isArray(data?.medico)) return data.medico;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.agendas)) return data.data.agendas;
  if (Array.isArray(data?.data?.agendaMedica)) return data.data.agendaMedica;
  if (Array.isArray(data?.data?.medicos)) return data.data.medicos;
  if (Array.isArray(data?.resultado)) return data.resultado;
  if (Array.isArray(data?.result)) return data.result;
  if (data?.medico || data?.medicoId || data?.usuario || data?.profissional) return [data];
  if (data?.data?.medico || data?.data?.medicoId || data?.data?.usuario || data?.data?.profissional) return [data.data];
  return [];
}

function abbreviateDay(value: unknown) {
  const normalized = normalizeText(value);

  if (['seg', 'segunda', 'segunda feira', 'segunda-feira', 'monday', '1'].includes(normalized)) return 'Seg';
  if (['ter', 'terca', 'terÃ§a', 'terca feira', 'terÃ§a feira', 'terca-feira', 'terÃ§a-feira', 'tuesday', '2'].includes(normalized)) return 'Ter';
  if (['qua', 'quarta', 'quarta feira', 'quarta-feira', 'wednesday', '3'].includes(normalized)) return 'Qua';
  if (['qui', 'quinta', 'quinta feira', 'quinta-feira', 'thursday', '4'].includes(normalized)) return 'Qui';
  if (['sex', 'sexta', 'sexta feira', 'sexta-feira', 'friday', '5'].includes(normalized)) return 'Sex';
  if (['sab', 'sÃ¡bado', 'sabado', 'saturday', '6'].includes(normalized)) return 'SÃ¡b';
  if (['dom', 'domingo', 'sunday', '0', '7'].includes(normalized)) return 'Dom';

  return String(value || '').trim().slice(0, 3);
}

function uniqueDays(days: string[]) {
  const seen = new Set<string>();

  return days.filter((day) => {
    const key = normalizeText(day);
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function extractDoctorDays(item: any) {
  const possibleDays =
    item?.diasConsulta ||
    item?.dias_consulta ||
    item?.diasAtendimento ||
    item?.dias_atendimento ||
    item?.dias ||
    item?.diasDisponiveis ||
    item?.diasSemanaDisponivel ||
    item?.diasDisponibilidade ||
    item?.dias_semana_disponivel ||
    item?.diaSemana ||
    item?.dia_semana ||
    item?.agenda?.dias ||
    item?.agendaMedica?.dias ||
    item?.horarios ||
    item?.consultas ||
    [];

  const daysArray = Array.isArray(possibleDays) ? possibleDays : [possibleDays];
  const days = daysArray
    .flatMap((day: any) => {
      if (typeof day === 'string' || typeof day === 'number') {
        return [abbreviateDay(day)];
      }

      return [
        abbreviateDay(
          day?.dia ||
            day?.diaSemana ||
            day?.dia_semana ||
            day?.semana ||
            day?.nome ||
            day?.name ||
            day?.label ||
            '',
        ),
      ];
    })
    .filter(Boolean);

  return uniqueDays(days);
}

function getDoctorSchedulesPayload(item: any) {
  const schedules =
    item?.agendas ||
    item?.agendaMedica ||
    item?.agenda ||
    item?.horarios ||
    item?.consultas ||
    [];

  return Array.isArray(schedules) ? schedules : [schedules];
}

function normalizeDoctorSchedules(item: any): DoctorSchedule[] {
  return getDoctorSchedulesPayload(item)
    .map((schedule: any) => {
      const id = firstStringValue(
        schedule?.agendaMedicaId,
        schedule?.agenda_medica_id,
        schedule?.id,
        schedule?._id,
      );
      const dataConsultas = firstStringValue(
        schedule?.dataConsultas,
        schedule?.data_consultas,
        schedule?.data,
        schedule?.date,
      );
      const horaInicio = firstStringValue(schedule?.horaInicio, schedule?.hora_inicio, schedule?.inicio);
      const horaFim = firstStringValue(schedule?.horaFim, schedule?.hora_fim, schedule?.fim);

      if (!id || !dataConsultas) {
        return null;
      }

      return {
        id,
        dateKey: formatApiDateKey(dataConsultas),
        dataConsultas,
        horaInicio,
        horaFim,
        estado: firstStringValue(schedule?.estado, schedule?.status),
      };
    })
    .filter((schedule: DoctorSchedule | null): schedule is DoctorSchedule => Boolean(schedule));
}

function findScheduleForSelection(doctor: Doctor, selectedDate: Date, selectedHour: string) {
  const dateKey = formatDateKey(selectedDate);
  const selectedMinutes = timeToMinutes(selectedHour);

  return doctor.schedules.find((schedule) => {
    if (schedule.dateKey !== dateKey) {
      return false;
    }

    const start = timeToMinutes(schedule.horaInicio);
    const end = timeToMinutes(schedule.horaFim);
    if (!Number.isFinite(selectedMinutes) || !Number.isFinite(start) || !Number.isFinite(end)) {
      return true;
    }

    return selectedMinutes >= start && selectedMinutes <= end;
  });
}

function getAvailableHoursForDate(doctor: Doctor | null, selectedDate: Date) {
  if (!doctor) {
    return [];
  }

  const dateKey = formatDateKey(selectedDate);
  const schedules = doctor.schedules.filter((schedule) => schedule.dateKey === dateKey);

  return Array.from(
    new Set(
      schedules.flatMap((schedule) => {
        if (!schedule.horaInicio || !schedule.horaFim) {
          return [];
        }

        return generateHours(schedule.horaInicio, schedule.horaFim);
      }),
    ),
  );
}

function normalizeDoctors(data: any): Doctor[] {
  return getDoctorsPayload(data)
    .map((item: any) => {
      const medico =
        item?.medico ||
        item?.Medico ||
        item?.usuario ||
        item?.user ||
        item?.profissional ||
        item;
      const id = firstStringValue(
        medico?._id ||
          medico?.id ||
          item?.medicoId ||
          item?.medico_id ||
          item?.idMedico ||
          item?.id_medico ||
          item?._id ||
          item?.id ||
          '',
      );
      const name = firstStringValue(
          medico?.nome ||
          medico?.name ||
          medico?.nomeCompleto ||
          medico?.nome_completo ||
          item?.nome ||
          item?.mediconome ||
          item?.nomeMedico ||
          item?.medicoNome ||
          item?.medico_nome ||
          item?.profissionalNome ||
          '',
      );

      if (!id || !name) {
        return null;
      }

      const license = firstStringValue(
        medico?.numeroOrdem ||
          medico?.numero_ordem ||
          medico?.ordemMedico ||
          medico?.crm ||
          medico?.cedula ||
          item?.numeroOrdem ||
          item?.numeroordem ||
          item?.numero_ordem ||
          '',
      );
      const description = firstStringValue(
        medico?.descricao ||
          medico?.description ||
          medico?.bio ||
          item?.descricao ||
          item?.observacao ||
          'MÃ©dico disponÃ­vel para esta especialidade.',
      );

      return {
        id,
        name,
        license,
        description,
        days: extractDoctorDays(item),
        schedules: normalizeDoctorSchedules(item),
      };
    })
    .filter((item: Doctor | null): item is Doctor => Boolean(item));
}

function getMarcacaoPayload(data: any) {
  return data?.marcacao || data?.agendamento || data?.data || data?.resultado || data?.result || data || {};
}

function getMarcacaoEspecialidadeId(marcacao: any) {
  const especialidade = marcacao?.especialidade || marcacao?.especialidadeId || marcacao?.specialty || {};

  return firstStringValue(
    especialidade?._id,
    especialidade?.id,
    marcacao?.especialidadeId,
    marcacao?.especialidade_id,
    marcacao?.idEspecialidade,
    marcacao?.id_especialidade,
  );
}

function getMarcacaoMedicoId(marcacao: any) {
  const medico = marcacao?.medico || marcacao?.medicoId || marcacao?.doctor || marcacao?.profissional || {};

  return firstStringValue(
    medico?._id,
    medico?.id,
    marcacao?.medicoId,
    marcacao?.medico_id,
    marcacao?.idMedico,
    marcacao?.id_medico,
  );
}

function getMarcacaoDate(marcacao: any) {
  const agenda = marcacao?.agendaMedica || marcacao?.agendaMedicaId || marcacao?.agenda || {};
  const rawDate = firstStringValue(
    marcacao?.dataConsultas,
    marcacao?.data_consultas,
    marcacao?.dataConsulta,
    marcacao?.data_consulta,
    marcacao?.data,
    agenda?.dataConsultas,
    agenda?.data_consultas,
    agenda?.data,
  );
  const date = new Date(rawDate);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getMarcacaoHour(marcacao: any) {
  const agenda = marcacao?.agendaMedica || marcacao?.agendaMedicaId || marcacao?.agenda || {};

  return firstStringValue(
    marcacao?.horario,
    marcacao?.hora,
    marcacao?.horaConsulta,
    agenda?.horaInicio,
    agenda?.hora_inicio,
    agenda?.inicio,
  );
}

function getMarcacaoObservation(marcacao: any) {
  return firstStringValue(marcacao?.observacao, marcacao?.observacoes, marcacao?.descricao, marcacao?.notes);
}

export default function MarcacaoConsulta({ usuarioId, usuarioSessao, marcacaoId, onBack, onOpenConsultas }: MarcacaoConsultaProps) {
  const [step, setStep] = useState(1);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [specialtiesError, setSpecialtiesError] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorsError, setDoctorsError] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedHour, setSelectedHour] = useState('07:30');
  const [observations, setObservations] = useState('');
  const [appointmentPayload, setAppointmentPayload] = useState<AppointmentPayload | null>(null);
  const [confirmationCode, setConfirmationCode] = useState(DEFAULT_CONFIRMATION_CODE);
  const [confirmingAppointment, setConfirmingAppointment] = useState(false);
  const [confirmationError, setConfirmationError] = useState('');
  const [loadingMarcacao, setLoadingMarcacao] = useState(false);
  const [editingMarcacao, setEditingMarcacao] = useState<any>(null);
  const [isFinished, setIsFinished] = useState(false);

  const progress = isFinished ? 1 : step / 4;
  const activeUsuarioId = usuarioId || getSessionUsuarioId(usuarioSessao);
  const today = useMemo(() => startOfDay(new Date()), []);
  const calendarDays = useMemo(() => getMonthGrid(currentMonth), [currentMonth]);
  const selectedDateKey = formatDateKey(selectedDate);
  const availableHours = useMemo(
    () => getAvailableHoursForDate(selectedDoctor, selectedDate),
    [selectedDoctor, selectedDate],
  );
  const availableDateKeys = useMemo(
    () => new Set(selectedDoctor?.schedules.map((schedule) => schedule.dateKey) || []),
    [selectedDoctor],
  );
  const canContinue =
    (step === 1 && selectedSpecialty) ||
    (step === 2 && selectedDoctor) ||
    (step === 3 && selectedDate && selectedHour && availableHours.includes(selectedHour));
  const isEditing = Boolean(marcacaoId);

  useEffect(() => {
    loadSpecialties();
  }, []);

  useEffect(() => {
    if (marcacaoId) {
      loadMarcacaoForEdit(marcacaoId);
    } else {
      setEditingMarcacao(null);
      setStep(1);
      setIsFinished(false);
    }
  }, [marcacaoId]);

  useEffect(() => {
    if (step === 2 && selectedSpecialty?.id) {
      loadDoctorsBySpecialty(selectedSpecialty.id, editingMarcacao ? getMarcacaoMedicoId(editingMarcacao) : '');
    }
  }, [step, selectedSpecialty?.id, editingMarcacao]);

  async function loadSpecialties() {
    setLoadingSpecialties(true);
    setSpecialtiesError('');

    try {
      const response = await api.get('/especialidade/nomes');
      const apiSpecialties = normalizeSpecialties(response.data);

      setSpecialties(apiSpecialties);
      setSelectedSpecialty((currentSpecialty) => {
        if (currentSpecialty && apiSpecialties.some((item) => item.id === currentSpecialty.id)) {
          return currentSpecialty;
        }

        return null;
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.msg ||
        error?.message ||
        'Nao foi possivel carregar as especialidades.';

      setSpecialtiesError(message);
      setSpecialties(fallbackSpecialties);
    } finally {
      setLoadingSpecialties(false);
    }
  }

  async function loadDoctorsBySpecialty(especialidadeId: string, preferredDoctorId = '') {
    setLoadingDoctors(true);
    setDoctorsError('');
    setDoctors([]);
    setSelectedDoctor(null);

    try {
      const response = await api.get(`/agendamedicafiltrar/${especialidadeId}`);
      const apiDoctors = normalizeDoctors(response.data);

      setDoctors(apiDoctors);
      if (preferredDoctorId) {
        const preferredDoctor = apiDoctors.find((doctor) => doctor.id === preferredDoctorId);
        if (preferredDoctor) {
          setSelectedDoctor(preferredDoctor);
        }
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.msg ||
        error?.message ||
        'Nao foi possivel carregar os medicos desta especialidade.';

      setDoctorsError(message);
    } finally {
      setLoadingDoctors(false);
    }
  }

  async function loadMarcacaoForEdit(id: string) {
    setLoadingMarcacao(true);
    setConfirmationError('');
    setIsFinished(false);
    setStep(1);

    try {
      const response = await api.get(`/marcacao/${id}`);
      const marcacao = getMarcacaoPayload(response.data);
      const especialidadeId = getMarcacaoEspecialidadeId(marcacao);
      const medicoId = getMarcacaoMedicoId(marcacao);
      const marcacaoDate = getMarcacaoDate(marcacao);
      const marcacaoHour = getMarcacaoHour(marcacao);
      const observacao = getMarcacaoObservation(marcacao);

      setEditingMarcacao(marcacao);
      setObservations(observacao);
      setConfirmationCode(getConfirmationCode(marcacao) || DEFAULT_CONFIRMATION_CODE);

      if (marcacaoDate) {
        setSelectedDate(marcacaoDate);
        setCurrentMonth(new Date(marcacaoDate.getFullYear(), marcacaoDate.getMonth(), 1));
      }

      if (marcacaoHour) {
        setSelectedHour(marcacaoHour);
      }

      if (especialidadeId) {
        const especialidadeName = firstStringValue(
          marcacao?.especialidade?.nome,
          marcacao?.especialidadeId?.nome,
          marcacao?.especialidade?.name,
          marcacao?.especialidadeId?.name,
          'Especialidade',
        );
        const visual = getSpecialtyVisual(especialidadeName, 0);
        const especialidade = {
          id: especialidadeId,
          name: especialidadeName,
          icon: visual.icon,
          color: visual.color,
          background: visual.background,
        };

        setSelectedSpecialty(especialidade);
        setSpecialties((currentSpecialties) => {
          if (currentSpecialties.some((item) => item.id === especialidade.id)) {
            return currentSpecialties;
          }

          return [especialidade, ...currentSpecialties];
        });

        await loadDoctorsBySpecialty(especialidadeId, medicoId);
      }
    } catch (error: any) {
      setConfirmationError(getApiErrorMessage(error, 'Nao foi possivel carregar a marcacao para editar.'));
    } finally {
      setLoadingMarcacao(false);
    }
  }

  function handleBack() {
    if (isFinished) {
      onBack();
      return;
    }

    if (step === 1) {
      onBack();
      return;
    }

    setStep((currentStep) => currentStep - 1);
  }

  function handleContinue() {
    if (!canContinue) {
      return;
    }

    if (step === 1) {
      setDoctors([]);
      setDoctorsError('');
      setSelectedDoctor(null);
    }

    setStep((currentStep) => Math.min(currentStep + 1, 4));
  }

  function changeMonth(direction: -1 | 1) {
    setCurrentMonth((month) => new Date(month.getFullYear(), month.getMonth() + direction, 1));
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    const [firstAvailableHour] = getAvailableHoursForDate(selectedDoctor, date);
    if (firstAvailableHour) {
      setSelectedHour(firstAvailableHour);
    }
  }

  async function handleConfirmAppointment() {
    if (!activeUsuarioId) {
      Alert.alert('SessÃ£o invÃ¡lida', 'Nao foi possivel identificar o usuario em sessao.');
      return;
    }

    if (!selectedSpecialty?.id || !selectedDoctor?.id) {
      Alert.alert('Dados incompletos', 'Selecione a especialidade e o medico antes de confirmar.');
      return;
    }

    const selectedSchedule = findScheduleForSelection(selectedDoctor, selectedDate, selectedHour);
    if (!selectedSchedule) {
      setConfirmationError('Nao existe agenda medica disponivel para a data e horario selecionados.');
      return;
    }

    const codigoConfirmacao = `FM-${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const payload = {
      usuarioId: activeUsuarioId,
      especialidadeId: selectedSpecialty.id,
      medicoId: selectedDoctor.id,
      agendaMedicaId: selectedSchedule.id,
      dataConsultas: selectedSchedule.dataConsultas,
      observacao: observations.trim() || 'Sem observacoes.',
      codigoConfirmacao,
      estado: 'Aberto',
    };

    setConfirmingAppointment(true);
    setConfirmationError('');

    try {
      const response = isEditing ? await api.put(`/marcacao/${marcacaoId}`, payload) : await api.post('/marcacao', payload);
      const apiConfirmationCode = getConfirmationCode(response.data);

      setAppointmentPayload(payload);
      setConfirmationCode(apiConfirmationCode || DEFAULT_CONFIRMATION_CODE);
      setIsFinished(true);
    } catch (error: any) {
      setConfirmationError(getApiErrorMessage(error));
    } finally {
      setConfirmingAppointment(false);
    }
  }

  function renderTopBar() {
    return (
      <View style={styles.topBar}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>FM</Text>
        </View>
        <TouchableOpacity style={styles.menuButton} activeOpacity={0.75}>
          <Icon name="menu-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>
    );
  }

  function renderStepHeader(title: string, subtitle: string) {
    return (
      <>
        <View style={styles.stepMeta}>
          {step > 1 ? (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Icon name="arrow-back" size={18} color="#6B7280" />
              <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <Text style={styles.stepText}>Passo {step} de 4</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </>
    );
  }

  function renderContinueButton(
    label = 'Continuar',
    onPress = handleContinue,
    enabled = Boolean(canContinue),
    loading = false,
  ) {
    return (
      <TouchableOpacity
        style={[styles.primaryButton, (!enabled || loading) && styles.primaryButtonDisabled]}
        disabled={!enabled || loading}
        onPress={onPress}
        activeOpacity={0.86}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>{label}</Text>
            {label === 'Continuar' ? <Icon name="chevron-forward" size={20} color="#FFFFFF" /> : null}
          </>
        )}
      </TouchableOpacity>
    );
  }

  function renderSpecialties() {
    return (
      <>
        {renderStepHeader('Escolha a Especialidade', 'Selecione a Ã¡rea mÃ©dica desejada')}

        {loadingSpecialties ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator color="#159CA3" />
            <Text style={styles.feedbackText}>A carregar especialidades...</Text>
          </View>
        ) : null}

        {!!specialtiesError && !loadingSpecialties ? (
          <View style={styles.feedbackCard}>
            <Icon name="alert-circle-outline" size={24} color="#C2414B" />
            <Text style={styles.feedbackTitle}>Nao foi possivel carregar da API</Text>
            <Text style={styles.feedbackText}>{specialtiesError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadSpecialties}>
              <Icon name="refresh-outline" size={17} color="#159CA3" />
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loadingSpecialties && !specialtiesError && specialties.length === 0 ? (
          <View style={styles.feedbackCard}>
            <Icon name="medical-outline" size={24} color="#159CA3" />
            <Text style={styles.feedbackTitle}>Sem especialidades</Text>
            <Text style={styles.feedbackText}>Nenhuma especialidade foi encontrada.</Text>
          </View>
        ) : null}

        <View style={styles.specialtyGrid}>
          {specialties.map((specialty) => {
            const isSelected = selectedSpecialty?.id === specialty.id;

            return (
              <TouchableOpacity
                key={specialty.id}
                style={[styles.specialtyCard, isSelected && styles.selectedCard]}
                onPress={() => {
                  setSelectedSpecialty(specialty);
                  setDoctors([]);
                  setDoctorsError('');
                  setSelectedDoctor(null);
                }}
                activeOpacity={0.82}
              >
                <View style={[styles.specialtyIcon, { backgroundColor: specialty.background }]}>
                  <Icon name={specialty.icon} size={25} color={specialty.color} />
                </View>
                <Text style={styles.specialtyName}>{specialty.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {renderContinueButton()}
      </>
    );
  }

  function renderDoctors() {
    return (
      <>
        {renderStepHeader('Escolha o MÃ©dico', 'Selecione o profissional')}

        {loadingDoctors ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator color="#159CA3" />
            <Text style={styles.feedbackText}>A carregar medicos...</Text>
          </View>
        ) : null}

        {!!doctorsError && !loadingDoctors ? (
          <View style={styles.feedbackCard}>
            <Icon name="alert-circle-outline" size={24} color="#C2414B" />
            <Text style={styles.feedbackTitle}>Nao foi possivel carregar os medicos</Text>
            <Text style={styles.feedbackText}>{doctorsError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => selectedSpecialty?.id && loadDoctorsBySpecialty(selectedSpecialty.id)}
            >
              <Icon name="refresh-outline" size={17} color="#159CA3" />
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loadingDoctors && !doctorsError && doctors.length === 0 ? (
          <View style={styles.feedbackCard}>
            <Icon name="person-outline" size={24} color="#159CA3" />
            <Text style={styles.feedbackTitle}>Sem mÃ©dicos</Text>
            <Text style={styles.feedbackText}>NÃ£o existem mÃ©dicos disponiveis para esta especialidade.</Text>
          </View>
        ) : null}

        {doctors.map((doctor) => {
          const isSelected = selectedDoctor?.id === doctor.id;

          return (
            <TouchableOpacity
              key={doctor.id}
              style={[styles.doctorCard, isSelected && styles.selectedDoctorCard]}
              onPress={() => {
                setSelectedDoctor(doctor);
                const firstSchedule = doctor.schedules[0];
                if (firstSchedule) {
                  const scheduleDate = new Date(firstSchedule.dataConsultas);
                  if (!Number.isNaN(scheduleDate.getTime())) {
                    selectDate(scheduleDate);
                  }
                  if (firstSchedule.horaInicio) {
                    setSelectedHour(firstSchedule.horaInicio);
                  }
                }
              }}
              activeOpacity={0.82}
            >
              <View style={styles.avatar}>
                <Icon name="person-outline" size={28} color="#159CA3" />
              </View>
              <View style={styles.doctorInfo}>
                <View style={styles.doctorNameRow}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  {isSelected ? <Icon name="checkmark-circle-outline" size={20} color="#159CA3" /> : null}
                </View>
                <Text style={styles.doctorLicense}>{doctor.license}</Text>
                <Text style={styles.doctorDescription} numberOfLines={1}>
                  {doctor.description}
                </Text>
                {doctor.days.length ? (
                  <View style={styles.dayTags}>
                    {doctor.days.map((day) => (
                      <View key={day} style={styles.dayTag}>
                        <Text style={styles.dayTagText}>{day}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
        {renderContinueButton()}
      </>
    );
  }

  function renderDateTime() {
    return (
      <>
        {renderStepHeader('Data e HorÃ¡rio', 'Escolha quando deseja ser atendido')}
        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)}>
              <Icon name="chevron-back" size={18} color="#9CA3AF" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{formatMonthTitle(currentMonth)}</Text>
            <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)}>
              <Icon name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <View style={styles.calendarGrid}>
            {weekDays.map((day) => (
              <Text key={day} style={styles.weekDay}>
                {day}
              </Text>
            ))}
            {calendarDays.map((calendarDay) => {
              const isSelected = selectedDateKey === calendarDay.key;
              const isPastDay = startOfDay(calendarDay.date) < today;
              const isUnavailable = !availableDateKeys.has(calendarDay.key);

              return (
                <TouchableOpacity
                  key={calendarDay.key}
                  style={[styles.calendarDay, isSelected && styles.calendarDaySelected, (isPastDay || isUnavailable) && styles.calendarDayDisabled]}
                  disabled={isPastDay || isUnavailable}
                  onPress={() => selectDate(calendarDay.date)}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      !calendarDay.isCurrentMonth && styles.calendarDayMuted,
                      (isPastDay || isUnavailable) && styles.calendarDayDisabledText,
                      isSelected && styles.calendarDaySelectedText,
                    ]}
                  >
                    {calendarDay.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={styles.hoursTitleRow}>
          <Icon name="time-outline" size={18} color="#159CA3" />
          <Text style={styles.hoursTitle}>
            HorÃ¡rios em {selectedDate.getDate()} de {monthNames[selectedDate.getMonth()]}
          </Text>
        </View>
        <View style={styles.hoursGrid}>
          {availableHours.map((hour) => {
            const isSelected = selectedHour === hour;

            return (
              <TouchableOpacity
                key={hour}
                style={[styles.hourButton, isSelected && styles.hourButtonSelected]}
                onPress={() => setSelectedHour(hour)}
                activeOpacity={0.82}
              >
                <Text style={[styles.hourText, isSelected && styles.hourTextSelected]}>{hour}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {!availableHours.length ? (
          <View style={styles.feedbackCard}>
            <Icon name="time-outline" size={24} color="#159CA3" />
            <Text style={styles.feedbackTitle}>Sem horarios</Text>
            <Text style={styles.feedbackText}>Escolha uma data disponivel para este medico.</Text>
          </View>
        ) : null}
        {renderContinueButton()}
      </>
    );
  }

  function renderSummaryCard() {
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, styles.summaryIconTeal]}>
            <Icon name="person-outline" size={23} color="#159CA3" />
          </View>
          <View>
            <Text style={styles.summaryLabel}>MÃ©dico</Text>
            <Text style={styles.summaryValue}>{selectedDoctor?.name || 'MÃ©dico selecionado'}</Text>
          </View>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, styles.summaryIconTeal]}>
            <Icon name="medical-outline" size={23} color="#159CA3" />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Especialidade</Text>
            <Text style={styles.summaryValue}>{selectedSpecialty?.name || 'ClÃ­nica Geral'}</Text>
          </View>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, styles.summaryIconYellow]}>
            <Icon name="calendar-outline" size={23} color="#D8B822" />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Data</Text>
            <Text style={styles.summaryValue}>{formatDisplayDate(selectedDate)}</Text>
          </View>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, styles.summaryIconBlue]}>
            <Icon name="time-outline" size={23} color="#2E77A8" />
          </View>
          <View>
            <Text style={styles.summaryLabel}>HorÃ¡rio</Text>
            <Text style={styles.summaryValue}>{selectedHour}</Text>
          </View>
        </View>
      </View>
    );
  }

  function renderConfirm() {
    return (
      <>
        {renderStepHeader(isEditing ? 'Confirmar AtualizaÃ§Ã£o' : 'Confirmar Agendamento', 'Revise os dados antes de confirmar')}
        {renderSummaryCard()}
        <View style={styles.observationHeader}>
          <Icon name="document-text-outline" size={17} color="#6B7280" />
          <Text style={styles.observationTitle}>ObservaÃ§Ãµes (opcional)</Text>
        </View>
        <TextInput
          style={styles.textArea}
          value={observations}
          onChangeText={setObservations}
          multiline
          textAlignVertical="top"
          placeholder="Descreva sintomas ou informaÃ§Ãµes relevantes..."
          placeholderTextColor="#8B95A1"
        />
        {!!confirmationError ? (
          <View style={styles.inlineError}>
            <Icon name="alert-circle-outline" size={17} color="#C2414B" />
            <Text style={styles.inlineErrorText}>{confirmationError}</Text>
          </View>
        ) : null}
        {renderContinueButton(
          confirmingAppointment ? 'A confirmar...' : isEditing ? 'Atualizar Agendamento' : 'Confirmar Agendamento',
          handleConfirmAppointment,
          true,
          confirmingAppointment,
        )}
      </>
    );
  }

  function renderSuccess() {
    const confirmedHour = selectedHour;
    const confirmedDate = appointmentPayload?.dataConsultas ? new Date(appointmentPayload.dataConsultas) : selectedDate;

    return (
      <>
        <View style={styles.successIconWrap}>
          <Icon name="checkmark-done-circle-outline" size={64} color="#2BBEA5" />
        </View>
        <Text style={styles.successTitle}>{isEditing ? 'Consulta Atualizada!' : 'Consulta Agendada!'}</Text>
        <Text style={styles.successSubtitle}>
          {isEditing ? 'Seu agendamento foi atualizado com sucesso' : 'Seu agendamento foi realizado com sucesso'}
        </Text>
        <View style={styles.successCard}>
          <View style={styles.successRow}>
            <View>
              <Text style={styles.summaryLabel}>MÃ©dico</Text>
              <Text style={styles.summaryValue}>{selectedDoctor?.name || 'MÃ©dico selecionado'}</Text>
            </View>
          </View>
          <View style={styles.successRow}>
            <View>
              <Text style={styles.summaryLabel}>Especialidade</Text>
              <Text style={styles.summaryValue}>{selectedSpecialty?.name || 'ClÃ­nica Geral'}</Text>
            </View>
          </View>
          <View style={styles.successDateRow}>
            <View style={styles.successDateColumn}>
              <Text style={styles.summaryLabel}>Data</Text>
              <View style={styles.inlineInfo}>
                <Icon name="calendar-outline" size={15} color="#159CA3" />
                <Text style={styles.summaryValue}>{formatShortDate(confirmedDate)}</Text>
              </View>
            </View>
            <View style={styles.successDateColumn}>
              <Text style={styles.summaryLabel}>HorÃ¡rio</Text>
              <View style={styles.inlineInfo}>
                <Icon name="time-outline" size={15} color="#159CA3" />
                <Text style={styles.summaryValue}>{confirmedHour}</Text>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.codeHeader}>
            <Icon name="qr-code-outline" size={16} color="#6B7280" />
            <Text style={styles.summaryLabel}>CÃ³digo de ConfirmaÃ§Ã£o</Text>
          </View>
          <View style={styles.codeBox}>
            <Text style={styles.confirmationCode}>{confirmationCode}</Text>
            <Text style={styles.codeHint}>Apresente este cÃ³digo na recepÃ§Ã£o</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={onOpenConsultas || onBack} activeOpacity={0.86}>
          <Text style={styles.primaryButtonText}>Ver Consultas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack} activeOpacity={0.78}>
          <Text style={styles.secondaryButtonText}>Voltar ao InÃ­cio</Text>
        </TouchableOpacity>
      </>
    );
  }

  function renderCurrentStep() {
    if (loadingMarcacao) {
      return (
        <View style={styles.feedbackCard}>
          <ActivityIndicator color="#159CA3" />
          <Text style={styles.feedbackText}>A carregar marcaÃ§Ã£o...</Text>
        </View>
      );
    }

    if (isFinished) {
      return renderSuccess();
    }

    if (step === 1) {
      return renderSpecialties();
    }

    if (step === 2) {
      return renderDoctors();
    }

    if (step === 3) {
      return renderDateTime();
    }

    return renderConfirm();
  }

  return (
    <View style={styles.page}>
      {renderTopBar()}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        {renderCurrentStep()}
      </ScrollView>
    </View>
  );
}

