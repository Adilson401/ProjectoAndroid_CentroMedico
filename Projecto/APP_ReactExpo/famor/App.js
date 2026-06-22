import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useState } from 'react';
import Login from './src/pages/login';
import Register from './src/pages/login/registar';
import RecoverPassword from './src/pages/login/recuperarsenha';
import HomeClient from './src/pages/home/indexcliente';
import PainelAdm from './src/pages/adm/paineladm';
import IndexMedico from './src/pages/medico/indexmedico';
import IndexRecepcao from './src/pages/rcepcao/Indexrecepcao';

function normalizeRole(role) {
  return String(role || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getAccessScreen(role) {
  const normalizedRole = normalizeRole(role);

  if (['administrador', 'admin'].includes(normalizedRole)) {
    return 'admin';
  }

  if (['medico', 'medicos'].includes(normalizedRole)) {
    return 'medico';
  }

  if (['recepcao', 'recepcionista'].includes(normalizedRole)) {
    return 'recepcao';
  }

  if (['paciente', 'pacientes', 'usuario', 'usuarios', 'user'].includes(normalizedRole)) {
    return 'cliente';
  }

  return 'cliente';
}

function getSessionUsuarioId(session) {
  const payload = session?.usuario || session?.raw?.usuario || session?.raw?.user || session?.raw?.perfil || session?.raw;
  const candidates = [
    session?.usuarioId,
    payload?._id,
    payload?.id,
    payload?.usuarioId,
    payload?.usuario_id,
    payload?.idUsuario,
    payload?.id_usuario,
    session?.raw?._id,
    session?.raw?.id,
    session?.raw?.usuarioId,
    session?.raw?.usuario_id,
  ];

  const found = candidates.find((value) => value !== undefined && value !== null && String(value).trim());
  return found !== undefined && found !== null ? String(found).trim() : '';
}

export default function App() {
  const [userSession, setUserSession] = useState(null);
  const [screen, setScreen] = useState('login');
  const userEmail = userSession?.email || '';
  const usuarioId = getSessionUsuarioId(userSession);
  const accessScreen = getAccessScreen(userSession?.funcao);

  const handleBackToLogin = () => setScreen('login');
  const handleShowRegister = () => setScreen('register');
  const handleShowRecoverPassword = () => setScreen('recover');
  const handleLogout = () => {
    setUserSession(null);
    setScreen('login');
  };

  function renderAuthenticatedScreen() {
    if (accessScreen === 'admin') {
      return (
        <PainelAdm
          email={userEmail}
          usuarioId={usuarioId}
          usuarioSessao={userSession}
          nome={userSession?.nome}
          tipoUsuario={userSession?.funcao}
          membroDesde={userSession?.dataRegisto}
          onLogout={handleLogout}
        />
      );
    }

    if (accessScreen === 'medico') {
      return <IndexMedico email={userEmail} usuarioId={usuarioId} usuarioSessao={userSession} onLogout={handleLogout} />;
    }

    if (accessScreen === 'recepcao') {
      return <IndexRecepcao email={userEmail} usuarioId={usuarioId} usuarioSessao={userSession} onLogout={handleLogout} />;
    }

    return <HomeClient email={userEmail} usuarioId={usuarioId} usuarioSessao={userSession} onLogout={handleLogout} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {userSession ? (
        renderAuthenticatedScreen()
      ) : screen === 'register' ? (
        <Register onBack={handleBackToLogin} />
      ) : screen === 'recover' ? (
        <RecoverPassword onBack={handleBackToLogin} />
      ) : (
        <Login onLogin={setUserSession} onRegister={handleShowRegister} onRecover={handleShowRecoverPassword} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
