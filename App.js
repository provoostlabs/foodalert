import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

import OnboardingSupermarkets from './app/screens/OnboardingSupermarkets';
import OnboardingTags from './app/screens/OnboardingTags';
import HomeScreen from './app/screens/HomeScreen';
import SettingsScreen from './app/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#E53935',
    accent: '#FF5252',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#212121',
    placeholder: '#9E9E9E',
  },
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('OnboardingSupermarkets');

  useEffect(() => {
    prepareApp();
  }, []);

  const prepareApp = async () => {
    try {
      await SplashScreen.preventAutoHideAsync();
      const onboarded = await AsyncStorage.getItem('@foodalert_onboarded');
      if (onboarded === 'true') {
        setInitialRoute('Home');
      }
    } catch (e) {
      console.error(e);
    } finally {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await SplashScreen.hideAsync();
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="OnboardingSupermarkets" component={OnboardingSupermarkets} />
          <Stack.Screen name="OnboardingTags" component={OnboardingTags} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
