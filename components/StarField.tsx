import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

interface StarData {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  baseOpacity: number;
  delay: number;
  duration: number;
}

function AnimatedStar({ star }: { star: StarData }) {
  const opacity = useSharedValue(star.baseOpacity * 0.2);

  useEffect(() => {
    opacity.value = withDelay(
      star.delay,
      withRepeat(
        withSequence(
          withTiming(star.baseOpacity, { duration: star.duration }),
          withTiming(star.baseOpacity * 0.2, { duration: star.duration }),
        ),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <ReAnimated.View
      style={[
        {
          position: 'absolute',
          left: `${star.x}%` as any,
          top: `${star.y}%` as any,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: star.color,
        },
        animStyle,
      ]}
    />
  );
}

function ShootingStar() {
  const { width: screenW, height: screenH } = Dimensions.get('window');
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const trailScale = useSharedValue(0.3);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    const startX = Math.random() * (screenW * 0.6) + screenW * 0.05;
    const startY = Math.random() * (screenH * 0.45) + 20;
    const travel = 120 + Math.random() * 80;

    translateX.value = startX;
    translateY.value = startY;
    trailScale.value = 0.3;

    opacity.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withTiming(0.75, { duration: 380 }),
      withTiming(0, { duration: 140 }),
    );
    trailScale.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(0.5, { duration: 480 }),
    );
    translateX.value = withTiming(startX + travel, { duration: 600 });
    translateY.value = withTiming(startY + travel * 0.55, { duration: 600 });
  }, [screenW, screenH]);

  useEffect(() => {
    const scheduleNext = () => {
      const delay = 8000 + Math.random() * 4000;
      timeoutRef.current = setTimeout(() => {
        trigger();
        scheduleNext();
      }, delay);
    };
    timeoutRef.current = setTimeout(() => {
      trigger();
      scheduleNext();
    }, 3000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [trigger]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: '30deg' },
      { scaleX: trailScale.value },
    ],
  }));

  return (
    <ReAnimated.View
      style={[{ position: 'absolute', width: 64, height: 2, zIndex: 2 }, animStyle]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['transparent', 'rgba(245,213,224,0.3)', '#F5D5E0', '#FFFFFF']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width: 64, height: 2, borderRadius: 1 }}
      />
      <View style={{
        position: 'absolute', right: -1, top: -1.5,
        width: 5, height: 5, borderRadius: 2.5,
        backgroundColor: '#FFFFFF',
        shadowColor: '#F5D5E0', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
      }} />
    </ReAnimated.View>
  );
}

interface StarFieldProps {
  starCount?: number;
  showShootingStar?: boolean;
}

export default function StarField({ starCount = 80, showShootingStar = true }: StarFieldProps) {
  const stars = useMemo(() => {
    const result: StarData[] = [];
    const brightCount = Math.round(starCount * 0.15);
    const mediumCount = Math.round(starCount * 0.30);
    for (let i = 0; i < starCount; i++) {
      let size: number, baseOpacity: number, color: string;
      if (i < brightCount) {
        size = 2.5 + Math.random() * 0.5;
        baseOpacity = 0.8 + Math.random() * 0.2;
        color = Math.random() < 0.2 ? '#F5D5E0' : '#FFFFFF';
      } else if (i < brightCount + mediumCount) {
        size = 1.5;
        baseOpacity = 0.5 + Math.random() * 0.2;
        color = '#FFFFFF';
      } else {
        size = 0.8 + Math.random() * 0.2;
        baseOpacity = 0.2 + Math.random() * 0.2;
        color = '#FFFFFF';
      }
      result.push({
        id: i,
        x: Math.random() * 96 + 2,
        y: Math.random() * 96 + 2,
        size,
        color,
        baseOpacity,
        delay: Math.random() * 4000,
        duration: 2000 + Math.random() * 3000,
      });
    }
    return result;
  }, [starCount]);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }} pointerEvents="none">
      {stars.map(star => (
        <AnimatedStar key={star.id} star={star} />
      ))}
      {showShootingStar ? <ShootingStar /> : null}
    </View>
  );
}
