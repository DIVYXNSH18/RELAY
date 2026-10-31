import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Dimensions, Image, Platform, ActivityIndicator, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1.1)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.5)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 15000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoFadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(logoScaleAnim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ])
    ]).start();
  }, []);

  const handleUdyraLogin = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/email-login', params: { mode: 'login' } });
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Animated.View style={[styles.imageContainer, { transform: [{ scale: scaleAnim }] }]}>
        <Image 
          source={require('../assets/images/login_bg_minecraft.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        {/* Gradient to fade into the black background */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.9)', '#000000', '#000000']}
          locations={[0, 0.4, 0.7, 0.9, 1]}
          style={styles.gradient}
        />
      </Animated.View>

      {/* Empty Top Area */}

      {/* Content */}
      <View style={styles.contentContainer}>
        
        {/* Logo and Brand */}
        <View style={styles.brandContainer}>
          <Animated.Image 
            source={require('../assets/images/relay-logo-white.png')} 
            style={[styles.logoImage, { opacity: logoFadeAnim, transform: [{ scale: logoScaleAnim }] }]} 
            resizeMode="contain" 
          />
          <Animated.Text style={[styles.brandText, { opacity: textFadeAnim }]}>RELAY</Animated.Text>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleUdyraLogin} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#000" /> : (
              <>
                <Image 
                  source={require('../assets/images/udyra-logo.png')} 
                  style={styles.udyraImage} 
                  resizeMode="contain" 
                />
                <Text style={styles.primaryButtonText}>Continue with Udyra</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Sign Up Option */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: '/email-login', params: { mode: 'signup' } }); }}>
            <Text style={styles.signUpLink}>Sign up</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLink}>Privacy policy</Text>
          <Text style={styles.footerLink}>Terms of service</Text>
        </View>
        
      </Animated.View>
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.65, // Image takes up top ~65%
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300, // Long smooth fade
  },

  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 80,
    zIndex: 10,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 60,
    height: 60,
    tintColor: '#FFF',
    marginBottom: 5,
  },
  brandText: {
    color: '#FFF',
    fontSize: 34,
    letterSpacing: 2,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', // Clean rounded look
  },
  buttonsContainer: {
    gap: 12,
    marginBottom: 35,
  },
  primaryButton: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  udyraImage: {
    width: 24,
    height: 24,
    marginBottom: 2,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  signUpText: {
    color: '#808080',
    fontSize: 14,
  },
  signUpLink: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 25,
  },
  footerLink: {
    color: '#808080',
    fontSize: 13,
  },
});
