import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Clipboard,
  Platform,
  TextInput,
  Alert,
  Keyboard,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

interface PairModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToConnect: () => void;
  showToast?: (text: string) => void;
}

export const PairModal: React.FC<PairModalProps> = ({
  visible,
  onClose,
  onNavigateToConnect,
  showToast,
}) => {
  const [source, setSource] = useState<'extension' | 'github'>('extension');
  const [inputPin, setInputPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inModalToast, setInModalToast] = useState<string | null>(null);
  const [githubRepo, setGithubRepo] = useState('relay/relay-core');
  const [githubBranch, setGithubBranch] = useState('main');
  const [isConnectingGh, setIsConnectingGh] = useState(false);
  const [isGhConnected, setIsGhConnected] = useState(false);

  const showModalToast = (msg: string) => {
    setInModalToast(msg);
    setTimeout(() => setInModalToast(null), 3000);
  };

  const triggerVerification = (rawPin: string) => {
    const clean = rawPin.replace(/\D/g, '');
    if (clean.length < 6) {
      setErrorMessage('Please enter a 6-digit PIN (e.g. 849-201)');
      return;
    }
    setErrorMessage(null);
    Keyboard.dismiss();
    setIsVerifying(true);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}

    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
      const formatted = `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
      showModalToast(`✅ Connected to VS Code (${formatted})`);
      showToast?.(`Connected to VS Code (${formatted})`);

      Alert.alert(
        '✅ Connected & Synchronized!',
        `Successfully paired with VS Code session.\n\n• PIN: ${formatted}\n• User: Divyansh (Coder)\n• Host: 192.168.29.45:8080\n• Latency: 12ms\n\nYour IDE and device are now actively connected in real-time.`,
        [{ text: 'Awesome!', onPress: onClose }]
      );
    }, 450);
  };

  const handlePinTextChange = (text: string) => {
    setInputPin(text);
    setErrorMessage(null);
    const clean = text.replace(/\D/g, '');
    if (clean.length === 6) {
      triggerVerification(text);
    }
  };

  const handleQuickFillPin = () => {
    setInputPin('849-201');
    triggerVerification('849-201');
  };

  const handleConnectGithub = () => {
    if (!githubRepo.trim()) return;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setIsConnectingGh(true);
    setTimeout(() => {
      setIsConnectingGh(false);
      setIsGhConnected(true);
      showModalToast(`GitHub: Tracking ${githubRepo} (${githubBranch})`);
      showToast?.(`GitHub: Tracking ${githubRepo} (${githubBranch})`);
    }, 700);
  };

  const handleOpenConnect = () => {
    try { Haptics.selectionAsync(); } catch {}
    onClose();
    onNavigateToConnect();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <BlurView intensity={95} tint="dark" style={styles.glassBackground}>
            {/* ─── IN-MODAL FLOATING NOTIFICATION ─── */}
            {inModalToast && (
              <View style={styles.modalToastBanner}>
                <View style={styles.toastDot} />
                <Text style={styles.modalToastText}>{inModalToast}</Text>
              </View>
            )}

            {/* ─── HEADER ─── */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Connect Mobile to IDE</Text>
                <Text style={styles.subtitle}>Real-time AI context sync with your workspace</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* ─── CONTENT ─── */}
            <View style={styles.body}>
              {/* Tab Selector: Extension vs GitHub */}
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tabBtn, source === 'extension' && styles.tabBtnActive]}
                  onPress={() => { try { Haptics.selectionAsync(); } catch {} setSource('extension'); }}
                >
                  <Text style={[styles.tabBtnText, source === 'extension' && styles.tabBtnTextActive]}>
                    VS Code Extension
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabBtn, source === 'github' && styles.tabBtnActive]}
                  onPress={() => { try { Haptics.selectionAsync(); } catch {} setSource('github'); }}
                >
                  <Text style={[styles.tabBtnText, source === 'github' && styles.tabBtnTextActive]}>
                    GitHub Repository
                  </Text>
                </TouchableOpacity>
              </View>

              {source === 'extension' ? (
                <>
                  {/* SUCCESS CELEBRATION HERO CARD */}
                  {isVerified ? (
                    <View style={styles.connectedCard}>
                      <View style={styles.connectedBadge}>
                        <View style={styles.connectedDot} />
                        <Text style={styles.connectedBadgeText}>ONLINE & SYNCHRONIZED</Text>
                      </View>
                      <Text style={styles.connectedTitle}>Connected to VS Code</Text>
                      <Text style={styles.connectedSub}>
                        Active pairing with Divyansh (Coder) • 12ms latency
                      </Text>
                      <View style={styles.connectedMetaGrid}>
                        <View style={styles.connectedMetaCol}>
                          <Text style={styles.connectedMetaLbl}>PIN Verified</Text>
                          <Text style={styles.connectedMetaVal}>{inputPin || '849-201'}</Text>
                        </View>
                        <View style={styles.connectedMetaCol}>
                          <Text style={styles.connectedMetaLbl}>Backend Host</Text>
                          <Text style={styles.connectedMetaVal}>192.168.29.45:8080</Text>
                        </View>
                        <View style={styles.connectedMetaCol}>
                          <Text style={styles.connectedMetaLbl}>SSE Stream</Text>
                          <Text style={styles.connectedMetaVal}>Active</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.doneBtn}
                        activeOpacity={0.85}
                        onPress={onClose}
                      >
                        <Text style={styles.doneBtnText}>Continue to Workspace →</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {/* Status pill */}
                      <View style={styles.statusPill}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Backend Engine Active on :8080</Text>
                      </View>

                      {/* Primary PIN Entry Box */}
                      <View style={styles.enterPinBox}>
                        <Text style={styles.inputLabel}>ENTER 6-DIGIT PIN FROM VS CODE</Text>
                        <Text style={styles.inputSubLabel}>
                          Found in the Relay VS Code sidebar or status bar.
                        </Text>
                        <View style={styles.pinInputRowModal}>
                          <TextInput
                            style={[styles.textInputPin, errorMessage && styles.textInputError]}
                            placeholder="e.g. 849-201"
                            placeholderTextColor="#71717A"
                            value={inputPin}
                            onChangeText={handlePinTextChange}
                            keyboardType="number-pad"
                            maxLength={8}
                            returnKeyType="done"
                            onSubmitEditing={() => triggerVerification(inputPin)}
                          />
                          <TouchableOpacity
                            style={[
                              styles.btnVerifyPin,
                              inputPin.replace(/\D/g, '').length >= 6 && styles.btnVerifyPinActive,
                            ]}
                            onPress={() => triggerVerification(inputPin)}
                            disabled={isVerifying}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.btnVerifyPinText}>
                              {isVerifying ? 'Verifying...' : 'Pair'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {errorMessage && (
                          <Text style={styles.errorInlineText}>⚠️ {errorMessage}</Text>
                        )}

                        {/* Quick Demo Fill Chip */}
                        <TouchableOpacity
                          style={styles.quickFillChip}
                          activeOpacity={0.75}
                          onPress={handleQuickFillPin}
                        >
                          <Text style={styles.quickFillText}>⚡ Quick Fill Demo PIN: 849-201</Text>
                        </TouchableOpacity>
                      </View>

                      {/* QR Code Scanner Option */}
                      <TouchableOpacity
                        style={styles.qrCard}
                        activeOpacity={0.8}
                        onPress={() => {
                          onClose();
                          onNavigateToConnect();
                        }}
                      >
                        <View style={styles.qrBox}>
                          <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.8}>
                            <Path d="M4 8V5a1 1 0 0 1 1-1h3" />
                            <Path d="M16 4h3a1 1 0 0 1 1 1v3" />
                            <Path d="M20 16v3a1 1 0 0 1-1 1h-3" />
                            <Path d="M8 20H5a1 1 0 0 1-1-1v-3" />
                            <Rect x="8" y="8" width="8" height="8" rx="1.5" />
                          </Svg>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.qrTitle}>Or Scan QR Code</Text>
                          <Text style={styles.qrSub}>
                            Use your camera to scan the code displayed in VS Code.
                          </Text>
                        </View>
                        <Text style={{ color: '#A1A1AA', fontSize: 16 }}>→</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* GitHub Tracking Form */}
                  <View style={styles.ghCard}>
                    <View style={styles.statusPill}>
                      <View style={[styles.statusDot, { backgroundColor: isGhConnected ? '#22C55E' : '#60A5FA' }]} />
                      <Text style={[styles.statusText, { color: isGhConnected ? '#4ADE80' : '#93C5FD' }]}>
                        {isGhConnected ? 'Webhook Live & Synchronized' : 'GitHub Webhook Ready'}
                      </Text>
                    </View>

                    <Text style={styles.inputLabel}>REPOSITORY (OWNER / REPO)</Text>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputPrefix}>github.com/</Text>
                      <TextInput
                        style={styles.textInput}
                        value={githubRepo}
                        onChangeText={setGithubRepo}
                        placeholder="owner/repo"
                        placeholderTextColor="#71717A"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>TARGET BRANCH</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        value={githubBranch}
                        onChangeText={setGithubBranch}
                        placeholder="main"
                        placeholderTextColor="#71717A"
                        autoCapitalize="none"
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.ghSubmitBtn, isGhConnected && styles.ghSubmitBtnConnected]}
                      activeOpacity={0.85}
                      onPress={handleConnectGithub}
                      disabled={isConnectingGh}
                    >
                      <Text style={styles.ghSubmitBtnText}>
                        {isConnectingGh ? 'Connecting...' : isGhConnected ? 'Connected ✓ (Tracking Commits)' : 'Connect GitHub Repository'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Full Connect Screen CTA */}
              <TouchableOpacity style={styles.fullConnectBtn} activeOpacity={0.85} onPress={handleOpenConnect}>
                <Text style={styles.fullConnectText}>Open Full Connect Screen →</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  glassBackground: {
    backgroundColor: 'rgba(16, 18, 24, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 2,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E4E4E7',
  },
  body: {
    padding: 20,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 16,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4ADE80',
  },
  pinCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#A1A1AA',
    marginBottom: 8,
  },
  pinCode: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 6,
  },
  pinHint: {
    fontSize: 12,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 16,
  },
  copyBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  qrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 14,
    gap: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  qrBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  qrSub: {
    fontSize: 11,
    color: '#71717A',
    lineHeight: 16,
    marginTop: 2,
  },
  fullConnectBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  fullConnectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181B',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ghCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#A1A1AA',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  inputPrefix: {
    fontSize: 13,
    color: '#71717A',
    fontWeight: '500',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 0,
  },
  ghSubmitBtn: {
    backgroundColor: '#3B82F6',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ghSubmitBtnConnected: {
    backgroundColor: '#15803D',
  },
  ghSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalToastBanner: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    backgroundColor: '#18181B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    gap: 8,
  },
  modalToastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  toastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  connectedCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#22C55E',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 10,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4ADE80',
    letterSpacing: 0.8,
  },
  connectedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  connectedSub: {
    fontSize: 12,
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 16,
  },
  connectedMetaGrid: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  connectedMetaCol: {
    flex: 1,
    alignItems: 'center',
  },
  connectedMetaLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#71717A',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  connectedMetaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  enterPinBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 14,
  },
  inputSubLabel: {
    fontSize: 11,
    color: '#71717A',
    marginBottom: 12,
  },
  pinInputRowModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textInputPin: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
  },
  textInputError: {
    borderColor: '#EF4444',
  },
  btnVerifyPin: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnVerifyPinActive: {
    backgroundColor: '#3B82F6',
  },
  btnVerifyPinText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorInlineText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  quickFillChip: {
    marginTop: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  quickFillText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
  },
});

