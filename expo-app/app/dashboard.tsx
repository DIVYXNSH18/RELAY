import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  Animated,
  Alert,
  Dimensions,
  ImageBackground,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polyline, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { FloatingBottomNav, TabId } from '../src/components/FloatingBottomNav';
import { HomeView, ActivityItem } from '../src/components/views/HomeView';
import { ConnectView } from '../src/components/views/ConnectView';
import { ProjectsView } from '../src/components/views/ProjectsView';
import { TerminalModal } from '../src/components/views/TerminalModal';
import { HistoryModal } from '../src/components/views/HistoryModal';
import { PairModal } from '../src/components/views/PairModal';
import { RelevanceDigest } from '../src/services/api';

interface DashboardScreenProps {
  initialTab?: TabId;
}

export default function DashboardScreen({ initialTab }: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const startingTab: TabId =
    (params?.tab as TabId) || initialTab || 'home';

  const [activeTab, setActiveTab] = useState<TabId>(startingTab);
  const [micActive, setMicActive] = useState(false);
  const [syncedId, setSyncedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [pairVisible, setPairVisible] = useState(false);
  const [inspectDigest, setInspectDigest] = useState<RelevanceDigest | null>(null);

  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for live sync indicator
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const showToast = (text: string) => {
    setToastMessage(text);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(1600),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

  const handleSync = (item: ActivityItem) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setSyncedId(item.id);
    showToast(`Synced ${item.file} with AI`);

    setTimeout(() => {
      setSyncedId(null);
    }, 2400);
  };

  const toggleMic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const next = !micActive;
    setMicActive(next);
    showToast(next ? 'Voice input active' : 'Voice input muted');
  };

  const scrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = Dimensions.get('window');
  
  // Sync navbar presses to ScrollView
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const index = tab === 'home' ? 0 : tab === 'connect' ? 1 : 2;
    scrollRef.current?.scrollTo({ x: index * screenWidth, animated: false });
  };

  // Sync scroll swiping to navbar active tab
  const handleMomentumScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    const tabs: TabId[] = ['home', 'connect', 'projects'];
    if (tabs[index] && tabs[index] !== activeTab) {
      setActiveTab(tabs[index]);
    }
  };

  const headerPaddingTop = Math.max(insets.top, Platform.OS === 'android' ? 28 : 20) + 10;

  return (
    <ImageBackground 
      source={require('../assets/images/sky_bg.png')} 
      style={styles.container}
      resizeMode="cover"
      blurRadius={25}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <Animated.View style={[styles.toastContainer, { opacity: toastAnim, top: headerPaddingTop - 2 }]}>
          <View style={styles.toastBubble}>
            <View style={styles.toastDot} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}

      {/* ─── TOP HEADER ─── */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        {/* Menu / Workspace info */}
        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.7}
          onPress={() => {
            try { Haptics.selectionAsync(); } catch {}
            setMenuVisible(true);
          }}
        >
          <Svg width={20} height={20} viewBox="0 0 18 18" fill="none">
            <Circle cx="4.5" cy="4.5" r="2.3" fill="#18181B" />
            <Circle cx="13.5" cy="4.5" r="2.3" fill="#18181B" />
            <Circle cx="4.5" cy="13.5" r="2.3" fill="#18181B" />
            <Circle cx="13.5" cy="13.5" r="2.3" fill="#18181B" />
          </Svg>
        </TouchableOpacity>

        {/* User avatar */}
        <TouchableOpacity
          style={styles.avatarButton}
          activeOpacity={0.8}
          onPress={() => {
            try { Haptics.selectionAsync(); } catch {}
            Alert.alert('Profile', 'Signed in as Alexander (Coder)');
          }}
        >
          <Image
            source={require('../assets/images/alexander_avatar.jpg')}
            style={styles.avatarPhoto}
          />
          <View style={styles.avatarBadge} />
        </TouchableOpacity>
      </View>

      {/* ─── MAIN CONTENT AREA (HORIZONTAL PAGING) ─── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled={true}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={styles.scroll}
        contentOffset={{ x: (startingTab === 'home' ? 0 : startingTab === 'connect' ? 1 : 2) * screenWidth, y: 0 }}
      >
        {/* PAGE 1: HOME */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <HomeView
              pulseAnim={pulseAnim}
              syncedId={syncedId}
              onSync={handleSync}
              role="Coder"
              onTerminalPress={() => {
                try { Haptics.selectionAsync(); } catch {}
                setTerminalVisible(true);
              }}
              onScanPress={() => router.push('/camera')}
              onPairPress={() => {
                try { Haptics.selectionAsync(); } catch {}
                setPairVisible(true);
              }}
              onHistoryPress={() => {
                try { Haptics.selectionAsync(); } catch {}
                setInspectDigest(null);
                setHistoryVisible(true);
              }}
              onInspectDiff={(digest) => {
                try { Haptics.selectionAsync(); } catch {}
                setInspectDigest(digest);
                setHistoryVisible(true);
              }}
            />
            <View style={{ height: 110 }} />
          </ScrollView>
        </View>

        {/* PAGE 2: CONNECT */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <ConnectView
              onScanPress={() => router.push('/camera')}
              showToast={showToast}
            />
            <View style={{ height: 110 }} />
          </ScrollView>
        </View>

        {/* PAGE 3: PROJECTS */}
        <View style={{ width: screenWidth }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <ProjectsView
              showToast={showToast}
            />
            <View style={{ height: 110 }} />
          </ScrollView>
        </View>
      </ScrollView>

      {/* ─── FLOATING CAPSULE NAVBAR ─── */}
      <FloatingBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onConnectPress={() => handleTabChange('connect')}
      />

      {/* ─── MODAL MENU ─── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.modalContainer}>
            <BlurView intensity={70} tint="dark" style={[styles.modalGlass, { paddingTop: headerPaddingTop + 20 }]}>
              <Text style={styles.modalTitle}>Relay Workspace</Text>
              
              <TouchableOpacity style={styles.menuOption} onPress={() => { setMenuVisible(false); showToast('Switched to relay-mobile'); }}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#E4E4E7" strokeWidth={2}>
                  <Path d="M4 19h16" />
                  <Path d="M4 15h16" />
                  <Path d="M4 11h16" />
                  <Path d="M4 7h16" />
                </Svg>
                <View style={styles.menuOptionTextGroup}>
                  <Text style={styles.menuOptionTitle}>Switch Workspace</Text>
                  <Text style={styles.menuOptionSubtitle}>relay-core</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={() => { setMenuVisible(false); showToast('Checking out branch...'); }}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#E4E4E7" strokeWidth={2}>
                  <Circle cx="6" cy="6" r="3" />
                  <Circle cx="6" cy="18" r="3" />
                  <Path d="M6 9v6" />
                  <Path d="M18 9v1" />
                  <Path d="M18 9a3 3 0 1 0-3-3" />
                  <Path d="M18 10c0 1.66-1.34 3-3 3H9" />
                </Svg>
                <View style={styles.menuOptionTextGroup}>
                  <Text style={styles.menuOptionTitle}>Change Branch</Text>
                  <Text style={styles.menuOptionSubtitle}>main</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuOption} onPress={() => { setMenuVisible(false); showToast('Copilot Disconnected'); }}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2}>
                  <Path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  <Line x1="12" y1="2" x2="12" y2="12" />
                </Svg>
                <View style={styles.menuOptionTextGroup}>
                  <Text style={[styles.menuOptionTitle, { color: '#EF4444' }]}>Disconnect AI</Text>
                  <Text style={styles.menuOptionSubtitle}>Active session will end</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.modalDragHandle} />
            </BlurView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ─── TERMINAL CONSOLE MODAL ─── */}
      <TerminalModal
        visible={terminalVisible}
        onClose={() => setTerminalVisible(false)}
        showToast={showToast}
      />

      {/* ─── WORKSPACE HISTORY & DIFF INSPECTOR MODAL ─── */}
      <HistoryModal
        visible={historyVisible}
        onClose={() => {
          setHistoryVisible(false);
          setInspectDigest(null);
        }}
        inspectDigest={inspectDigest}
        onInjectContext={(d) => {
          handleSync({
            id: d.event_id,
            author: d.source_user,
            initials: d.source_user.slice(0, 2).toUpperCase(),
            timeAgo: 'just now',
            file: d.file_path,
            description: d.summary,
            isImportant: d.significance === 'High',
          });
        }}
        showToast={showToast}
      />

      {/* ─── QUICK PAIR MODAL ─── */}
      <PairModal
        visible={pairVisible}
        onClose={() => setPairVisible(false)}
        onNavigateToConnect={() => handleTabChange('connect')}
        showToast={showToast}
      />

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 999,
    alignItems: 'center',
  },
  toastBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  toastDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContainer: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  modalGlass: {
    padding: 24,
    paddingBottom: 24,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginTop: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuOptionTextGroup: {
    marginLeft: 16,
  },
  menuOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuOptionSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#A1A1AA',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F4F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'relative',
  },
  avatarPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E4E4E7',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
});
