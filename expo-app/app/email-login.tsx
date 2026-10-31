import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Animated, TouchableWithoutFeedback, Keyboard
} from 'react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function EmailLoginScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const isSignUp = mode === 'signup';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const blurAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(blurAnim, {
      toValue: email.length > 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [email]);

  const textGlow = blurAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12]
  });

  const borderGlow = blurAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#222222', '#FFFFFF']
  });

  useEffect(() => {
    // Focus the input automatically on mount for better UX
    setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
  }, []);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isEmailValid = isValidEmail(email);

  const handleContinue = async () => {
    if (!isEmailValid) return;
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      setLoading(false);
      if (isSignUp) {
        router.push({ pathname: '/username', params: { email: email } });
      } else {
        router.push({ pathname: '/password-login', params: { email: email, mode: mode } });
      }
    }, 1000);
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>

      {/* Main Content Area */}
      <View style={styles.content}>
        <Text style={styles.heading}>{isSignUp ? "Register your email" : "What's your email?"}</Text>
        <Text style={styles.subheading}>{isSignUp ? "Create a new account" : "Sign in to continue"}</Text>
        
        <AnimatedTextInput
          ref={inputRef}
          style={[styles.input, { 
            textShadowColor: 'rgba(255, 255, 255, 0.6)', 
            textShadowRadius: textGlow,
            borderBottomColor: borderGlow
          }]}
          placeholder="name@example.com"
          placeholderTextColor="#333333"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor="#FFF"
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={handleBack} disabled={loading} hitSlop={{top:15, bottom:15, left:15, right:15}} style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={[styles.actionTextSecondary, { transform: [{ translateY: -1 }] }]}>← </Text>
            <Text style={styles.actionTextSecondary}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleContinue} 
            disabled={!isEmailValid || loading}
            hitSlop={{top:15, bottom:15, left:15, right:15}}
            style={{flexDirection: 'row', alignItems: 'center'}}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={[styles.actionTextPrimary, !isEmailValid && styles.actionTextDisabled]}>Next</Text>
                <Text style={[styles.actionTextPrimary, !isEmailValid && styles.actionTextDisabled, { transform: [{ translateY: -1 }] }]}> →</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: Platform.OS === 'ios' ? 140 : 120, // Maintain absolute spacing from top
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'left',
  },
  subheading: {
    color: '#888888',
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 40,
    textAlign: 'left',
  },
  input: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '500',
    borderBottomWidth: 2,
    borderBottomColor: '#222222',
    paddingVertical: 12,
    marginBottom: 40,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  actionTextSecondary: {
    color: '#666666',
    fontSize: 20,
    fontWeight: '600',
  },
  actionTextPrimary: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  actionTextDisabled: {
    opacity: 0.3,
  }
});
