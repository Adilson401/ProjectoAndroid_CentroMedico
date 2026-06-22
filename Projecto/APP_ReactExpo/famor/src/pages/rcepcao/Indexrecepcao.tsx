import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface IndexRecepcaoProps {
  email?: string;
  usuarioId?: string;
  usuarioSessao?: any;
  onLogout?: () => void;
}

export default function IndexRecepcao({ email, onLogout }: IndexRecepcaoProps) {
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Painel Recepcao</Text>
        <Text style={styles.subtitle}>{email || 'Recepcao'}</Text>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout} disabled={!onLogout}>
          <Text style={styles.logoutText}>Terminar Sessao</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 22,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 20,
  },
  logoutButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#139CA3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
