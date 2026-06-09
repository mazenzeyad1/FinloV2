import { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native'
import { useAuthStore } from '../store/auth.store'
import { useUpdateProfile, useChangePassword } from '../hooks/useUsers'

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const saveProfile = async () => {
    if (!firstName.trim()) return
    try {
      await updateProfile.mutateAsync({ firstName: firstName.trim(), lastName: lastName.trim() })
      Alert.alert('Saved', 'Profile updated.')
    } catch {
      Alert.alert('Error', 'Could not save profile.')
    }
  }

  const submitPassword = async () => {
    if (!currentPw || !newPw) return
    if (newPw !== confirmPw) { Alert.alert('Error', 'New passwords do not match.'); return }
    if (newPw.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters.'); return }
    try {
      await changePassword.mutateAsync({ currentPassword: currentPw, newPassword: newPw })
      Alert.alert('Done', 'Password changed. You will be signed out.', [
        { text: 'OK', onPress: () => logout() },
      ])
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not change password.')
    }
  }

  const confirmLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Settings</Text>

      {/* Profile section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.fieldLabel}>Email</Text>
        <View style={styles.readonlyField}>
          <Text style={styles.readonlyText}>{user?.email}</Text>
        </View>
        <Text style={styles.fieldLabel}>First name</Text>
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholderTextColor="#475569" autoCapitalize="words" />
        <Text style={styles.fieldLabel}>Last name</Text>
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholderTextColor="#475569" autoCapitalize="words" />
        <TouchableOpacity style={styles.primaryBtn} onPress={saveProfile} disabled={updateProfile.isPending}>
          {updateProfile.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>Save changes</Text>}
        </TouchableOpacity>
      </View>

      {/* Change password section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change password</Text>
        <Text style={styles.sectionSub}>You'll be signed out on all devices after changing.</Text>
        <Text style={styles.fieldLabel}>Current password</Text>
        <TextInput style={styles.input} value={currentPw} onChangeText={setCurrentPw} secureTextEntry placeholderTextColor="#475569" placeholder="••••••••" />
        <Text style={styles.fieldLabel}>New password</Text>
        <TextInput style={styles.input} value={newPw} onChangeText={setNewPw} secureTextEntry placeholderTextColor="#475569" placeholder="Min. 8 characters" />
        <Text style={styles.fieldLabel}>Confirm new password</Text>
        <TextInput style={styles.input} value={confirmPw} onChangeText={setConfirmPw} secureTextEntry placeholderTextColor="#475569" placeholder="••••••••" />
        <TouchableOpacity style={styles.primaryBtn} onPress={submitPassword} disabled={changePassword.isPending}>
          {changePassword.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>Update password</Text>}
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Finlo · v1.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 48 },
  pageTitle: { color: '#f1f5f9', fontSize: 22, fontWeight: '700', marginBottom: 20 },

  section: { backgroundColor: '#1e293b', borderRadius: 14, padding: 18, marginBottom: 14 },
  sectionTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  sectionSub: { color: '#64748b', fontSize: 12, marginBottom: 16 },

  fieldLabel: { color: '#64748b', fontSize: 12, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#0f172a', borderRadius: 10, padding: 14, color: '#f1f5f9', fontSize: 15 },
  readonlyField: { backgroundColor: '#0f172a', borderRadius: 10, padding: 14 },
  readonlyText: { color: '#475569', fontSize: 15 },

  primaryBtn: {
    backgroundColor: '#6366f1', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  logoutBtn: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: '#ef4444',
  },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },

  version: { color: '#334155', fontSize: 12, textAlign: 'center', marginTop: 8 },
})
