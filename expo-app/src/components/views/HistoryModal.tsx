import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Share,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { getDigestsHistory, type RelevanceDigest } from '../../services/api';

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  inspectDigest?: RelevanceDigest | null;
  onInjectContext?: (digest: RelevanceDigest) => void;
  showToast?: (text: string) => void;
}

const MOCK_HISTORY: RelevanceDigest[] = [
  {
    event_id: 'evt-hist-1',
    summary: 'Added JWT claims validation and refreshed token expiry logic in auth middleware',
    significance: 'High',
    target_roles: ['Coder', 'Debugger', 'Deployer'],
    diff_snippet: `@@ -45,8 +45,14 @@ func AuthMiddleware(next http.Handler) http.Handler {
-	claims := &Claims{}
-	token, err := jwt.ParseWithClaims(tokenStr, claims, keyFunc)
+	claims := &JWTClaims{}
+	token, err := jwt.ParseWithClaims(tokenStr, claims, keyFunc,
+		jwt.WithValidMethods([]string{"HS256", "ES256"}),
+		jwt.WithLeeway(5*time.Second),
+	)
+	if err != nil || !token.Valid {
+		return http.ErrInvalidToken
+	}`,
    file_path: 'backend/internal/auth/session.go',
    source_user: 'Divyansh',
    created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
  {
    event_id: 'evt-hist-2',
    summary: 'Updated AST diff extraction regex for multi-line struct definitions in Go',
    significance: 'High',
    target_roles: ['Coder', 'Debugger'],
    diff_snippet: `@@ -88,6 +88,11 @@ func (f *Filter) extractSignatures(diff string) []Signature {
+	// Match multi-line struct, interface, and func signatures
+	sigRe := regexp.MustCompile(\`(?m)^[+-]\\s*(type\\s+\\w+\\s+(struct|interface)|func\\s+.*\\))\`)
+	matches := sigRe.FindAllString(diff, -1)
+	return parseSignatures(matches)
 }`,
    file_path: 'backend/internal/filter/relevance.go',
    source_user: 'Sarah',
    created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    event_id: 'evt-hist-3',
    summary: 'Wired ConnectView with GitHub repository tracking alongside VS Code extension',
    significance: 'Medium',
    target_roles: ['Coder', 'Deployer'],
    diff_snippet: `@@ -22,6 +22,12 @@ export const ConnectView: React.FC<ConnectViewProps> = () => {
+	const [trackingSource, setTrackingSource] = useState<'extension' | 'github'>('extension');
+	const [githubRepo, setGithubRepo] = useState('relay-context/workspace');
+	const [githubBranch, setGithubBranch] = useState('main');`,
    file_path: 'expo-app/src/components/views/ConnectView.tsx',
    source_user: 'Alexander',
    created_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
  },
  {
    event_id: 'evt-hist-4',
    summary: 'Cleaned up error handling on workspace event ingestion endpoint',
    significance: 'Medium',
    target_roles: ['Debugger'],
    diff_snippet: `@@ -102,4 +102,8 @@ func (h *handlers) createEvent(w http.ResponseWriter, r *http.Request) {
-	if err != nil { log.Println(err) }
+	if err := h.store.SaveDigest(digest); err != nil {
+		h.logger.Error("failed to persist digest", "error", err)
+		h.writeError(w, http.StatusInternalServerError, "STORE_ERROR", "could not save digest")
+		return
+	}`,
    file_path: 'backend/internal/api/handlers.go',
    source_user: 'Sarah',
    created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
  {
    event_id: 'evt-hist-5',
    summary: 'Added Dockerfile multi-stage build configuration for lightweight Go container',
    significance: 'Medium',
    target_roles: ['Deployer'],
    diff_snippet: `@@ -1,5 +1,12 @@
+FROM golang:1.22-alpine AS builder
+WORKDIR /app
+COPY . .
+RUN CGO_ENABLED=0 GOOS=linux go build -o relay-backend .
+FROM alpine:latest
+COPY --from=builder /app/relay-backend /relay-backend
+EXPOSE 8080
+CMD ["/relay-backend"]`,
    file_path: 'backend/Dockerfile',
    source_user: 'Alex',
    created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
  },
];

export const HistoryModal: React.FC<HistoryModalProps> = ({
  visible,
  onClose,
  inspectDigest,
  onInjectContext,
  showToast,
}) => {
  const [items, setItems] = useState<RelevanceDigest[]>(MOCK_HISTORY);
  const [selectedItem, setSelectedItem] = useState<RelevanceDigest | null>(inspectDigest || null);
  const [filter, setFilter] = useState<'All' | 'High' | 'Medium'>('All');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inspectDigest) {
      setSelectedItem(inspectDigest);
    }
  }, [inspectDigest]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      getDigestsHistory()
        .then((data) => {
          if (data && data.length > 0) {
            // Merge backend digests with mock history
            const merged = [...data];
            MOCK_HISTORY.forEach((m) => {
              if (!merged.find((i) => i.event_id === m.event_id)) {
                merged.push(m);
              }
            });
            setItems(merged);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const filteredItems = items.filter((item) => {
    if (filter === 'High') return item.significance === 'High';
    if (filter === 'Medium') return item.significance === 'Medium';
    return true;
  });

  const handleShareDiff = async (snippet: string) => {
    try {
      await Share.share({
        message: snippet,
        title: 'Relay Workspace Diff',
      });
    } catch {}
  };

  const handleInject = (item: RelevanceDigest) => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    onInjectContext?.(item);
    showToast?.(`Context injected for ${item.file_path}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <BlurView intensity={95} tint="dark" style={styles.glassBackground}>
            {/* ─── HEADER ─── */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>
                  {selectedItem ? 'Diff Inspector' : 'Workspace History'}
                </Text>
                <Text style={styles.subtitle}>
                  {selectedItem ? selectedItem.file_path : `${filteredItems.length} diff events recorded`}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (selectedItem && !inspectDigest) {
                    setSelectedItem(null);
                  } else {
                    onClose();
                  }
                }}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBtnText}>
                  {selectedItem && !inspectDigest ? '← Back' : '✕'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ─── DETAIL VIEW (INSPECT DIFF) ─── */}
            {selectedItem ? (
              <ScrollView style={styles.detailBody} contentContainerStyle={styles.detailContent}>
                {/* Meta details */}
                <View style={styles.diffMetaCard}>
                  <View style={styles.diffMetaRow}>
                    <View style={styles.authorBadge}>
                      <Text style={styles.authorEmoji}>👨🏻‍💻</Text>
                      <Text style={styles.authorName}>{selectedItem.source_user}</Text>
                    </View>
                    <View
                      style={[
                        styles.significanceBadge,
                        selectedItem.significance === 'High' && styles.significanceBadgeHigh,
                      ]}
                    >
                      <Text style={styles.significanceText}>{selectedItem.significance} Impact</Text>
                    </View>
                  </View>

                  <Text style={styles.diffSummary}>{selectedItem.summary}</Text>

                  <View style={styles.targetRolesRow}>
                    <Text style={styles.targetRoleLabel}>Roles notified:</Text>
                    {selectedItem.target_roles.map((r) => (
                      <View key={r} style={styles.roleChip}>
                        <Text style={styles.roleChipText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Diff Viewer */}
                <View style={styles.diffCodeContainer}>
                  <View style={styles.diffCodeHeader}>
                    <Text style={styles.diffCodeTitle}>{selectedItem.file_path}</Text>
                    <TouchableOpacity
                      onPress={() => handleShareDiff(selectedItem.diff_snippet || 'No diff snippet')}
                      style={styles.copyBtn}
                    >
                      <Text style={styles.copyBtnText}>Share / Copy</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.diffLinesBox}>
                      {(selectedItem.diff_snippet || '// No raw diff snippet recorded for this change.')
                        .split('\n')
                        .map((line, idx) => {
                          const isAdd = line.startsWith('+');
                          const isDel = line.startsWith('-');
                          const isChunk = line.startsWith('@');
                          return (
                            <View
                              key={idx}
                              style={[
                                styles.diffLineRow,
                                isAdd && styles.diffLineAdd,
                                isDel && styles.diffLineDel,
                                isChunk && styles.diffLineChunk,
                              ]}
                            >
                              <Text style={styles.diffLineNum}>{idx + 1}</Text>
                              <Text
                                style={[
                                  styles.diffLineCode,
                                  isAdd && styles.diffCodeAdd,
                                  isDel && styles.diffCodeDel,
                                  isChunk && styles.diffCodeChunk,
                                ]}
                              >
                                {line}
                              </Text>
                            </View>
                          );
                        })}
                    </View>
                  </ScrollView>
                </View>

                {/* Bottom action button */}
                <TouchableOpacity
                  style={styles.injectBtn}
                  activeOpacity={0.85}
                  onPress={() => handleInject(selectedItem)}
                >
                  <Text style={styles.injectBtnText}>⚡ Inject Context into AI Assistant</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              /* ─── LIST VIEW ─── */
              <>
                {/* Filter chips */}
                <View style={styles.filterRow}>
                  {(['All', 'High', 'Medium'] as const).map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.filterChip, filter === f && styles.filterChipActive]}
                      onPress={() => {
                        try { Haptics.selectionAsync(); } catch {}
                        setFilter(f);
                      }}
                    >
                      <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                        {f === 'All' ? 'All Changes' : `${f} Priority`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {loading ? (
                  <ActivityIndicator color="#FFFFFF" style={{ marginVertical: 32 }} />
                ) : (
                  <ScrollView style={styles.listBody} contentContainerStyle={styles.listContent}>
                    {filteredItems.map((item) => (
                      <TouchableOpacity
                        key={item.event_id}
                        style={styles.historyCard}
                        activeOpacity={0.8}
                        onPress={() => {
                          try { Haptics.selectionAsync(); } catch {}
                          setSelectedItem(item);
                        }}
                      >
                        <View style={styles.cardTopRow}>
                          <Text style={styles.cardAuthor}>
                            {item.source_user}{' '}
                            <Text style={styles.cardDot}>• {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          </Text>
                          <View
                            style={[
                              styles.significanceBadge,
                              item.significance === 'High' && styles.significanceBadgeHigh,
                            ]}
                          >
                            <Text style={styles.significanceText}>{item.significance}</Text>
                          </View>
                        </View>

                        <Text style={styles.cardFile}>{item.file_path}</Text>
                        <Text style={styles.cardSummary} numberOfLines={2}>
                          {item.summary}
                        </Text>

                        <View style={styles.cardBottomRow}>
                          <Text style={styles.inspectHint}>Inspect Diff →</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            )}
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
    height: '86%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  glassBackground: {
    flex: 1,
    backgroundColor: 'rgba(16, 18, 24, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  filterChipTextActive: {
    color: '#18181B',
  },
  listBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 32,
    gap: 12,
  },
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E4E4E7',
  },
  cardDot: {
    fontWeight: '400',
    color: '#71717A',
  },
  cardFile: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 6,
  },
  cardSummary: {
    fontSize: 13,
    color: '#A1A1AA',
    lineHeight: 18,
    marginBottom: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  inspectHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  significanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  significanceBadgeHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
  },
  significanceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
    textTransform: 'uppercase',
  },
  detailBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  detailContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  diffMetaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  diffMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorEmoji: {
    fontSize: 18,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  diffSummary: {
    fontSize: 14,
    color: '#E4E4E7',
    lineHeight: 20,
    marginBottom: 12,
  },
  targetRolesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetRoleLabel: {
    fontSize: 11,
    color: '#71717A',
  },
  roleChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  diffCodeContainer: {
    backgroundColor: '#090A0F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  diffCodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  diffCodeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  diffLinesBox: {
    paddingVertical: 8,
    minWidth: '100%',
  },
  diffLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  diffLineAdd: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  diffLineDel: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  diffLineChunk: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  diffLineNum: {
    width: 28,
    fontSize: 11,
    color: '#52525B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  diffLineCode: {
    fontSize: 12,
    color: '#D4D4D8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  diffCodeAdd: {
    color: '#4ADE80',
  },
  diffCodeDel: {
    color: '#F87171',
  },
  diffCodeChunk: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  injectBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  injectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18181B',
  },
});
