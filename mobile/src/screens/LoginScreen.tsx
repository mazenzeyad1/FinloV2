import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'

export default function LoginScreen({ navigation }: NativeStackScreenProps<any>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAccessToken, setUser } = useAuthStore()

  const submit = async () => {
    if (!email || !password) return
    setLoading(true)
    try {
      const data = await api.post<{ accessToken: string; user: any }>('/auth/login', { email, password })
      await setAccessToken(data.accessToken)
      setUser(data.user)
    } catch {
      Alert.alert('Sign in failed', 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}><Text style={styles.logoLetter}>F</Text></View>
          <Text style={styles.logoText}>finlo</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your Finlo account</Text>

          <Text style={styles.label}>Email address</Text>
          <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#64748b" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#64748b" value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign in</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>No account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Create one free</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#0f172a' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  logoBox: { width: 36, height: 36, backgroundColor: '#6366f1', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoText: { color: '#f1f5f9', fontSize: 24, fontWeight: '600' },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#1e293b', borderRadius: 16, padding: 28 },
  title: { color: '#f1f5f9', fontSize: 20, fontWeight: '600', marginBottom: 4 },
  subtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 24 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '500', marginBottom: 6 },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 14, color: '#f1f5f9', fontSize: 15, marginBottom: 16 },
  btn: { backgroundColor: '#6366f1', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#64748b', fontSize: 13 },
  link: { color: '#6366f1', fontSize: 13, fontWeight: '500' },
})
