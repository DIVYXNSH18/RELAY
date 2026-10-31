import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  LayoutChangeEvent,
  Dimensions,
  LayoutAnimation,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Home02Icon, FlowConnectionIcon, ChartGanttIcon } from '../icons/hugeicons';

export type TabId = 'home' | 'connect' | 'projects';

interface TabItem {
  id: TabId;
  label: string;
}

const TABS: TabItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'connect', label: 'Connect' },
  { id: 'projects', label: 'Projects' },
];

const TAB_INDICES: Record<TabId, number> = {
  home: 0,
  connect: 1,
  projects: 2,
};

interface FloatingBottomNavProps {
  activeTab?: TabId;
  onTabChange?: (tabId: TabId) => void;
  onConnectPress?: () => void;
  onScanPress?: () => void;
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  activeTab: controlledActiveTab,
  onTabChange,
  onConnectPress,
  onScanPress,
}) => {
  const insets = useSafeAreaInsets();
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>('home');
  const activeTab = controlledActiveTab ?? internalActiveTab;

  // 120Hz Hardware-accelerated sliding indicator
  // Capsule default width: 324px, inner padding: 6px each side, 3 equal slots = 104px per tab
  const [containerWidth, setContainerWidth] = useState(324);
  const tabWidth = Math.max(1, (containerWidth - 12) / 3);

  const hasInitialized = useRef(false);

  // Entrance spring animation for the floating bar (120 FPS native driver)
  const entranceY = useRef(new Animated.Value(36)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;

  // Individual scale springs for tactile press feedback (120 FPS native driver)
  const scaleHome = useRef(new Animated.Value(1)).current;
  const scaleConnect = useRef(new Animated.Value(1)).current;
  const scaleProjects = useRef(new Animated.Value(1)).current;

  const scaleMap: Record<TabId, Animated.Value> = {
    home: scaleHome,
    connect: scaleConnect,
    projects: scaleProjects,
  };

  // Entrance slide-in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(entranceY, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 1) {
      setContainerWidth(w);
    }
  };

  const handlePressIn = (tabId: TabId) => {
    const scale = scaleMap[tabId];
    if (scale) {
      Animated.spring(scale, {
        toValue: 0.82,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = (tabId: TabId) => {
    const scale = scaleMap[tabId];
    if (scale) {
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleTabPress = (tabId: TabId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInternalActiveTab(tabId);
    onTabChange?.(tabId);
    if (tabId === 'connect') {
      (onConnectPress ?? onScanPress)?.();
    }
  };

  const renderIcon = (tabId: TabId, color: string) => {
    switch (tabId) {
      case 'home':
        return <HugeiconsIcon icon={Home02Icon} size={18} color={color} strokeWidth={2.2} />;
      case 'connect':
        return <HugeiconsIcon icon={FlowConnectionIcon} size={18} color={color} strokeWidth={2.2} />;
      case 'projects':
        return <HugeiconsIcon icon={ChartGanttIcon} size={18} color={color} strokeWidth={2.2} />;
      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        styles.fullWidthWrapper,
        {
          opacity: entranceOpacity,
          transform: [{ translateY: entranceY }],
        },
      ]}
    >
      <View
        style={[styles.bottomBarContainer, { paddingBottom: Math.max(insets.bottom, 12), paddingTop: 12 }]}
      >
        {/* Tab Items */}
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const color = isActive ? '#18181B' : '#71717A';
          const scale = scaleMap[tab.id];

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              activeOpacity={1}
              onPressIn={() => handlePressIn(tab.id)}
              onPressOut={() => handlePressOut(tab.id)}
              onPress={() => handleTabPress(tab.id)}
            >
              <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>
                <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
                  {renderIcon(tab.id, color)}
                </View>
                <Text style={[styles.tabLabel, isActive ? styles.activeLabel : styles.inactiveLabel]}>
                  {tab.label}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fullWidthWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 100,
    overflow: 'hidden',
  },
  activeIconWrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  tabLabel: {
    fontSize: 11,
  },
  activeLabel: {
    color: '#18181B',
    fontWeight: '700',
  },
  inactiveLabel: {
    color: '#71717A',
    fontWeight: '500',
  },
});

export default FloatingBottomNav;
