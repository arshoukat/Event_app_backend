import React, { useContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { EventProvider } from './src/context/EventContext';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/home/HomeScreen';
import EventsScreen from './src/screens/events/EventsScreen';
import EventDetailScreen from './src/screens/events/EventDetailScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import CreateEventScreen from './src/screens/events/CreateEventScreen';

// Auth Stack
const AuthStack = createNativeStackNavigator();
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

// Main Stack
const MainStack = createNativeStackNavigator();
const MainNavigator = () => (
  <MainStack.Navigator>
    <MainStack.Screen 
      name="MainTabs" 
      component={MainTabsNavigator}
      options={{ headerShown: false }}
    />
    <MainStack.Screen 
      name="EventDetail" 
      component={EventDetailScreen}
      options={{ title: 'Event Details' }}
    />
    <MainStack.Screen 
      name="CreateEvent" 
      component={CreateEventScreen}
      options={{ title: 'Create Event' }}
    />
  </MainStack.Navigator>
);

// Bottom Tabs
const Tab = createBottomTabNavigator();
const MainTabsNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: '#8E8E93',
      headerShown: true,
    }}
  >
    <Tab.Screen 
      name="Home" 
      component={HomeScreen}
      options={{ title: 'Home' }}
    />
    <Tab.Screen 
      name="Events" 
      component={EventsScreen}
      options={{ title: 'Events' }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
  </Tab.Navigator>
);

// Root Navigator (handles auth state)
const RootNavigator = () => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return user ? <MainNavigator /> : <AuthNavigator />;
};

export default function App() {
  return (
    <AuthProvider>
      <EventProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </EventProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

