import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

interface ConnectViewProps {
  onScanPress: () => void;
  showToast: (msg: string) => void;
}

export const ConnectView: React.FC<ConnectViewProps> = ({
  onScanPress,
  showToast,
}) => {
  const [trackingSource, setTrackingSource] = useState<'extension' | 'github'>('extension');
  const [isConnected, setIsConnected] = useState(true);
  const [pairCode, setPairCode] = useState('');
  const [pairedInfo, setPairedInfo] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [latency, setLatency] = useState(14);
  const [githubRepo, setGithubRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);

  const handlePing = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    setIsPinging(true);
    setTimeout(() => {
      setIsPinging(false);
      const simulatedLatency = Math.floor(Math.random() * 8) + 12;
      setLatency(simulatedLatency);
      showToast(`Pong! IDE response: ${simulatedLatency}ms`);
    }, 450);
  };

  const submitPinVerification = (rawPin: string) => {
    Keyboard.dismiss();
    const clean = rawPin.replace(/\D/g, '');
    if (clean.length < 6) {
      setPinError('Please enter a 6-digit PIN code (e.g. 849-201)');
      return;
    }
    setPinError(null);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setIsPairing(true);
    setTimeout(() => {
      setIsPairing(false);
      setIsConnected(true);
      const formattedPin = `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
      setPairedInfo(`Connected to VS Code (PIN: ${formattedPin})`);
      setPairCode(formattedPin);
      showToast(`✅ Connected to VS Code (${formattedPin})`);

      Alert.alert(
        '✅ Connected & Synchronized!',
        `Successfully paired with VS Code session.\n\n• PIN: ${formattedPin}\n• User: Divyansh (Coder)\n• Host: 192.168.29.45:8080\n• Latency: 12ms\n\nYour IDE and device are now actively connected in real-time.`,
        [{ text: 'Great!', style: 'default' }]
      );
    }, 450);
  };

  const handlePairCodeChange = (text: string) => {
    setPairCode(text);
    setPinError(null);
    const clean = text.replace(/\D/g, '');
    if (clean.length === 6) {
      submitPinVerification(text);
    }
  };

  const handleQuickFillPin = () => {
    setPairCode('849-201');
    submitPinVerification('849-201');
  };

  const handlePairSubmit = () => {
    submitPinVerification(pairCode);
  };

  const handleToggleConnection = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
    const next = !isConnected;
    setIsConnected(next);
    showToast(next ? 'Connected to Relay context engine' : 'Disconnected from IDE');
  };

  const handleConnectGithub = () => {
    if (!githubRepo.trim()) {
      Alert.alert('Missing Repo', 'Please enter a GitHub repository in the format owner/repo.');
      return;
    }
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setIsConnectingGithub(true);
    setTimeout(() => {
      setIsConnectingGithub(false);
      setIsConnected(true);
      showToast(`Tracking ${githubRepo} on branch ${githubBranch}`);
    }, 1000);
  };


  return (
    <View style={styles.container}>
      {/* ─── TITLE SECTION ─── */}
      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>
          <Text style={styles.titleBold}>Connect{'\n'}</Text>
          <Text style={styles.titleLight}>IDE & Engine</Text>
        </Text>
        <Text style={styles.subtitle}>
          Synchronize AI context between VS Code and your device.
        </Text>
      </View>

      {/* ─── TRACKING SOURCE TOGGLE ─── */}
      <View style={styles.sourceToggle}>
        <TouchableOpacity
          style={[styles.sourceTab, trackingSource === 'extension' && styles.sourceTabActive]}
          activeOpacity={0.8}
          onPress={() => { try { Haptics.selectionAsync(); } catch {} setTrackingSource('extension'); }}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
            stroke={trackingSource === 'extension' ? '#FFFFFF' : '#71717A'}
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Rect x="2" y="3" width="20" height="14" rx="2" />
            <Line x1="8" y1="21" x2="16" y2="21" />
            <Line x1="12" y1="17" x2="12" y2="21" />
          </Svg>
          <Text style={[styles.sourceTabText, trackingSource === 'extension' && styles.sourceTabTextActive]}>
            VS Code Extension
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sourceTab, trackingSource === 'github' && styles.sourceTabActive]}
          activeOpacity={0.8}
          onPress={() => { try { Haptics.selectionAsync(); } catch {} setTrackingSource('github'); }}
        >
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
            stroke={trackingSource === 'github' ? '#FFFFFF' : '#71717A'}
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </Svg>
          <Text style={[styles.sourceTabText, trackingSource === 'github' && styles.sourceTabTextActive]}>
            GitHub
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── LIVE STATUS HERO CARD ─── */}
      <View style={[styles.statusCard, !isConnected && styles.statusCardDisconnected]}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, isConnected ? styles.badgeOnline : styles.badgeOffline]}>
            <View style={[styles.statusDot, isConnected ? styles.dotGreen : styles.dotAmber]} />
            <Text style={[styles.statusBadgeText, isConnected ? styles.textGreen : styles.textAmber]}>
              {isConnected ? 'ONLINE & SYNCED' : 'DISCONNECTED'}
            </Text>
          </View>
          <Text style={styles.latencyText}>{isConnected ? `${latency}ms latency` : 'Offline'}</Text>
        </View>

        <Text style={styles.ideName}>
          {trackingSource === 'extension' ? 'VS Code Extension' : 'GitHub Repository'}
        </Text>
        <Text style={styles.workspaceName}>
          {trackingSource === 'extension' ? 'Workspace: relay-core • main' : (githubRepo ? `${githubRepo} • ${githubBranch}` : 'No repository connected')}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Engine Host</Text>
            <Text style={styles.metaValue}>localhost:8080</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Protocol</Text>
            <Text style={styles.metaValue}>SSE Broadcaster</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Target Role</Text>
            <Text style={styles.metaValue}>Coder</Text>
          </View>
        </View>

        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={styles.pingBtn}
            activeOpacity={0.8}
            onPress={handlePing}
            disabled={!isConnected || isPinging}
          >
            {isPinging ? (
              <ActivityIndicator size="small" color="#18181B" />
            ) : (
              <>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#18181B" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </Svg>
                <Text style={styles.pingBtnText}>Ping Assistant</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.disconnectBtn, !isConnected && styles.reconnectBtn]}
            activeOpacity={0.8}
            onPress={handleToggleConnection}
          >
            <Text style={[styles.disconnectBtnText, !isConnected && styles.reconnectBtnText]}>
              {isConnected ? 'Disconnect' : 'Reconnect'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── PAIRING OPTIONS (conditional by source) ─── */}
      <Text style={styles.sectionHeading}>
        {trackingSource === 'extension' ? 'Pairing Methods' : 'Repository Setup'}
      </Text>

      {trackingSource === 'extension' ? (
        <>
          {/* Method 1: QR Code Scanner */}
          <TouchableOpacity style={styles.pairOptionCard} activeOpacity={0.75} onPress={onScanPress}>
            <View style={styles.pairIconBox}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#18181B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 8V5a1 1 0 0 1 1-1h3" />
                <Path d="M16 4h3a1 1 0 0 1 1 1v3" />
                <Path d="M20 16v3a1 1 0 0 1-1 1h-3" />
                <Path d="M8 20H5a1 1 0 0 1-1-1v-3" />
                <Rect x="8.5" y="8.5" width="7" height="7" rx="1.5" />
              </Svg>
            </View>
            <View style={styles.pairTextBox}>
              <Text style={styles.pairOptionTitle}>Scan Extension QR Code</Text>
              <Text style={styles.pairOptionSub}>Open camera to photograph the pairing QR from your VS Code status bar.</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>

          {/* Method 2: Manual 6-Digit Code */}
          <View style={styles.manualCodeCard}>
            <View style={styles.pairTextBox}>
              <Text style={styles.pairOptionTitle}>Enter 6-Digit Session Pin</Text>
              <Text style={styles.pairOptionSub}>
                Run <Text style={styles.codeSnippet}>Relay: Show Session Pin</Text> in VS Code.
              </Text>
            </View>
            <View style={styles.pinInputRow}>
              <TextInput
                style={[styles.pinInput, pinError && { borderColor: '#EF4444' }]}
                placeholder="e.g. 849-201"
                placeholderTextColor="#A1A1AA"
                value={pairCode}
                onChangeText={handlePairCodeChange}
                keyboardType="number-pad"
                maxLength={8}
                returnKeyType="done"
                onSubmitEditing={handlePairSubmit}
              />
              <TouchableOpacity
                style={[
                  styles.pairSubmitBtn,
                  pairCode.replace(/\D/g, '').length >= 6 && styles.pairSubmitBtnActive,
                ]}
                activeOpacity={0.8}
                onPress={handlePairSubmit}
                disabled={isPairing}
              >
                {isPairing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.pairSubmitText}>Pair</Text>
                )}
              </TouchableOpacity>
            </View>

            {pinError && (
              <Text style={{ color: '#F87171', fontSize: 11, fontWeight: '600', marginTop: 8 }}>
                ⚠️ {pinError}
              </Text>
            )}

            {/* Quick Fill Demo PIN */}
            <TouchableOpacity
              style={{
                marginTop: 12,
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(59, 130, 246, 0.35)',
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 12,
                alignItems: 'center',
              }}
              activeOpacity={0.75}
              onPress={handleQuickFillPin}
            >
              <Text style={{ color: '#60A5FA', fontSize: 12, fontWeight: '700' }}>
                ⚡ Quick Fill Demo PIN: 849-201
              </Text>
            </TouchableOpacity>

            {pairedInfo && (
              <View style={styles.pairedBanner}>
                <View style={styles.pairedDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pairedBannerText}>✅ {pairedInfo}</Text>
                  <Text style={{ color: '#86EFAC', fontSize: 10, marginTop: 2 }}>
                    Session: Divyansh (Coder) • Host: 192.168.29.45:8080 • 12ms latency
                  </Text>
                </View>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          {/* GitHub: repo URL input */}
          <View style={styles.manualCodeCard}>
            <View style={styles.pairTextBox}>
              <Text style={styles.pairOptionTitle}>Repository</Text>
              <Text style={styles.pairOptionSub}>Enter your GitHub repo in the format <Text style={styles.codeSnippet}>owner/repo</Text></Text>
            </View>
            <TextInput
              style={[styles.pinInput, { marginTop: 14, letterSpacing: 0, fontSize: 14 }]}
              placeholder="e.g. divya/relay"
              placeholderTextColor="#A1A1AA"
              value={githubRepo}
              onChangeText={setGithubRepo}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.pairTextBox}>
              <Text style={[styles.pairOptionTitle, { marginTop: 16 }]}>Branch</Text>
            </View>
            <TextInput
              style={[styles.pinInput, { marginTop: 8, letterSpacing: 0, fontSize: 14 }]}
              placeholder="main"
              placeholderTextColor="#A1A1AA"
              value={githubBranch}
              onChangeText={setGithubBranch}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.pairSubmitBtn, styles.pairSubmitBtnActive, { paddingVertical: 13, marginTop: 16 }]}
              activeOpacity={0.8}
              onPress={handleConnectGithub}
              disabled={isConnectingGithub}
            >
              {isConnectingGithub ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.pairSubmitText, { fontSize: 14 }]}>Connect Repository →</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* GitHub: install webhook tip */}
          <TouchableOpacity
            style={styles.pairOptionCard}
            activeOpacity={0.75}
            onPress={() => showToast('Install the Relay GitHub App from github.com/apps/relay-context')}
          >
            <View style={[styles.pairIconBox, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </Svg>
            </View>
            <View style={styles.pairTextBox}>
              <Text style={styles.pairOptionTitle}>Install Relay GitHub App</Text>
              <Text style={styles.pairOptionSub}>Grants webhook access to stream push events to the context engine automatically.</Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ─── LIVE METRICS & HEALTH ─── */}
      <Text style={[styles.sectionHeading, { marginTop: 24 }]}>Stream Health & Telemetry</Text>

      <View style={styles.metricsGrid}>
        <View style={styles.metricTile}>
          <Text style={styles.metricVal}>142</Text>
          <Text style={styles.metricLabel}>Events Ingested</Text>
        </View>
        <View style={styles.metricTile}>
          <Text style={styles.metricVal}>89</Text>
          <Text style={styles.metricLabel}>Diffs Filtered</Text>
        </View>
        <View style={styles.metricTile}>
          <Text style={styles.metricVal}>100%</Text>
          <Text style={styles.metricLabel}>Stream Reliability</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sourceToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sourceTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 7,
  },
  sourceTabActive: {
    backgroundColor: '#18181B',
  },
  sourceTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#71717A',
  },
  sourceTabTextActive: {
    color: '#FFFFFF',
  },
  titleSection: {
    marginBottom: 24,
  },
  mainTitle: {
    letterSpacing: -0.5,
  },
  titleBold: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  titleLight: {
    fontSize: 34,
    fontWeight: '300',
    color: '#E4E4E7',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#A1A1AA',
    marginTop: 8,
    lineHeight: 22,
  },
  statusCard: {
    backgroundColor: '#161618',
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  statusCardDisconnected: {
    backgroundColor: '#27272A',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeOnline: {
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
  },
  badgeOffline: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotGreen: {
    backgroundColor: '#22C55E',
  },
  dotAmber: {
    backgroundColor: '#F59E0B',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  textGreen: {
    color: '#4ADE80',
  },
  textAmber: {
    color: '#FBBF24',
  },
  latencyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717A',
  },
  ideName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  workspaceName: {
    fontSize: 14,
    fontWeight: '400',
    color: '#A1A1AA',
    marginBottom: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 14,
    marginBottom: 18,
  },
  metaCol: {
    gap: 3,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717A',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E4E4E7',
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  pingBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181B',
  },
  disconnectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reconnectBtn: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  disconnectBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F87171',
  },
  reconnectBtnText: {
    color: '#4ADE80',
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  pairOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  pairIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  pairTextBox: {
    flex: 1,
  },
  pairOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  pairOptionSub: {
    fontSize: 12,
    fontWeight: '400',
    color: '#D4D4D8',
    lineHeight: 16,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#A1A1AA',
    fontWeight: '600',
    marginLeft: 8,
  },
  manualCodeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  codeSnippet: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#4F46E5',
    fontWeight: '600',
  },
  pinInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  pinInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  pairSubmitBtn: {
    backgroundColor: '#A1A1AA',
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairSubmitBtnActive: {
    backgroundColor: '#18181B',
  },
  pairSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECECEF',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#18181B',
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#71717A',
    textAlign: 'center',
  },
  pairedBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  pairedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  pairedBannerText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '700',
  },
});
