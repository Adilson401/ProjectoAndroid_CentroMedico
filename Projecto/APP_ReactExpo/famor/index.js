import { registerRootComponent } from 'expo';

import App from './App';
//Aqui é o ponto de entrada do aplicativo, onde o componente App é 
// registrado como o componente raiz do aplicativo usando a função registerRootComponent do Expo. 
// Isso garante que o aplicativo seja iniciado corretamente quando for executado em um dispositivo ou emulador.

registerRootComponent(App);
