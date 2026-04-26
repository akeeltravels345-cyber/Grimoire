import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

interface GradientScreenProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: ViewStyle;
}

export default function GradientScreen({ children, edges = ['top'], style }: GradientScreenProps) {
  return (
    <LinearGradient
      colors={['#3A1F65', '#2D1855', '#231245', '#1C0E3A']}
      locations={[0, 0.3, 0.6, 1]}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={[styles.gradient, style]}
    >
      <SafeAreaView edges={edges} style={styles.safe}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
});
