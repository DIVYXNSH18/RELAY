import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Rect,
  Circle,
  Line,
  Polyline,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { ProjectWorkspace } from './ProjectsView';

export type WorkspaceRole = 'Coder' | 'Debugger' | 'Deployer' | 'Architect';

interface RoleOption {
  id: WorkspaceRole;
  label: string;
}

const ROLES: RoleOption[] = [
  { id: 'Coder', label: 'Coder' },
  { id: 'Debugger', label: 'Debugger' },
  { id: 'Deployer', label: 'Deployer' },
  { id: 'Architect', label: 'Architect' },
];


export interface ChatFeedItem {
  id: string;
  sender: 'teammate' | 'relay' | 'user' | 'system';
  author: string;
  role?: string;
  initials?: string;
  timeAgo: string;
  type: 'voice' | 'commit' | 'ci' | 'review' | 'text';
  text?: string;
  audioBars?: number[];
  audioDuration?: string;
  commitHash?: string;
  branch?: string;
  filesModified?: string[];
  statusBadge?: string;
}

interface ProjectWorkspaceViewProps {
  project: ProjectWorkspace;
  onBack: () => void;
  showToast: (msg: string) => void;
}

const INITIAL_CHAT_STREAM: ChatFeedItem[] = [
  {
    id: 'msg-1',
    sender: 'system',
    author: 'Relay Engine',
    timeAgo: 'Session start',
    type: 'text',
    text: 'Connected to workspace context. Real-time diff sync and voice broadcast active.',
  },
  {
    id: 'msg-2',
    sender: 'teammate',
    author: 'Sarah Chen',
    role: 'Frontend Lead',
    initials: 'SC',
    timeAgo: '2m ago',
    type: 'voice',
    text: 'Updated AST diff extraction regex for multi-line Go struct definitions. Tested on 40 files, zero regressions.',
    audioDuration: '0:24',
    audioBars: [30, 60, 85, 45, 90, 75, 40, 65, 80, 50, 95, 65, 45, 80, 60, 40, 75, 50, 30],
  },
  {
    id: 'msg-3',
    sender: 'teammate',
    author: 'Divyansh Sharma',
    role: 'Core Backend',
    initials: 'DS',
    timeAgo: '9m ago',
    type: 'commit',
    text: 'Refactored JWT claims validation and session renewal logic in auth/session.go',
    commitHash: '8f2a1b',
    branch: 'main',
    filesModified: ['auth/session.go', 'store/memory.go'],
    statusBadge: 'Synced',
  },
  {
    id: 'msg-4',
    sender: 'system',
    author: 'GitHub Actions',
    role: 'CI/CD',
    initials: 'CI',
    timeAgo: '14m ago',
    type: 'ci',
    text: 'CI Build #428 passed: 48/48 unit tests green in 1.4s. Zero leaks detected.',
    branch: 'main',
    statusBadge: 'Passed',
  },
  {
    id: 'msg-5',
    sender: 'teammate',
    author: 'Alex Rivera',
    role: 'API Engineer',
    initials: 'AR',
    timeAgo: '35m ago',
    type: 'voice',
    text: 'Cleaned up error handling on the SSE ingestion endpoint. Handshake timeout is now set to 3 seconds.',
    audioDuration: '0:18',
    audioBars: [25, 45, 65, 80, 50, 70, 85, 60, 40, 55, 75, 45, 35, 60, 45, 30, 50, 35, 20],
  },
  {
    id: 'msg-6',
    sender: 'teammate',
    author: 'Alex Rivera',
    role: 'API Engineer',
    initials: 'AR',
    timeAgo: '36m ago',
    type: 'review',
    text: 'Review requested on PR #19: SSE ingestion socket recovery and backoff retry logic.',
    branch: 'fix/sse-backoff',
    statusBadge: 'Review Needed',
  },
];

export const ProjectWorkspaceView: React.FC<ProjectWorkspaceViewProps> = ({
  project,
  onBack,
  showToast,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 24 : 16) + 6;
  const bottomInset = Math.max(insets.bottom, 20);

  // ── Mode: 'assistant' (Voice Assistant interface) vs 'chat' (Project Updates Feed) ──
  const [activeViewMode, setActiveViewMode] = useState<'assistant' | 'chat'>('assistant');

  // ── Role Selector State ──
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('Coder');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // ── Notifications Tray ──
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  // ── Assistant State: 'idle' | 'listening' | 'processing' | 'speaking' ──
  const [assistantState, setAssistantState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [assistantSubtitle, setAssistantSubtitle] = useState<string>("Say 'Hey Relay' or tap the mic");
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [typingText, setTypingText] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const typingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioPlayerRef = useRef<any>(null);

  // ── Chat Feed ──
  const [chatItems, setChatItems] = useState<ChatFeedItem[]>(INITIAL_CHAT_STREAM);
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);

  // ── Animations ──
  const logoScaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0.4)).current;
  const waveAnim2 = useRef(new Animated.Value(0.7)).current;
  const waveAnim3 = useRef(new Animated.Value(0.3)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const transcriptFadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Breathing animation on Relay logo
  useEffect(() => {
    let scaleLoop: Animated.CompositeAnimation | null = null;
    if (assistantState === 'listening') {
      scaleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(logoScaleAnim, { toValue: 1.25, duration: 550, useNativeDriver: true }),
          Animated.timing(logoScaleAnim, { toValue: 0.95, duration: 550, useNativeDriver: true }),
        ])
      );
      scaleLoop.start();
    } else if (assistantState === 'processing') {
      scaleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(logoScaleAnim, { toValue: 1.15, duration: 300, useNativeDriver: true }),
          Animated.timing(logoScaleAnim, { toValue: 0.85, duration: 300, useNativeDriver: true }),
        ])
      );
      scaleLoop.start();
    } else if (assistantState === 'speaking') {
      scaleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(logoScaleAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
          Animated.timing(logoScaleAnim, { toValue: 0.92, duration: 700, useNativeDriver: true }),
        ])
      );
      scaleLoop.start();
    } else {
      scaleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(logoScaleAnim, { toValue: 1.08, duration: 1800, useNativeDriver: true }),
          Animated.timing(logoScaleAnim, { toValue: 0.96, duration: 1800, useNativeDriver: true }),
        ])
      );
      scaleLoop.start();
    }
    return () => scaleLoop?.stop();
  }, [assistantState]);

  // Blinking cursor animation (Gemini-style)
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, []);

  // Blue glow ring pulse for listening state
  useEffect(() => {
    if (assistantState === 'listening') {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      );
      glow.start();
      Animated.timing(transcriptFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      return () => glow.stop();
    } else {
      Animated.timing(transcriptFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [assistantState]);

  // Audio wave animations
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(waveAnim1, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(waveAnim2, { toValue: 0.3, duration: 450, useNativeDriver: true }),
          Animated.timing(waveAnim3, { toValue: 0.9, duration: 350, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(waveAnim1, { toValue: 0.3, duration: 450, useNativeDriver: true }),
          Animated.timing(waveAnim2, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(waveAnim3, { toValue: 0.4, duration: 420, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    (async () => {
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    })();
    return () => {
      Speech.stop();
    };
  }, []);

  // ── Role Select Handler (Apple Haptic Selection) ──
  const handleSelectRole = (role: WorkspaceRole) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedRole(role);
    setIsRoleDropdownOpen(false);
    showToast(`Role: ${role}`);

    const roleMsg: ChatFeedItem = {
      id: `role-${Date.now()}`,
      sender: 'system',
      author: 'Workspace',
      timeAgo: 'Just now',
      type: 'text',
      text: `Active persona switched to ${role}. Relaying context for ${role.toLowerCase()}s.`,
    };
    setChatItems((prev) => [...prev, roleMsg]);
  };

  const commandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistantStateRef = useRef(assistantState);
  
  // Request microphone permissions on mount
  useEffect(() => {
    (async () => {
      try {
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      } catch (e) {
        console.warn('Failed to request speech permissions:', e);
      }
    })();
  }, []);
  
  // Keep ref in sync so event handlers always read current state
  useEffect(() => {
    assistantStateRef.current = assistantState;
  }, [assistantState]);

  // ── "Hey Relay" Voice Command Execution ──
  const triggerWakeWord = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    setAssistantState('listening');
    setAssistantSubtitle('Listening...');
    setLiveTranscript('');
    setActiveViewMode('assistant');
    showToast('🎙️ Relay is listening...');
  };

  // Helper: Start speech recognition safely
  const startListening = () => {
    try {
      ExpoSpeechRecognitionModule.start({ 
        lang: 'en-US', 
        interimResults: true, 
        continuous: true,
      });
    } catch (err) {
      console.warn('[Relay] Speech recognition start failed:', err);
    }
  };

  // ── Background Wake Word Listener ──
  useSpeechRecognitionEvent('result', (e) => {
    if (!e.results || e.results.length === 0) return;
    
    const lastResult = e.results[e.results.length - 1];
    const fullTranscript = e.results.map(r => r.transcript).join(' ').toLowerCase();
    
    if (assistantStateRef.current === 'listening') {
      // Extract command after wake word
      const wakeWordRegex = /(hey|hi|hello|ok|okay)?\s*(relay|really|riley|rene|delay)\s*(.*)/i;
      const match = fullTranscript.match(wakeWordRegex);
      
      let commandText = "";
      if (match && match[3]) {
        commandText = match[3];
      } else {
        commandText = lastResult.transcript;
      }
      
      if (commandText.trim().length > 0) {
        setLiveTranscript(commandText.trim());
      }
      
      // Smart Silence Debounce — 800ms
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
      
      if (commandText.trim().length > 0) {
        commandTimeoutRef.current = setTimeout(() => {
          ExpoSpeechRecognitionModule.stop();
          executeCommand(commandText.trim());
        }, 800);
      }
      
      // Immediate execution if engine marks final
      if (e.isFinal && commandText.trim().length > 0) {
        if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
        ExpoSpeechRecognitionModule.stop();
        executeCommand(commandText.trim());
      }
      return;
    }
    
    // Passive mode: detect wake word
    const wakeWordRegex = /(hey|hi|hello|ok|okay)?\s*(relay|really|riley|rene|delay)/i;
    if (wakeWordRegex.test(fullTranscript)) {
      triggerWakeWord();
    }
  });

  useSpeechRecognitionEvent('error', (_e) => {
    const currentState = assistantStateRef.current;
    if (currentState !== 'speaking' && currentState !== 'processing') {
      setTimeout(() => startListening(), 50);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    const currentState = assistantStateRef.current;
    if (currentState !== 'speaking' && currentState !== 'processing') {
      setTimeout(() => startListening(), 50);
    }
  });

  useEffect(() => {
    if (assistantState !== 'speaking' && assistantState !== 'processing') {
      startListening();
    } else {
      ExpoSpeechRecognitionModule.stop();
    }
    return () => {
      ExpoSpeechRecognitionModule.stop();
    };
  }, [assistantState]);

  // ── Typewriter Effect ──
  const startTypewriter = (fullText: string, onDone?: () => void) => {
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    setTypingText('');
    setIsTyping(true);
    let i = 0;
    typingIntervalRef.current = setInterval(() => {
      if (i < fullText.length) {
        setTypingText(fullText.substring(0, i + 1));
        i++;
      } else {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        setIsTyping(false);
        onDone?.();
      }
    }, 18);
  };

  const executeCommand = async (cmdText: string) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const userMsg: ChatFeedItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      author: 'You',
      timeAgo: 'Just now',
      type: 'text',
      text: cmdText,
    };
    setChatItems((prev) => [...prev, userMsg]);
    setAssistantState('processing');
    setAssistantSubtitle('Thinking...');
    setLiveTranscript('');
    setActiveViewMode('chat');

    const lower = cmdText.toLowerCase();
    let responseText = '';

    // ── Groq (Llama 3.1) Free LLM Integration ──
    const groqKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    if (groqKey && groqKey.trim().length > 0) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: 'qwen/qwen3.8-27b',
            messages: [
              { role: 'system', content: 'You are Relay, an AI engineering assistant for a software team. Keep your answers conversational, very concise (1-3 sentences max), and helpful. Do not use markdown.' },
              { role: 'user', content: cmdText }
            ]
          })
        });

        if (res.ok) {
          const data = await res.json();
          responseText = data.choices[0].message.content.trim();
        } else {
          console.warn('[Relay LLM] Groq returned error:', res.status);
        }
      } catch (err) {
        console.warn('[Relay LLM] Network error hitting Groq:', err);
      }
    }

    // Fallbacks if LLM fails or key is missing
    if (!responseText) {
      if (lower.includes('voice') || lower.includes('memo') || lower.includes('update')) {
        responseText = `Sarah Chen recorded a 24 second voice update on the AST parser. She updated the regex for multi-line Go struct definitions. Zero regressions.`;
      } else if (lower.includes('notification') || lower.includes('what') || lower.includes('new')) {
        responseText = `You have 3 unread updates. Sarah pushed 3 commits to the feature capsule navigation branch, and GitHub Actions CI Build 428 passed with all tests green.`;
      } else if (lower.includes('test') || lower.includes('run')) {
        responseText = `Running test suite for ${project.name}... 48 unit tests executed. All tests passing in 1.4 seconds.`;
      } else if (lower.includes('deploy') || lower.includes('staging')) {
        responseText = `Staging deployment triggered for ${project.name} on branch ${project.branch}. Build is queued.`;
      } else {
        responseText = `I'm Relay, your AI assistant. You asked about "${cmdText}". Get a free Groq API key and add it to your .env file to unlock my full brain!`;
      }
    }

    const relayMsg: ChatFeedItem = {
      id: `relay-${Date.now()}`,
      sender: 'relay',
      author: 'Relay AI',
      timeAgo: 'Just now',
      type: 'text',
      text: responseText,
    };
    setChatItems((prev) => [...prev, relayMsg]);

    setAssistantState('speaking');
    
    // Start typewriter for the subtitle
    startTypewriter(responseText);

      // TTS: Use ElevenLabs for ultra-realistic female voice (Bella)
      (async () => {
        try {
          const FileSystem = require('expo-file-system');
          const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
          
          if (!apiKey || apiKey.trim() === '') throw new Error('No ElevenLabs API key configured');
          
          // Bella voice ID (Anika is a community voice and blocked on free tiers)
          const voiceId = 'EXAVITQu4vr4xnSDxMaL';
          const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'xi-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: responseText,
              model_id: "eleven_multilingual_v2",
              voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
          });
          
          if (!response.ok) {
            const errText = await response.text();
            console.warn(`[Relay TTS] ElevenLabs API Error: ${response.status} - ${errText}`);
            throw new Error(`API ${response.status}`);
          }
          
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const base64data = (reader.result as string).split(',')[1];
              const uri = FileSystem.cacheDirectory + `relay-speech-${Date.now()}.mp3`;
              await FileSystem.writeAsStringAsync(uri, base64data, { encoding: FileSystem.EncodingType.Base64 });
              
              const { Audio } = require('expo-av');
              
              // Cleanup previous player
              if (audioPlayerRef.current) {
                try { await audioPlayerRef.current.unloadAsync(); } catch {}
              }
              
              const { sound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true }
              );
              audioPlayerRef.current = sound;
              
              sound.setOnPlaybackStatusUpdate((status: any) => {
                if (status.didJustFinish) {
                  setAssistantState('idle');
                  setAssistantSubtitle("Say 'Hey Relay' or tap the mic");
                  sound.unloadAsync().catch(() => {});
                  audioPlayerRef.current = null;
                }
              });
            } catch(e) {
              console.warn("[Relay TTS] Audio Player Error:", e);
              // Fallback
              Speech.speak(responseText, { rate: 0.95, pitch: 1.0, onDone: () => { setAssistantState('idle'); setAssistantSubtitle("Say 'Hey Relay' or tap the mic"); }});
            }
          };
          reader.readAsDataURL(blob);
        } catch (e) {
          console.warn("[Relay TTS] ElevenLabs Error:", e);
          // Fallback to system TTS if key is missing or quota exceeded
          Speech.speak(responseText, {
            rate: 0.95, pitch: 1.0,
            onDone: () => { setAssistantState('idle'); setAssistantSubtitle("Say 'Hey Relay' or tap the mic"); },
            onError: () => { setAssistantState('idle'); setAssistantSubtitle("Say 'Hey Relay' or tap the mic"); },
          });
        }
      })();

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handleStopSpeaking = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Speech.stop();
    if (audioPlayerRef.current) {
      try { audioPlayerRef.current.unloadAsync(); } catch {}
      audioPlayerRef.current = null;
    }
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    setIsTyping(false);
    setAssistantState('idle');
    setAssistantSubtitle("Say 'Hey Relay' or tap the mic");
    setPlayingItemId(null);
  };

  // ── Voice Memo Player ──
  const togglePlayMemo = (item: ChatFeedItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    if (playingItemId === item.id) {
      Speech.stop();
      setPlayingItemId(null);
      return;
    }

    Speech.stop();
    setPlayingItemId(item.id);
    const speechText = `${item.author} says: ${item.text}`;
    Speech.speak(speechText, {
      rate: 1.0,
      pitch: 1.0,
      onDone: () => setPlayingItemId(null),
      onError: () => setPlayingItemId(null),
    });
  };

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* ─── AMBIENT SAPPHIRE BLUE AURORA BOTTOM GLOW ─── */}
      <LinearGradient
        colors={['transparent', 'rgba(10, 25, 70, 0.40)', 'rgba(30, 80, 190, 0.65)']}
        style={styles.bottomAuroraGlow}
        pointerEvents="none"
      />

      {/* ─── TOP NAVIGATION BAR ─── */}
      <View style={[styles.topBar, { paddingTop: topInset }]}>
        {/* Left: Clean Back Button (No hamburger two-lines) */}
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={onBack}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <Line x1="19" y1="12" x2="5" y2="12" />
            <Polyline points="12 19 5 12 12 5" />
          </Svg>
          <Text style={styles.backBtnText}>Projects</Text>
        </TouchableOpacity>

        {/* Center: Apple-style Minimal Role Dropdown Trigger */}
        <TouchableOpacity
          style={[styles.appleRolePill, isRoleDropdownOpen && styles.appleRolePillActive]}
          activeOpacity={0.7}
          onPress={() => {
            try { Haptics.selectionAsync(); } catch {}
            setIsRoleDropdownOpen(!isRoleDropdownOpen);
            setIsNotifOpen(false);
          }}
        >
          <Text style={styles.appleRoleLabel}>{selectedRole}</Text>
          <Svg
            width={8}
            height={5}
            viewBox="0 0 8 5"
            fill="none"
            style={{
              transform: [{ rotate: isRoleDropdownOpen ? '180deg' : '0deg' }],
            }}
          >
            <Path
              d="M1 1L4 4L7 1"
              stroke="rgba(255, 255, 255, 0.55)"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        {/* Right: Chat Toggle + Notification Bell (No profile avatar circle) */}
        <View style={styles.topBarRightGroup}>
          {/* Chat / Updates Formation Toggle Button */}
          <TouchableOpacity
            style={[styles.topIconBtn, activeViewMode === 'chat' && styles.topIconBtnActive]}
            activeOpacity={0.75}
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              setActiveViewMode(activeViewMode === 'assistant' ? 'chat' : 'assistant');
            }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Rect x="3" y="3" width="18" height="18" rx="5" />
              <Line x1="7" y1="9" x2="17" y2="9" />
              <Line x1="7" y1="15" x2="13" y2="15" />
            </Svg>
          </TouchableOpacity>

          {/* Notification Bell with Badge */}
          <TouchableOpacity
            style={styles.topIconBtn}
            activeOpacity={0.8}
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              setIsNotifOpen(!isNotifOpen);
              setIsRoleDropdownOpen(false);
            }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </Svg>
            {unreadCount > 0 && (
              <View style={styles.notifBadgeDot}>
                <Text style={styles.notifBadgeCount}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── INVISIBLE MODAL / BACKDROP FOR APPLE-STYLE ROLE DROPDOWN ─── */}
      {isRoleDropdownOpen && (
        <TouchableWithoutFeedback onPress={() => setIsRoleDropdownOpen(false)}>
          <View style={styles.invisibleModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.appleMenuPopover, { top: topInset + 40 }]}>
                {ROLES.map((roleItem, index) => {
                  const isSelected = selectedRole === roleItem.id;
                  return (
                    <React.Fragment key={roleItem.id}>
                      {index > 0 && <View style={styles.appleMenuDivider} />}
                      <TouchableOpacity
                        style={[styles.appleMenuItem, isSelected && styles.appleMenuItemActive]}
                        activeOpacity={0.65}
                        onPress={() => handleSelectRole(roleItem.id)}
                      >
                        <Text style={[styles.appleMenuItemText, isSelected && styles.appleMenuItemTextActive]}>
                          {roleItem.label}
                        </Text>
                        {isSelected && (
                          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#0A84FF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                            <Polyline points="20 6 9 17 4 12" />
                          </Svg>
                        )}
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* ─── INVISIBLE MODAL / BACKDROP FOR NOTIFICATIONS TRAY ─── */}
      {isNotifOpen && (
        <TouchableWithoutFeedback onPress={() => setIsNotifOpen(false)}>
          <View style={styles.invisibleModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.notifTrayMenu, { top: topInset + 44 }]}>
                <View style={styles.notifTrayHeader}>
                  <Text style={styles.notifTrayTitle}>Project Notifications</Text>
                  <TouchableOpacity
                    onPress={() => {
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                      setUnreadCount(0);
                      showToast('All notifications cleared');
                    }}
                  >
                    <Text style={styles.notifClearBtnText}>Mark read</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.notifTrayList}>
                  <View style={styles.notifTrayItem}>
                    <View style={[styles.notifDot, { backgroundColor: '#38BDF8' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifItemText}>Sarah Chen pushed 3 commits to feat/capsule-nav</Text>
                      <Text style={styles.notifItemTime}>2m ago</Text>
                    </View>
                  </View>
                  <View style={styles.notifTrayItem}>
                    <View style={[styles.notifDot, { backgroundColor: '#10B981' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifItemText}>GitHub Actions: CI Build #428 passed on main</Text>
                      <Text style={styles.notifItemTime}>14m ago</Text>
                    </View>
                  </View>
                  <View style={styles.notifTrayItem}>
                    <View style={[styles.notifDot, { backgroundColor: '#F59E0B' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifItemText}>Alex Rivera requested review on PR #19</Text>
                      <Text style={styles.notifItemTime}>35m ago</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* ─── MODE 1: VOICE ASSISTANT — APPLE MINIMAL ─── */}
      {activeViewMode === 'assistant' ? (
        <View style={styles.assistantCenterContainer}>

          {/* Clean Relay Logo — no rings, no glow boxes */}
          <Animated.View style={[styles.relayLogoGlowWrapper, { transform: [{ scale: logoScaleAnim }] }]}>
            <Image
              source={require('../../../assets/images/relay-logo-white.png')}
              style={styles.relayCenterLogo}
            />
          </Animated.View>

          {/* State Subtitle — minimal text */}
          {assistantState === 'speaking' ? (
            <View style={styles.typewriterContainer}>
              <Text style={styles.typewriterText}>
                {typingText}
                {isTyping && <Animated.Text style={[styles.blinkingCursor, { opacity: blinkAnim }]}>|</Animated.Text>}
              </Text>
            </View>
          ) : assistantState === 'processing' ? (
            <View style={styles.processingContainer}>
              <Text style={styles.processingText}>Thinking</Text>
              <View style={styles.processingDots}>
                <Animated.View style={[styles.processingDot, { opacity: waveAnim1 }]} />
                <Animated.View style={[styles.processingDot, { opacity: waveAnim2 }]} />
                <Animated.View style={[styles.processingDot, { opacity: waveAnim3 }]} />
              </View>
            </View>
          ) : assistantState === 'listening' ? (
            <Text style={styles.assistantReadyText}>Listening...</Text>
          ) : (
            <Text style={styles.assistantReadyText}>{assistantSubtitle}</Text>
          )}

          {/* Live Transcript — clean inline text, no card box */}
          {assistantState === 'listening' && liveTranscript.length > 0 && (
            <Animated.View style={[styles.liveTranscriptInline, { opacity: transcriptFadeAnim }]}>
              <Text style={styles.liveTranscriptText}>
                {liveTranscript}
                <Animated.Text style={[styles.blinkingCursor, { opacity: blinkAnim }]}>|</Animated.Text>
              </Text>
            </Animated.View>
          )}

          {/* Suggestion Chips — only in idle */}
          {assistantState === 'idle' && (
            <View style={styles.assistantSuggestionsRow}>
              <TouchableOpacity style={styles.suggestChip} activeOpacity={0.8} onPress={() => executeCommand('What are the notifications?')}>
                <Text style={styles.suggestText}>Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestChip} activeOpacity={0.8} onPress={() => executeCommand('Read voice updates')}>
                <Text style={styles.suggestText}>Voice updates</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.suggestChip} activeOpacity={0.8} onPress={() => executeCommand('Run test suite')}>
                <Text style={styles.suggestText}>Run tests</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        /* ─── MODE 2: CHAT-LIKE PROJECT UPDATES FORMATION ─── */
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.streamDateRow}>
            <View style={styles.streamDateLine} />
            <Text style={styles.streamDateText}>PROJECT CONTEXT • {project.name.toUpperCase()}</Text>
            <View style={styles.streamDateLine} />
          </View>

          {chatItems.map((item) => {
            const isPlaying = playingItemId === item.id;
            const isUser = item.sender === 'user';
            const isRelay = item.sender === 'relay';
            const isSystem = item.sender === 'system';

            if (isSystem) {
              return (
                <View key={item.id} style={styles.systemBubble}>
                  <Text style={styles.systemBubbleText}>⚡ {item.text}</Text>
                </View>
              );
            }

            if (isUser) {
              return (
                <View key={item.id} style={styles.userBubbleContainer}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userBubbleText}>{item.text}</Text>
                  </View>
                  <Text style={styles.userBubbleTime}>{item.timeAgo}</Text>
                </View>
              );
            }

            if (isRelay) {
              return (
                <View key={item.id} style={styles.relayBubbleContainer}>
                  <View style={styles.relayAvatar}>
                    <Image
                      source={require('../../../assets/images/relay-logo-white.png')}
                      style={styles.relayAvatarImg}
                    />
                  </View>
                  <View style={styles.relayBubble}>
                    <Text style={styles.relayBubbleName}>Relay Assistant</Text>
                    <Text style={styles.relayBubbleText}>{item.text}</Text>
                  </View>
                </View>
              );
            }

            return (
              <View key={item.id} style={styles.teammateBubbleContainer}>
                <View style={styles.teammateAvatar}>
                  <Text style={styles.teammateAvatarText}>{item.initials ?? 'TM'}</Text>
                </View>
                <View style={styles.teammateBubble}>
                  <View style={styles.teammateHeader}>
                    <View style={styles.teammateMeta}>
                      <Text style={styles.teammateName}>{item.author}</Text>
                      {item.role && <Text style={styles.teammateRoleBadge}>• {item.role}</Text>}
                    </View>
                    <Text style={styles.chatTimeText}>{item.timeAgo}</Text>
                  </View>

                  {/* Voice Memo */}
                  {item.type === 'voice' && (
                    <View style={styles.voiceNoteBlock}>
                      <View style={styles.voicePlayerRow}>
                        <TouchableOpacity
                          style={[styles.voicePlayBtn, isPlaying && styles.voicePlayBtnActive]}
                          activeOpacity={0.8}
                          onPress={() => togglePlayMemo(item)}
                        >
                          {isPlaying ? (
                            <Svg width={12} height={12} viewBox="0 0 24 24" fill="#000000">
                              <Rect x="6" y="4" width="4" height="16" rx="1" />
                              <Rect x="14" y="4" width="4" height="16" rx="1" />
                            </Svg>
                          ) : (
                            <Svg width={12} height={12} viewBox="0 0 24 24" fill="#000000">
                              <Polyline points="5 3 19 12 5 21 5 3" />
                            </Svg>
                          )}
                        </TouchableOpacity>
                        <View style={styles.soundwaveTrack}>
                          {(item.audioBars ?? [40, 60, 80, 50, 90, 70, 40, 65]).map((bar, idx) => (
                            <View
                              key={idx}
                              style={[
                                styles.soundwaveBar,
                                {
                                  height: Math.max(6, (bar / 100) * 22),
                                  backgroundColor: isPlaying
                                    ? idx % 2 === 0
                                      ? '#38BDF8'
                                      : '#FFFFFF'
                                    : '#3A3A4A',
                                },
                              ]}
                            />
                          ))}
                        </View>
                        <Text style={styles.voiceDurationText}>
                          {isPlaying ? 'Playing' : item.audioDuration ?? '0:24'}
                        </Text>
                      </View>
                      <Text style={styles.voiceTranscriptText}>"{item.text}"</Text>
                    </View>
                  )}

                  {/* Commit */}
                  {item.type === 'commit' && (
                    <View style={styles.commitBlock}>
                      <Text style={styles.commitMessage}>{item.text}</Text>
                      <View style={styles.commitFooterRow}>
                        {item.commitHash && (
                          <View style={styles.commitHashPill}>
                            <Text style={styles.commitHashText}>#{item.commitHash}</Text>
                          </View>
                        )}
                        {item.branch && <Text style={styles.commitBranchText}>git: {item.branch}</Text>}
                        {item.statusBadge && (
                          <View style={styles.badgeClean}>
                            <Text style={styles.badgeCleanText}>{item.statusBadge}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* CI */}
                  {item.type === 'ci' && (
                    <View style={styles.ciBlock}>
                      <View style={styles.ciTopRow}>
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={3}>
                          <Polyline points="20 6 9 17 4 12" />
                        </Svg>
                        <Text style={styles.ciTitleText}>All checks passed</Text>
                      </View>
                      <Text style={styles.ciMessageText}>{item.text}</Text>
                    </View>
                  )}

                  {/* Review */}
                  {item.type === 'review' && (
                    <View style={styles.reviewBlock}>
                      <Text style={styles.reviewMessageText}>{item.text}</Text>
                      <TouchableOpacity
                        style={styles.reviewActionBtn}
                        activeOpacity={0.8}
                        onPress={() => showToast('Opening diff inspection view...')}
                      >
                        <Text style={styles.reviewActionBtnText}>Inspect Diff</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* ─── PREMIUM FLOATING CONTROLS BAR ─── */}
      <View style={[styles.bottomControlsBar, { paddingBottom: bottomInset }]}>
        {/* 1. Microphone Toggle Button */}
        <TouchableOpacity
          style={[styles.roundControlBtn, 
            (assistantState === 'listening') && styles.roundControlBtnActive,
            (assistantState === 'processing') && styles.roundControlBtnProcessing,
          ]}
          activeOpacity={0.75}
          onPress={assistantState === 'listening' ? handleStopSpeaking : triggerWakeWord}
          disabled={assistantState === 'processing'}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2}>
            <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <Line x1="12" y1="19" x2="12" y2="22" />
          </Svg>
        </TouchableOpacity>

        {/* 2. CENTER HERO GLOWING PILL */}
        <TouchableOpacity
          style={styles.centerHeroPillWrapper}
          activeOpacity={0.85}
          onPress={assistantState === 'speaking' ? handleStopSpeaking : triggerWakeWord}
        >
          <LinearGradient
            colors={
              assistantState === 'listening'
                ? ['#0E1B38', '#1D4ED8', '#38BDF8']
                : assistantState === 'processing'
                ? ['#0E1B38', '#6366F1', '#818CF8']
                : assistantState === 'speaking'
                ? ['#0E1B38', '#059669', '#34D399']
                : ['#070D1C', '#0D1A38', '#1E40AF']
            }
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.centerHeroPillGradient}
          >
            {assistantState === 'listening' ? (
              <View style={styles.livePillWaves}>
                <Animated.View style={[styles.pillWaveBar, { transform: [{ scaleY: waveAnim1 }] }]} />
                <Animated.View style={[styles.pillWaveBar, { transform: [{ scaleY: waveAnim2 }] }]} />
                <Animated.View style={[styles.pillWaveBar, { transform: [{ scaleY: waveAnim3 }] }]} />
              </View>
            ) : assistantState === 'processing' ? (
              <View style={styles.livePillWaves}>
                <Animated.View style={[styles.pillWaveBarProcessing, { opacity: waveAnim1 }]} />
                <Animated.View style={[styles.pillWaveBarProcessing, { opacity: waveAnim2 }]} />
                <Animated.View style={[styles.pillWaveBarProcessing, { opacity: waveAnim3 }]} />
              </View>
            ) : assistantState === 'speaking' ? (
              <View style={styles.livePillWaves}>
                <Animated.View style={[styles.pillWaveBarSpeaking, { transform: [{ scaleY: waveAnim1 }] }]} />
                <Animated.View style={[styles.pillWaveBarSpeaking, { transform: [{ scaleY: waveAnim2 }] }]} />
                <Animated.View style={[styles.pillWaveBarSpeaking, { transform: [{ scaleY: waveAnim3 }] }]} />
              </View>
            ) : (
              <View style={styles.pillIdleIndicator} />
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* 3. Close / Stop Button */}
        <TouchableOpacity
          style={[styles.roundControlBtn, assistantState === 'speaking' && styles.roundControlBtnStop]}
          activeOpacity={0.75}
          onPress={() => {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            if (assistantState === 'speaking') {
              handleStopSpeaking();
            } else {
              onBack();
            }
          }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4}>
            <Line x1="18" y1="6" x2="6" y2="18" />
            <Line x1="6" y1="6" x2="18" y2="18" />
          </Svg>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#000000', // PITCH BLACK
  },

  // Ambient bottom sapphire blue glow
  bottomAuroraGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 380,
    zIndex: 1,
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  appleRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  appleRolePillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  appleRoleLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  topBarRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#12151E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222838',
    position: 'relative',
  },
  topIconBtnActive: {
    borderColor: '#38BDF8',
    backgroundColor: '#0E1728',
  },
  notifBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#38BDF8',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeCount: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
  },

  // ── Invisible Modal Overlays ──
  invisibleModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 50,
  },
  appleMenuPopover: {
    position: 'absolute',
    alignSelf: 'center',
    width: 190,
    backgroundColor: 'rgba(28, 28, 30, 0.97)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 16,
  },
  appleMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 42,
  },
  appleMenuItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  appleMenuItemText: {
    color: 'rgba(235, 235, 245, 0.85)',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  appleMenuItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  appleMenuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 14,
  },

  // ── Notification Tray ──
  notifTrayMenu: {
    position: 'absolute',
    right: 14,
    width: 300,
    backgroundColor: '#0A0A10',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#242436',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 12,
  },
  notifTrayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#161622',
    paddingBottom: 8,
  },
  notifTrayTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  notifClearBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  notifTrayList: {
    gap: 10,
  },
  notifTrayItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  notifDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  notifItemText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
  },
  notifItemTime: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },

  // ── ASSISTANT CENTER — APPLE MINIMAL ──
  assistantCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  relayLogoGlowWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  relayCenterLogo: {
    width: 56,
    height: 46,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  assistantReadyText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.2,
    marginTop: 20,
    textAlign: 'center',
  },
  assistantSuggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    maxWidth: 320,
  },
  suggestChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  suggestText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 13,
    fontWeight: '400',
  },

  // ── CHAT FORMATION SCROLL ──
  chatScroll: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  chatScrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 110,
    gap: 14,
  },
  streamDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  streamDateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#14141C',
  },
  streamDateText: {
    color: '#55556A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  systemBubble: {
    alignSelf: 'center',
    backgroundColor: '#08080C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#141420',
  },
  systemBubbleText: {
    color: '#8A8A9E',
    fontSize: 11,
    fontWeight: '500',
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    alignItems: 'flex-end',
  },
  userBubble: {
    backgroundColor: '#1E1E28',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: '#2E2E3E',
  },
  userBubbleText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  userBubbleTime: {
    color: '#555566',
    fontSize: 10,
    marginTop: 3,
    marginRight: 4,
  },
  relayBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '88%',
  },
  relayAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#101626',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  relayAvatarImg: {
    width: 16,
    height: 13,
    resizeMode: 'contain',
  },
  relayBubble: {
    flex: 1,
    backgroundColor: '#060B14',
    padding: 12,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  relayBubbleName: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  relayBubbleText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  teammateBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '92%',
  },
  teammateAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E1E2C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2B2B3D',
    marginTop: 2,
  },
  teammateAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  teammateBubble: {
    flex: 1,
    backgroundColor: '#0A0A10',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1A1A26',
  },
  teammateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  teammateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teammateName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  teammateRoleBadge: {
    color: '#717188',
    fontSize: 11,
  },
  chatTimeText: {
    color: '#555566',
    fontSize: 10,
  },
  voiceNoteBlock: {
    gap: 8,
  },
  voicePlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#050508',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#141420',
  },
  voicePlayBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePlayBtnActive: {
    backgroundColor: '#38BDF8',
  },
  soundwaveTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 22,
  },
  soundwaveBar: {
    flex: 1,
    borderRadius: 2,
  },
  voiceDurationText: {
    color: '#8A8A9E',
    fontSize: 11,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
  voiceTranscriptText: {
    color: '#A1A1B2',
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  commitBlock: {
    gap: 8,
  },
  commitMessage: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  commitFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  commitHashPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commitHashText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  commitBranchText: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  badgeClean: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeCleanText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
  },
  ciBlock: {
    backgroundColor: '#050D0A',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#064E3B',
    gap: 4,
  },
  ciTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ciTitleText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  ciMessageText: {
    color: '#A7F3D0',
    fontSize: 12,
    lineHeight: 16,
  },
  reviewBlock: {
    gap: 8,
  },
  reviewMessageText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  reviewActionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E1E28',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333346',
  },
  reviewActionBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── 3-BUTTON FLOATING CONTROLS BAR ──
  bottomControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 20,
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  roundControlBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#141722',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#22283A',
  },
  roundControlBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  centerHeroPillWrapper: {
    width: 110,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 10,
  },
  centerHeroPillGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIdleIndicator: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  livePillWaves: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 20,
  },
  pillWaveBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  pillWaveBarProcessing: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A5B4FC',
  },
  pillWaveBarSpeaking: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#34D399',
  },
  roundControlBtnProcessing: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    opacity: 0.6,
  },
  roundControlBtnStop: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },

  // ── LIVE TRANSCRIPT — INLINE TEXT (no card, no box) ──
  liveTranscriptInline: {
    marginTop: 20,
    paddingHorizontal: 30,
    maxWidth: 320,
  },
  liveTranscriptText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 18,
    fontWeight: '300',
    lineHeight: 26,
    letterSpacing: -0.3,
    textAlign: 'center',
  },

  // ── BLINKING CURSOR ──
  blinkingCursor: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 18,
    fontWeight: '200',
  },

  // ── TYPEWRITER ──
  typewriterContainer: {
    marginTop: 20,
    paddingHorizontal: 24,
    maxWidth: 320,
  },
  typewriterText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    textAlign: 'center',
    letterSpacing: -0.1,
  },

  // ── PROCESSING ──
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 4,
  },
  processingText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  processingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingTop: 1,
  },
  processingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
});

export default ProjectWorkspaceView;
