import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, Animated, TouchableWithoutFeedback, Keyboard, Alert
} from 'react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function PasswordLoginScreen() {
  const { email, mode, username } = useLocalSearchParams<{ email: string, mode?: string, username?: string }>();
  const isSignUp = mode === 'signup';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const confirmInputRef = useRef<TextInput>(null);
  const blurAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(blurAnim, {
      toValue: password.length > 0 || confirmPassword.length > 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [password, confirmPassword]);

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

  const handleContinue = async () => {
    if (!password) return;
    if (isSignUp && password !== confirmPassword) {
      return; 
    }
    
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const udyraUrl = process.env.EXPO_PUBLIC_UDYRA_URL;
      const udyraKey = process.env.EXPO_PUBLIC_UDYRA_ANON_KEY;
      
      // If keys are provided, authenticate with Udyra Auth
      if (udyraUrl && udyraKey && udyraUrl.trim() !== '') {
        if (isSignUp) {
           const res = await fetch(`${udyraUrl}/auth/v1/signup`, {
             method: 'POST',
             headers: { 'apikey': udyraKey, 'Content-Type': 'application/json' },
             body: JSON.stringify({ email, password })
           });
           const data = await res.json();
           if (!res.ok) throw new Error(data.error_description || data.msg || 'Sign up failed');
        } else {
           const res = await fetch(`${udyraUrl}/auth/v1/token?grant_type=password`, {
             method: 'POST',
             headers: { 'apikey': udyraKey, 'Content-Type': 'application/json' },
             body: JSON.stringify({ email, password })
           });
           const data = await res.json();
           if (!res.ok) throw new Error(data.error_description || data.msg || 'Invalid email or password');
        }
      }
      
      // Success
      setLoading(false);
      router.push({ pathname: '/dashboard', params: { username: username || email || 'user' } });
      
    } catch (err: any) {
      setLoading(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Authentication Failed', err.message || 'Please check your credentials and try again.');
    }
  };

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordStrong = hasMinLength && hasUpper && hasNumber && hasSpecial;

  const isContinueDisabled = isSignUp 
    ? (!isPasswordStrong || !confirmPassword || password !== confirmPassword || loading) 
    : (!password || loading);

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>

      {/* Main Content Area */}
      <View style={[styles.content, isSignUp && { paddingTop: Platform.OS === 'ios' ? 100 : 80 }]}>
        <Text style={styles.heading}>{isSignUp ? "Create a password" : "What's your password?"}</Text>
        <Text style={styles.subheading}>For {isSignUp && username ? `@${username}` : email}</Text>
        
        <View style={styles.inputWrapper}>
          <AnimatedTextInput
            ref={inputRef}
            style={[styles.input, { 
              textShadowColor: 'rgba(255, 255, 255, 0.6)', 
              textShadowRadius: textGlow,
              borderBottomColor: borderGlow,
              paddingRight: 60 // space for the view button
            }]}
            placeholder="••••••••"
            placeholderTextColor="#333333"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor="#FFF"
          />
          <TouchableOpacity 
            style={styles.viewButton} 
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{top:15, bottom:15, left:15, right:15}}
          >
            <Text style={styles.viewButtonText}>{showPassword ? 'Hide' : 'View'}</Text>
          </TouchableOpacity>
        </View>
        
        {isSignUp && (
          <View style={styles.rulesContainer}>
            <View style={styles.ruleRow}>
              <Text style={[styles.ruleIcon, hasMinLength && styles.ruleMet]}>{hasMinLength ? '✓' : '○'}</Text>
              <Text style={[styles.ruleText, hasMinLength && styles.ruleMet]}>At least 8 characters</Text>
            </View>
            <View style={styles.ruleRow}>
              <Text style={[styles.ruleIcon, hasUpper && styles.ruleMet]}>{hasUpper ? '✓' : '○'}</Text>
              <Text style={[styles.ruleText, hasUpper && styles.ruleMet]}>1 uppercase letter</Text>
            </View>
            <View style={styles.ruleRow}>
              <Text style={[styles.ruleIcon, hasNumber && styles.ruleMet]}>{hasNumber ? '✓' : '○'}</Text>
              <Text style={[styles.ruleText, hasNumber && styles.ruleMet]}>1 number</Text>
            </View>
            <View style={styles.ruleRow}>
              <Text style={[styles.ruleIcon, hasSpecial && styles.ruleMet]}>{hasSpecial ? '✓' : '○'}</Text>
              <Text style={[styles.ruleText, hasSpecial && styles.ruleMet]}>1 special character</Text>
            </View>
          </View>
        )}
        
        {isSignUp && (
          <View style={styles.inputWrapper}>
            <AnimatedTextInput
              ref={confirmInputRef}
              style={[styles.input, { 
                textShadowColor: 'rgba(255, 255, 255, 0.6)', 
                textShadowRadius: textGlow,
                borderBottomColor: borderGlow,
              }]}
              placeholder="Re-enter password"
              placeholderTextColor="#333333"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor="#FFF"
            />
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={handleBack} disabled={loading} hitSlop={{top:15, bottom:15, left:15, right:15}} style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={[styles.actionTextSecondary, { transform: [{ translateY: -1 }] }]}>← </Text>
            <Text style={styles.actionTextSecondary}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleContinue} 
            disabled={isContinueDisabled}
            hitSlop={{top:15, bottom:15, left:15, right:15}}
            style={{flexDirection: 'row', alignItems: 'center'}}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={[styles.actionTextPrimary, isContinueDisabled && styles.actionTextDisabled]}>Next</Text>
                <Text style={[styles.actionTextPrimary, isContinueDisabled && styles.actionTextDisabled, { transform: [{ translateY: -1 }] }]}> →</Text>
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
  inputWrapper: {
    position: 'relative',
    marginBottom: 40,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '500',
    borderBottomWidth: 2,
    borderBottomColor: '#222222',
    paddingVertical: 12,
  },
  viewButton: {
    position: 'absolute',
    right: 0,
    bottom: 16,
  },
  viewButtonText: {
    color: '#888888',
    fontSize: 16,
    fontWeight: '600',
  },
  rulesContainer: {
    marginBottom: 30,
    marginTop: -20,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleIcon: {
    color: '#555555',
    fontSize: 14,
    marginRight: 8,
    width: 16,
  },
  ruleText: {
    color: '#555555',
    fontSize: 14,
  },
  ruleMet: {
    color: '#4CAF50',
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
