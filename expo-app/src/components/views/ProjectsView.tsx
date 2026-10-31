import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { ProjectWorkspaceView } from './ProjectWorkspaceView';

export interface ProjectWorkspace {
  id: string;
  name: string;
  description: string;
  branch: string;
  diffCount: number;
  filesModified: number;
  isActive: boolean;
  language: string;
  lastSync: string;
}

const INITIAL_PROJECTS: ProjectWorkspace[] = [
  {
    id: 'proj-1',
    name: 'relay-core',
    description: 'Real-time Go context engine, SSE broadcaster & relevance filter.',
    branch: 'main',
    diffCount: 3,
    filesModified: 4,
    isActive: true,
    language: 'Go',
    lastSync: 'Just now',
  },
  {
    id: 'proj-2',
    name: 'relay-app',
    description: 'Expo React Native mobile digest client with capsule navigation.',
    branch: 'feat/capsule-nav',
    diffCount: 6,
    filesModified: 5,
    isActive: false,
    language: 'TypeScript',
    lastSync: '8m ago',
  },
  {
    id: 'proj-3',
    name: 'relay-vscode',
    description: 'VS Code extension for diff capture and @relay chat participant.',
    branch: 'main',
    diffCount: 0,
    filesModified: 0,
    isActive: false,
    language: 'TypeScript',
    lastSync: '1h ago',
  },
  {
    id: 'proj-4',
    name: 'relay-ai-gateway',
    description: 'OpenAI Whisper & Gemini Flash intent evaluation pipeline.',
    branch: 'eval/intent-models',
    diffCount: 2,
    filesModified: 2,
    isActive: false,
    language: 'Python',
    lastSync: 'Yesterday',
  },
];

interface ProjectsViewProps {
  showToast: (msg: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ showToast }) => {
  const [projects, setProjects] = useState<ProjectWorkspace[]>(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Active' | 'Modified'>('All');
  const [selectedProject, setSelectedProject] = useState<ProjectWorkspace | null>(null);

  const activeProject = projects.find((p) => p.isActive) ?? projects[0];

  const handleSetActive = (projectId: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        isActive: p.id === projectId,
      }))
    );
    const target = projects.find((p) => p.id === projectId);
    showToast(`Active context switched to ${target?.name ?? 'project'}`);
  };

  const handleOpenWorkspace = (project: ProjectWorkspace) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    handleSetActive(project.id);
    setSelectedProject(project);
    showToast(`Opened workspace: ${project.name}`);
  };

  const handleAddProject = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    Alert.prompt
      ? Alert.prompt(
          'Add Workspace',
          'Enter repository path or git remote URL:',
          (text) => {
            if (text) {
              const newProj: ProjectWorkspace = {
                id: `proj-${Date.now()}`,
                name: text.split('/').pop()?.replace('.git', '') || text,
                description: 'Custom added repository workspace.',
                branch: 'main',
                diffCount: 0,
                filesModified: 0,
                isActive: false,
                language: 'TypeScript',
                lastSync: 'Never',
              };
              setProjects((prev) => [newProj, ...prev]);
              showToast(`Added workspace ${newProj.name}`);
            }
          }
        )
      : Alert.alert('Add Workspace', 'To link a workspace, run "Relay: Initialize Repository" from VS Code.');
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'Active') return p.isActive;
    if (filterType === 'Modified') return p.diffCount > 0;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* ─── FULLSCREEN WORKSPACE MODAL ─── */}
      <Modal
        visible={!!selectedProject}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setSelectedProject(null)}
      >
        {selectedProject && (
          <ProjectWorkspaceView
            project={selectedProject}
            onBack={() => setSelectedProject(null)}
            showToast={showToast}
          />
        )}
      </Modal>

      {/* ─── HEADER ─── */}
      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>
          <Text style={styles.titleBold}>Projects{'\n'}</Text>
          <Text style={styles.titleLight}>& Workspaces</Text>
        </Text>
        <Text style={styles.subtitle}>
          Active repositories feeding real-time context to your AI assistant.
        </Text>
      </View>

      {/* ─── ACTIVE CONTEXT HERO CARD ─── */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.activeBadge}>
            <View style={styles.statusDotSolid} />
            <Text style={styles.activeBadgeText}>ACTIVE CONTEXT</Text>
          </View>
          <Text style={styles.syncTimeText}>{activeProject.lastSync}</Text>
        </View>

        <Text style={styles.heroProjectName}>{activeProject.name}</Text>
        <Text style={styles.heroProjectDesc}>{activeProject.description}</Text>

        <View style={styles.heroMetaPills}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Branch:</Text>
            <Text style={styles.heroPillVal}>{activeProject.branch}</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Diffs:</Text>
            <Text style={[styles.heroPillVal, activeProject.diffCount > 0 ? styles.textAmber : styles.textGreen]}>
              {activeProject.diffCount > 0 ? `${activeProject.diffCount} pending` : 'Clean'}
            </Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillLabel}>Lang:</Text>
            <Text style={styles.heroPillVal}>{activeProject.language}</Text>
          </View>
        </View>

        <View style={styles.heroBtnRow}>
          <TouchableOpacity
            style={styles.heroPrimaryBtn}
            activeOpacity={0.8}
            onPress={() => handleOpenWorkspace(activeProject)}
          >
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#18181B" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M5 12h14" />
              <Polyline points="12 5 19 12 12 19" />
            </Svg>
            <Text style={styles.heroPrimaryBtnText}>Open Workspace</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.heroSecondaryBtn}
            activeOpacity={0.8}
            onPress={() => showToast(`Syncing all ${activeProject.diffCount} diffs to Copilot`)}
          >
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M21 2v6h-6" />
              <Path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <Path d="M3 22v-6h6" />
              <Path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </Svg>
            <Text style={styles.heroSecondaryBtnText}>Sync</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── SEARCH & FILTER BAR ─── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="11" cy="11" r="8" />
            <Line x1="21" y1="21" x2="16.65" y2="16.65" />
          </Svg>
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor="#A1A1AA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.8}
          onPress={handleAddProject}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterChipsRow}>
        {(['All', 'Active', 'Modified'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterChip, filterType === t && styles.filterChipActive]}
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              setFilterType(t);
            }}
          >
            <Text style={[styles.filterChipText, filterType === t && styles.filterChipTextActive]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── WORKSPACES LIST ─── */}
      <View style={styles.projectsList}>
        {filteredProjects.map((item) => {
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.projectCard, item.isActive && styles.projectCardActive]}
              activeOpacity={0.85}
              onPress={() => handleOpenWorkspace(item)}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.nameWithIcon}>
                  <View style={styles.folderIconBox}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#18181B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </Svg>
                  </View>
                  <View>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <Text style={styles.cardBranch}>{item.branch}</Text>
                  </View>
                </View>

                <View style={styles.openWorkspaceBadge}>
                  <Text style={styles.openWorkspaceBadgeText}>Workspace →</Text>
                </View>
              </View>

              <Text style={styles.cardDesc}>{item.description}</Text>

              <View style={styles.cardBottomRow}>
                <View style={styles.cardTag}>
                  <Text style={styles.cardTagText}>{item.language}</Text>
                </View>
                <Text style={styles.cardDiffText}>
                  {item.diffCount > 0 ? `${item.diffCount} pending diffs` : 'Clean workspace'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
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
  heroCard: {
    backgroundColor: '#161618',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDotSolid: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4ADE80',
    letterSpacing: 0.8,
  },
  syncTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717A',
  },
  heroProjectName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroProjectDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: '#A1A1AA',
    lineHeight: 18,
    marginBottom: 16,
  },
  heroMetaPills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  heroPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  heroPillLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717A',
  },
  heroPillVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E4E4E7',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  textGreen: {
    color: '#4ADE80',
  },
  textAmber: {
    color: '#FBBF24',
  },
  heroBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  heroPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181B',
  },
  heroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  heroSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  addBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#18181B',
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A1A1AA',
  },
  filterChipTextActive: {
    color: '#18181B',
    fontWeight: '600',
  },
  projectsList: {
    gap: 12,
    marginBottom: 20,
  },
  projectCard: {
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
  },
  projectCardActive: {
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nameWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  folderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cardBranch: {
    fontSize: 11,
    fontWeight: '500',
    color: '#71717A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  currentActiveBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  currentActiveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E4E4E7',
  },
  openWorkspaceBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  openWorkspaceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#18181B',
  },
  switchBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#18181B',
  },
  cardDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: '#D4D4D8',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  cardTag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
  },
  cardDiffText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717A',
  },
});
