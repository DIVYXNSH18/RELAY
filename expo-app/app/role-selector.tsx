/**
 * app/role-selector.tsx — Role Selector Screen.
 *
 * Lets the user pick a role (Coder, Debugger, Deployer).
 * Registers the session with the backend and stores it in AsyncStorage.
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Font, Shadow } from '../src/theme/colors';
import { RelayApi, Role } from '../src/services/api';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8080';
const api = new RelayApi(BACKEND_URL);

const ROLES: { id: Role; label: string; emoji: string; desc: string; gradient: [string, string]; glow: string }[] = [
  { id: 'Coder',    label: 'Coder',    emoji: '💻', desc: 'Writing features & sharing diffs with team', gradient: Colors.gradient.coder,    glow: Colors.accent.coder },
  { id: 'Debugger', label: 'Debugger', emoji: '🔍', desc: 'Diagnosing issues & reviewing fixes',     gradient: Colors.gradient.debugger, glow: Colors.accent.debugger },
  { id: 'Deployer', label: 'Deployer', emoji: '🚀', desc: 'Tracking env, config & infra changes',    gradient: Colors.gradient.deployer, glow: Colors.accent.deployer },
];

export default function RoleSelector() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = async (role: Role) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedRole(role);
  };

  const handleConfirm = async () => {
    if (!username) {
      Alert.alert('Error', 'Missing username. Please go back and login again.');
      return;
    }
    if (!selectedRole) {
      Alert.alert('Role Required', 'Please select your role to continue.');
      return;
    }

    setLoading(true);
    try {
      await api.upsertSession(username, selectedRole);
      await AsyncStorage.multiSet([
        ['relay.username', username],
        ['relay.role', selectedRole],
        ['relay.backendUrl', BACKEND_URL],
      ]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/dashboard');
    } catch {
      Alert.alert('Connection Error', `Cannot reach the Relay backend at ${BACKEND_URL}.\nMake sure the server is running.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>⚡ relay</Text>
          <Text style={styles.subtitle}>Welcome {username}, choose your role</Text>
        </View>

        {/* Role cards */}
        <Text style={styles.label}>Your role</Text>
        <View style={styles.cardsColumn}>
          {ROLES.map((role) => {
            const isSelected = selectedRole === role.id;

            return (
              <TouchableOpacity
                key={role.id}
                onPress={() => handleRoleSelect(role.id)}
                activeOpacity={0.88}
                style={styles.cardWrapper}
              >
                <LinearGradient
                  colors={isSelected ? role.gradient : [Colors.glass.fill, Colors.glass.fill]}
                  style={[
                    styles.card,
                    isSelected && { ...Shadow.glow(role.glow), borderColor: role.glow },
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.cardEmoji}>{role.emoji}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                      {role.label}
                    </Text>
                    <Text style={[styles.cardDesc, isSelected && styles.cardDescSelected]}>
                      {role.desc}
                    </Text>
                  </View>
                  <View style={[styles.radioCircle, isSelected && { borderColor: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    {isSelected && <Text style={styles.radioCheck}>✓</Text>}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[styles.btn, (!selectedRole || loading) && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={!selectedRole || loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={Colors.gradient.coder}
            style={styles.btnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.btnText}>
              {loading ? 'Connecting…' : 'Start Relay →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg.base },
  scroll:       { flexGrow: 1, paddingHorizontal: 24, paddingTop: 70, paddingBottom: 40 },
  header:       { alignItems: 'center', marginBottom: 36 },
  logo:         { fontSize: Font.sizes.h1, fontWeight: Font.weights.heavy, color: Colors.text.primary, letterSpacing: -1 },
  subtitle:     { fontSize: Font.sizes.sm, color: Colors.text.secondary, marginTop: 8, textAlign: 'center' },
  label:        { fontSize: Font.sizes.sm, fontWeight: Font.weights.semibold, color: Colors.text.secondary, marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  cardsColumn:  { gap: 12, marginBottom: 36 },
  cardWrapper:  { width: '100%' },
  card: {
    borderRadius: Radius.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.glass.border,
  },
  cardEmoji:    { fontSize: 30, marginRight: 14 },
  cardInfo:     { flex: 1 },
  cardLabel:    { fontSize: Font.sizes.md, fontWeight: Font.weights.bold, color: Colors.text.primary },
  cardLabelSelected: { color: '#FFFFFF' },
  cardDesc:     { fontSize: Font.sizes.xs, color: Colors.text.secondary, marginTop: 3, lineHeight: 16 },
  cardDescSelected: { color: 'rgba(255,255,255,0.85)' },
  radioCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioCheck:   { fontSize: 13, color: '#FFFFFF', fontWeight: 'bold' },
  btn:          { borderRadius: Radius.lg, overflow: 'hidden' },
  btnDisabled:  { opacity: 0.4 },
  btnGradient:  { height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText:      { fontSize: Font.sizes.md, fontWeight: Font.weights.bold, color: Colors.text.primary, letterSpacing: 0.3 },
});
