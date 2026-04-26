import React, { useMemo, useEffect } from 'react';
import { StyleSheet, View, ViewStyle, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import StarField from './StarField';

// ═══ Constellation Data ═══
const CONSTELLATION_STARS = [
  { x: 12, y: 8 },
  { x: 28, y: 5 },
  { x: 42, y: 12 },
  { x: 58, y: 6 },
  { x: 75, y: 10 },
  { x: 88, y: 18 },
  { x: 20, y: 22 },
  { x: 50, y: 25 },
  { x: 70, y: 30 },
  { x: 35, y: 35 },
];

const CONSTELLATION_LINES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
  [1, 6], [2, 7], [4, 8],
  [6, 9], [7, 9], [7, 8],
];

function ConstellationOverlay() {
  const { width: screenW } = Dimensions.get('window');
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 240000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const viewW = 400;
  const viewH = 200;

  const stars = useMemo(
    () =>
      CONSTELLATION_STARS.map(s => ({
        cx: (s.x / 100) * viewW,
        cy: (s.y / 100) * viewH,
      })),
    []
  );

  return (
    <Animated.View
      style={[styles.constellationContainer, animStyle]}
      pointerEvents="none"
    >
      <Svg
        width="140%"
        height="50%"
        viewBox={`0 0 ${viewW} ${viewH}`}
        style={styles.constellationSvg}
      >
        {CONSTELLATION_LINES.map(([from, to], i) => (
          <Line
            key={`line-${i}`}
            x1={stars[from].cx}
            y1={stars[from].cy}
            x2={stars[to].cx}
            y2={stars[to].cy}
            stroke="rgba(200, 180, 240, 0.08)"
            strokeWidth={0.8}
            strokeLinecap="round"
          />
        ))}
        {stars.map((s, i) => (
          <React.Fragment key={`star-${i}`}>
            <Circle cx={s.cx} cy={s.cy} r={3} fill="rgba(200, 180, 240, 0.06)" />
            <Circle cx={s.cx} cy={s.cy} r={1.2} fill="rgba(245, 213, 224, 0.18)" />
          </React.Fragment>
        ))}
      </Svg>
    </Animated.View>
  );
}

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
      <StarField starCount={50} showShootingStar={false} />
      <ConstellationOverlay />
      <SafeAreaView edges={edges} style={styles.safe}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  constellationContainer: {
    position: 'absolute',
    top: -40,
    left: -80,
    right: -80,
    bottom: -40,
    zIndex: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  constellationSvg: {
    opacity: 1,
  },
});
