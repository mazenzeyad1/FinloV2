import { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { useAuthStore } from './src/store/auth.store'
import './src/lib/api'

import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import TransactionsScreen from './src/screens/TransactionsScreen'
import AccountsScreen from './src/screens/AccountsScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()
const queryClient = new QueryClient()

function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
      tabBarActiveTintColor: '#6366f1',
      tabBarInactiveTintColor: '#64748b',
    }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
    </Tab.Navigator>
  )
}

export default function App() {
  const { initialized, accessToken, loadToken } = useAuthStore()

  useEffect(() => { loadToken() }, [])

  if (!initialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#6366f1" />
      </View>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {accessToken ? (
            <Stack.Screen name="Main" component={TabNavigator} />
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  )
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
})
