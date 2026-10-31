import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Rect, Circle, Polyline, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  getSessions,
  getLatestDigest,
  getStreamUrl,
  type Role,
  type RoleSession,
  type RelevanceDigest,
} from '../../services/api';
import { SSEClient } from '../../services/sse';

// â”€â”€â”€ Public Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ActivityItem {
  id: string;
  author: string;
  initials: string;
  timeAgo: string;
  file: string;
  description: string;
  isImportant?: boolean;
}

export interface Teammate {
  id: string;
  name: string;
  initials: string;
  emoji: string;
  editor: string;
  activeFile: string;
  isOnline: boolean;
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ROLE_EMOJI: Record<Role, string> = {
  Coder: 'ðŸ‘¨ðŸ»â€ðŸ’»',
  Debugger: 'ðŸ”',
  Deployer: 'ðŸš€',
};

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s`;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  return `${Math.round(diff / 3600)}h`;
}

function digestToActivity(d: RelevanceDigest): ActivityItem {
  const initials = d.source_user
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
  return {
    id: d.event_id,
    author: d.source_user,
    initials,
    timeAgo: relativeTime(d.created_at),
    file: d.file_path,
    description: d.summary,
    isImportant: d.significance === 'High',
  };
}

function sessionToTeammate(s: RoleSession): Teammate {
  const initials = s.user
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
  return {
    id: `${s.user}-${s.role}`,
    name: s.user,
    initials,
    emoji: ROLE_EMOJI[s.role] ?? '🧑‍💻',
    editor: s.role,
    activeFile: '',
    isOnline: true,
  };
}

// ─── Mock Fallback Data (used when backend is unreachable) ───────────────────
const MOCK_TEAMMATES: Teammate[] = [
  { id: 'tm-1', name: 'Divyansh', initials: 'DS', emoji: '👨🏻‍💻', editor: 'Coder', activeFile: '', isOnline: true },
  { id: 'tm-2', name: 'Sarah', initials: 'SL', emoji: '🔍', editor: 'Debugger', activeFile: '', isOnline: true },
  { id: 'tm-3', name: 'Alex', initials: 'AK', emoji: '🚀', editor: 'Deployer', activeFile: '', isOnline: true },
];
const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: 'act-1', author: 'Divyansh', initials: 'DS', timeAgo: '2m', file: 'auth/session.go', description: 'Added JWT claims validation and refreshed token expiry logic in auth middleware.', isImportant: true },
  { id: 'act-2', author: 'Sarah', initials: 'SL', timeAgo: '8m', file: 'filter/relevance.go', description: 'Updated AST diff extraction regex for multi-line struct definitions in Go.', isImportant: true },
  { id: 'act-3', author: 'Alex', initials: 'AK', timeAgo: '21m', file: 'api/handlers.go', description: 'Cleaned up error handling on workspace event ingestion endpoint.', isImportant: false },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface HomeViewProps {
  pulseAnim: Animated.Value;
  syncedId: string | null;
  onSync: (item: ActivityItem) => void;
  onTerminalPress?: () => void;
  micActive?: boolean;
  onToggleMic?: () => void;
  onScanPress: () => void;
  onPairPress: () => void;
  onHistoryPress: () => void;
  onInspectDiff?: (digest: RelevanceDigest) => void;
  role?: Role;
}

export const HomeView: React.FC<HomeViewProps> = ({
  pulseAnim,
  syncedId,
  onSync,
  onTerminalPress,
  micActive,
  onToggleMic,
  onScanPress,
  onPairPress,
  onHistoryPress,
  onInspectDiff,
  role = 'Coder',
}) => {
  const [filter, setFilter] = useState<'All' | 'Important'>('All');
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [heroDigest, setHeroDigest] = useState<RelevanceDigest | null>(null);
  const [loading, setLoading] = useState(true);

  const sseRef = useRef<SSEClient | null>(null);

  // ── Fetch initial data, fall back to mocks if backend unreachable or empty ─
  const loadData = useCallback(async () => {
    try {
      const [sessions, digest] = await Promise.all([
        getSessions(),
        getLatestDigest(role),
      ]);
      setTeammates(sessions && sessions.length > 0 ? sessions.map(sessionToTeammate) : MOCK_TEAMMATES);
      if (digest) {
        setHeroDigest(digest);
        setActivities([digestToActivity(digest), ...MOCK_ACTIVITIES.slice(0, 2)]);
      } else {
        setActivities(MOCK_ACTIVITIES);
      }
    } catch (e) {
      console.warn('[HomeView] Initial fetch failed, using fallback data:', e);
      setTeammates(MOCK_TEAMMATES);
      setActivities(MOCK_ACTIVITIES);
    } finally {
      setLoading(false);
    }
  }, [role]);

  // â”€â”€ SSE: real-time digest push â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    loadData();

    const client = new SSEClient(
      getStreamUrl(role),
      (digest) => {
        const item = digestToActivity(digest);
        setActivities((prev) => {
          // Deduplicate by event_id
          if (prev.find((a) => a.id === item.id)) return prev;
          return [item, ...prev];
        });
        // Also update hero card if this is more recent
        setHeroDigest((prev) =>
          !prev || new Date(digest.created_at) > new Date(prev.created_at)
            ? digest
            : prev
        );
      },
      (err) => console.warn('[HomeView] SSE error:', err),
    );
    client.connect();
    sseRef.current = client;

    return () => {
      sseRef.current?.disconnect();
      sseRef.current = null;
    };
  }, [role, loadData]);

  const filteredActivities = activities.filter((item) => {
    if (filter === 'Important') return item.isImportant;
    return true;
  });

  const onlineCount = teammates.filter((t) => t.isOnline).length;

  return (
    <View style={styles.container}>
      {/* â”€â”€â”€ GREETING SECTION â”€â”€â”€ */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingTitle}>
          <Text style={styles.greetingBold}>
            {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}
            {'\n'}
          </Text>
          <Text style={styles.greetingLight}>Developer</Text>
        </Text>
        <Text style={styles.greetingSubtitle}>Relay context is actively synchronized.</Text>
      </View>

      {/* â”€â”€â”€ HERO CARD â”€â”€â”€ */}
      <View style={styles.heroCard}>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroStatusChip}>
            <Animated.View style={[styles.pulseAura, { opacity: pulseAnim }]} />
            <View style={styles.statusDotSolid} />
            <Text style={styles.statusText}>LIVE SYNC</Text>
          </View>
          <Text style={styles.branchLabel}>relay / main</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#FFFFFF" style={{ marginVertical: 24 }} />
        ) : heroDigest ? (
          <>
            <Text style={styles.heroFileTitle}>{heroDigest.file_path}</Text>
            <Text style={styles.heroDescription}>{heroDigest.summary}</Text>
            <View style={styles.heroButtonRow}>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                activeOpacity={0.85}
                onPress={() => onSync(digestToActivity(heroDigest))}
              >
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#18181B" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </Svg>
                <Text style={styles.primaryActionText}>
                  {syncedId === heroDigest.event_id ? 'Injected âœ“' : 'Inject Context'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                activeOpacity={0.8}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch {}
                  if (onInspectDiff && heroDigest) {
                    onInspectDiff(heroDigest);
                  } else {
                    onHistoryPress();
                  }
                }}
              >
                <Text style={styles.secondaryActionText}>Inspect Diff</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.heroFileTitle}>No updates yet</Text>
            <Text style={styles.heroDescription}>
              Open a file in VS Code and save it â€” Relay will stream the diff here.
            </Text>
            <View style={styles.heroButtonRow}>
              <TouchableOpacity style={styles.secondaryActionBtn} activeOpacity={0.8} onPress={onPairPress}>
                <Text style={styles.secondaryActionText}>Pair your IDE â†’</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* â”€â”€â”€ 4-GRID QUICK ACTIONS â”€â”€â”€ */}
      <BlurView intensity={20} tint="dark" style={styles.shortcutsGrid}>
        <TouchableOpacity style={[styles.shortcutTile, styles.shortcutTileDivider]} activeOpacity={0.7}
          onPress={() => { try { Haptics.selectionAsync(); } catch {} onTerminalPress?.(); }}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="4 17 10 11 4 5" />
            <Line x1="12" y1="19" x2="20" y2="19" />
          </Svg>
          <Text style={styles.shortcutLabel}>Terminal</Text>
          <View style={styles.shortcutIndicator} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.shortcutTile, styles.shortcutTileDivider]} activeOpacity={0.7} onPress={onScanPress}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <Circle cx="12" cy="13" r="4" />
          </Svg>
          <Text style={styles.shortcutLabel}>Vision AI</Text>
          <View style={styles.shortcutIndicator} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.shortcutTile, styles.shortcutTileDivider]} activeOpacity={0.7} onPress={onPairPress}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 8V5a1 1 0 0 1 1-1h3" />
            <Path d="M16 4h3a1 1 0 0 1 1 1v3" />
            <Path d="M20 16v3a1 1 0 0 1-1 1h-3" />
            <Path d="M8 20H5a1 1 0 0 1-1-1v-3" />
            <Rect x="8.5" y="8.5" width="7" height="7" rx="1.5" />
          </Svg>
          <Text style={styles.shortcutLabel}>Pair IDE</Text>
          <View style={styles.shortcutIndicator} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.shortcutTile} activeOpacity={0.7} onPress={onHistoryPress}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="12" cy="12" r="10" />
            <Polyline points="12 6 12 12 16 14" />
          </Svg>
          <Text style={styles.shortcutLabel}>History</Text>
          <View style={styles.shortcutIndicator} />
        </TouchableOpacity>
      </BlurView>

      {/* â”€â”€â”€ RECENT MEMBERS â”€â”€â”€ */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent members</Text>
        <Text style={styles.sectionMeta}>{onlineCount > 0 ? `${onlineCount} active` : 'none online'}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#71717A" style={{ marginBottom: 24 }} />
      ) : teammates.length === 0 ? (
        <Text style={styles.emptyState}>No sessions found. Register a role in VS Code to appear here.</Text>
      ) : (
        <ScrollView
          horizontal
          nestedScrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.teamScroll}
        >
          {teammates.map((tm) => (
            <TouchableOpacity
              key={tm.id}
              style={styles.spotifyArtistCard}
              activeOpacity={0.7}
              onPress={() => { try { Haptics.selectionAsync(); } catch {} }}
            >
              <View style={[styles.spotifyArtistImage, { backgroundColor: '#000000' }]}>
                <Text style={styles.spotifyArtistEmoji}>{tm.emoji}</Text>
              </View>
              <Text style={styles.spotifyArtistName} numberOfLines={1}>{tm.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* â”€â”€â”€ RECENT UPDATES â”€â”€â”€ */}
      <View style={[styles.sectionHeader, { marginTop: 28 }]}>
        <Text style={styles.sectionTitle}>Recent updates</Text>
        <View style={styles.filterPillRow}>
          {(['All', 'Important'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => { try { Haptics.selectionAsync(); } catch {} setFilter(f); }}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.timelineList}>
        {loading ? (
          <ActivityIndicator color="#71717A" />
        ) : filteredActivities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>Waiting for workspace activity</Text>
            <Text style={styles.emptyCardBody}>
              Save a file in VS Code â€” it will appear here instantly via live stream.
            </Text>
          </View>
        ) : (
          filteredActivities.map((item) => {
            const isSynced = syncedId === item.id;
            return (
              <View key={item.id} style={styles.timelineCard}>
                <View style={styles.timelineTopRow}>
                  <Text style={styles.timelineAuthor}>
                    {item.author} <Text style={styles.timelineTime}>â€¢ {item.timeAgo}</Text>
                  </Text>
                  <Text style={styles.timelineFileTag}>{item.file}</Text>
                </View>
                <Text style={styles.timelineDesc}>{item.description}</Text>
                <View style={styles.timelineBottomRow}>
                  <TouchableOpacity
                    style={[styles.syncActionBtn, isSynced && styles.syncActionBtnActive]}
                    activeOpacity={0.7}
                    onPress={() => onSync(item)}
                  >
                    <Text style={[styles.syncActionText, isSynced && styles.syncActionTextActive]}>
                      {isSynced ? 'Synced âœ“' : 'Sync Context â†’'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  greetingSection: {
    marginBottom: 20,
  },
  greetingTitle: {
    letterSpacing: -0.8,
  },
  greetingBold: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  greetingLight: {
    fontSize: 34,
    fontWeight: '300',
    color: '#E4E4E7',
  },
  greetingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#A1A1AA',
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: '#161618',
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pulseAura: {
    position: 'absolute',
    left: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusDotSolid: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E4E4E7',
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E4E4E7',
    letterSpacing: 0.8,
  },
  branchLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  heroFileTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  heroDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#A1A1AA',
    lineHeight: 20,
    marginBottom: 18,
  },
  heroButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181B',
  },
  secondaryActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E4E4E7',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    marginBottom: 24,
    marginHorizontal: -20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  shortcutTile: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTileDivider: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E4E4E7',
    marginTop: 10,
    marginBottom: 8,
  },
  shortcutIndicator: {
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#22C55E',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '500',
    color: '#A1A1AA',
  },
  emptyState: {
    fontSize: 13,
    color: '#71717A',
    marginBottom: 24,
    lineHeight: 18,
  },
  teamScroll: {
    gap: 10,
    paddingRight: 20,
  },
  spotifyArtistCard: {
    alignItems: 'center',
    width: 88,
  },
  spotifyArtistImage: {
    width: 88,
    height: 88,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  spotifyArtistEmoji: {
    fontSize: 50,
  },
  spotifyArtistName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  filterPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F4F4F6',
  },
  filterChipActive: {
    backgroundColor: '#18181B',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717A',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timelineList: {
    gap: 10,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyCardBody: {
    fontSize: 12,
    color: '#52525B',
    textAlign: 'center',
    lineHeight: 17,
  },
  timelineCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timelineAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timelineTime: {
    fontWeight: '400',
    color: '#A1A1AA',
  },
  timelineFileTag: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6366F1',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  timelineDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: '#D4D4D8',
    lineHeight: 18,
    marginBottom: 12,
  },
  timelineBottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  syncActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F4F4F6',
  },
  syncActionBtnActive: {
    backgroundColor: '#22C55E',
  },
  syncActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27272A',
  },
  syncActionTextActive: {
    color: '#FFFFFF',
  },
});
