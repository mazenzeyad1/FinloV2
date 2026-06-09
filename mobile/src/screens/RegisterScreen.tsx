import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { api } from '../lib/api'

export default function RegisterScreen({ navigation }: NativeStackScreenProps<any>) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.firstName || !form.email || !form.password) return
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      Alert.alert('Check your email', 'We sent you a verification link.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ])
    } catch (err: any) {
      const status = err?.status
      if (status === 409) {
        Alert.alert('Email already registered', 'Try signing in instead.')
      } else if (status === 400) {
        Alert.alert('Check your details', err?.message ?? 'Please review the form and try again.')
      } else if (!status) {
        Alert.alert(
          'Connection error',
          "Can't reach the server. Check your internet connection and try again.",
        )
      } else {
        Alert.alert('Registration failed', 'Please try again in a moment.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <View style={styles.logoBox}><Text style={styles.logoLetter}>F</Text></View>
          <Text style={styles.logoText}>finlo</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Start managing your finances for free</Text>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>First name</Text>
              <TextInput style={styles.input} placeholder="Mazen" placeholderTextColor="#64748b" value={form.firstName} onChangeText={set('firstName')} />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Last name</Text>
              <TextInput style={styles.input} placeholder="Z" placeholderTextColor="#64748b" value={form.lastName} onChangeText={set('lastName')} />
            </View>
          </View>

          <Text style={styles.label}>Email address</Text>
          <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#64748b" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="Min. 8 characters" placeholderTextColor="#64748b" value={form.password} onChangeText={set('password')} secureTextEntry />

          <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create account</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#0f172a' },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  logoBox: { width: 36, height: 36, backgroundColor: '#6366f1', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoText: { color: '#f1f5f9', fontSize: 24, fontWeight: '600' },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#1e293b', borderRadius: 16, padding: 28 },
  title: { color: '#f1f5f9', fontSize: 20, fontWeight: '600', marginBottom: 4 },
  subtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '500', marginBottom: 6 },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 10, padding: 14, color: '#f1f5f9', fontSize: 15, marginBottom: 16 },
  btn: { backgroundColor: '#6366f1', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#64748b', fontSize: 13 },
  link: { color: '#6366f1', fontSize: 13, fontWeight: '500' },
})
