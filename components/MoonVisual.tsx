import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Defs, RadialGradient, LinearGradient as SvgLinearGradient,
  Stop, Circle, Ellipse, ClipPath, Rect, G, Path,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface MoonVisualProps {
  phaseIndex: number;
  size: number;
}

/**
 * Realistic SVG moon phase visual with craters, mare patches,
 * clip-path-based terminator, and animated atmospheric glow.
 *
 * phaseIndex: 0=New, 1=Wax.Crescent, 2=First Quarter, 3=Wax.Gibbous,
 *             4=Full, 5=Wan.Gibbous, 6=Last Quarter, 7=Wan.Crescent
 */

// Crater data (x, y, radius as fractions of moon radius)
const CRATERS = [
  { x: 0.62, y: 0.48, r: 0.14, depth: 0.6 },   // Tycho-like
  { x: 0.35, y: 0.28, r: 0.11, depth: 0.5 },   // Copernicus-like
  { x: 0.72, y: 0.25, r: 0.08, depth: 0.4 },
  { x: 0.28, y: 0.55, r: 0.06, depth: 0.35 },
  { x: 0.55, y: 0.72, r: 0.09, depth: 0.45 },
  { x: 0.42, y: 0.42, r: 0.05, depth: 0.3 },
  { x: 0.78, y: 0.62, r: 0.07, depth: 0.4 },
  { x: 0.22, y: 0.75, r: 0.04, depth: 0.25 },
  { x: 0.48, y: 0.18, r: 0.06, depth: 0.35 },
  { x: 0.65, y: 0.82, r: 0.05, depth: 0.3 },
  { x: 0.18, y: 0.38, r: 0.035, depth: 0.2 },
  { x: 0.82, y: 0.45, r: 0.04, depth: 0.25 },
];

// Mare patches (dark basalt seas)
const MARE = [
  { x: 0.42, y: 0.35, rx: 0.18, ry: 0.13, opacity: 0.18 },  // Mare Imbrium
  { x: 0.55, y: 0.58, rx: 0.15, ry: 0.11, opacity: 0.15 },  // Mare Serenitatis
  { x: 0.30, y: 0.55, rx: 0.12, ry: 0.09, opacity: 0.12 },  // Mare Humorum
  { x: 0.60, y: 0.30, rx: 0.10, ry: 0.08, opacity: 0.10 },  // Mare Crisium
  { x: 0.48, y: 0.48, rx: 0.08, ry: 0.06, opacity: 0.08 },  // Small patch
];

export default function MoonVisual({ phaseIndex, size }: MoonVisualProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 1; // Slight inset for anti-aliasing

  // Breathing glow animation
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const glowAnimStyle = useAnimatedStyle(() => {
    const scale = interpolate(breathe.value, [0, 1], [1, 1.15]);
    const opacity = interpolate(breathe.value, [0, 1], [0.5, 0.9]);
    return { transform: [{ scale }], opacity };
  });

  const isNewMoon = phaseIndex === 0;
  const isFullMoon = phaseIndex === 4;

  // Calculate illuminated ellipse for terminator
  // The terminator is modeled as an ellipse whose rx varies with phase
  const getTerminatorEllipseRx = (): number => {
    // Map phase to terminator curvature
    // 0=New (fully dark), 1=WaxCrescent, 2=FirstQ, 3=WaxGibbous, 4=Full
    // 5=WanGibbous, 6=LastQ, 7=WanCrescent
    const phaseMap: Record<number, number> = {
      0: 0,
      1: r * 0.35,
      2: 0,         // Straight line (half moon)
      3: r * 0.35,
      4: r,         // Full
      5: r * 0.35,
      6: 0,
      7: r * 0.35,
    };
    return phaseMap[phaseIndex] ?? 0;
  };

  // Build the illuminated clip path as SVG path data
  const buildIlluminatedPath = (): string => {
    if (isFullMoon) {
      // Full circle
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
    }
    if (isNewMoon) {
      return ''; // No illumination
    }

    const termRx = getTerminatorEllipseRx();

    // For waxing phases (1-3), light comes from the right
    // For waning phases (5-7), light comes from the left
    const isWaxing = phaseIndex >= 1 && phaseIndex <= 3;
    const isWaning = phaseIndex >= 5 && phaseIndex <= 7;

    // The illuminated region is bounded by:
    // - A semicircle on the lit side
    // - An ellipse (terminator) through the center

    if (phaseIndex === 2) {
      // First quarter: right half illuminated
      return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} L ${cx} ${cy - r} Z`;
    }
    if (phaseIndex === 6) {
      // Last quarter: left half illuminated
      return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} L ${cx} ${cy - r} Z`;
    }

    if (phaseIndex === 1) {
      // Waxing crescent: thin sliver on right
      // Outer arc (right semicircle) + inner arc (terminator ellipse curving left)
      return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${termRx} ${r} 0 0 1 ${cx} ${cy - r} Z`;
    }
    if (phaseIndex === 3) {
      // Waxing gibbous: most of right side lit
      return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${termRx} ${r} 0 0 0 ${cx} ${cy - r} Z`;
    }
    if (phaseIndex === 5) {
      // Waning gibbous: most of left side lit
      return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${termRx} ${r} 0 0 1 ${cx} ${cy - r} Z`;
    }
    if (phaseIndex === 7) {
      // Waning crescent: thin sliver on left
      return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${termRx} ${r} 0 0 0 ${cx} ${cy - r} Z`;
    }

    return '';
  };

  const illuminatedPath = buildIlluminatedPath();

  const glowSize = size * 1.5;
  const glowColor = isNewMoon
    ? 'rgba(180,170,200,0.12)'
    : isFullMoon
      ? 'rgba(245,230,200,0.45)'
      : 'rgba(220,210,190,0.25)';

  return (
    <View style={{ width: glowSize, height: glowSize, alignItems: 'center', justifyContent: 'center' }}>
      {/* Animated atmospheric glow */}
      <Animated.View style={[{
        position: 'absolute',
        width: glowSize,
        height: glowSize,
        borderRadius: glowSize / 2,
        backgroundColor: glowColor,
        shadowColor: isFullMoon ? '#FFF5E0' : '#D0C8E0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isFullMoon ? 0.7 : 0.3,
        shadowRadius: size * 0.5,
        elevation: 0,
      }, glowAnimStyle]} />

      {/* Soft glow ring */}
      {!isNewMoon ? (
        <Animated.View style={[{
          position: 'absolute',
          width: size * 1.25,
          height: size * 1.25,
          borderRadius: size * 0.625,
          borderWidth: size * 0.025,
          borderColor: isFullMoon ? 'rgba(255,248,230,0.12)' : 'rgba(220,215,235,0.08)',
        }, glowAnimStyle]} />
      ) : null}

      {/* SVG Moon */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Moon surface base gradient */}
          <RadialGradient id="moonBase" cx="40%" cy="38%" rx="55%" ry="55%" fx="35%" fy="33%">
            <Stop offset="0%" stopColor={isNewMoon ? '#2A2035' : '#F2EBD8'} />
            <Stop offset="35%" stopColor={isNewMoon ? '#1E1828' : '#E8DCCA'} />
            <Stop offset="65%" stopColor={isNewMoon ? '#161020' : '#D8CCB8'} />
            <Stop offset="100%" stopColor={isNewMoon ? '#100C18' : '#C0B4A0'} />
          </RadialGradient>

          {/* Specular highlight gradient */}
          <RadialGradient id="specular" cx="35%" cy="30%" rx="30%" ry="25%">
            <Stop offset="0%" stopColor="rgba(255,252,245,0.25)" />
            <Stop offset="60%" stopColor="rgba(255,250,240,0.08)" />
            <Stop offset="100%" stopColor="rgba(255,248,235,0)" />
          </RadialGradient>

          {/* Limb darkening gradient */}
          <RadialGradient id="limbDark" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <Stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <Stop offset="82%" stopColor="rgba(40,30,25,0.15)" />
            <Stop offset="95%" stopColor="rgba(20,15,12,0.45)" />
            <Stop offset="100%" stopColor="rgba(10,8,6,0.65)" />
          </RadialGradient>

          {/* Shadow gradient for dark side */}
          <RadialGradient id="shadowGrad" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="rgba(8,5,18,0.88)" />
            <Stop offset="70%" stopColor="rgba(8,5,18,0.92)" />
            <Stop offset="100%" stopColor="rgba(5,3,12,0.95)" />
          </RadialGradient>

          {/* Clip path for illuminated region */}
          {illuminatedPath ? (
            <ClipPath id="illuminated">
              <Path d={illuminatedPath} />
            </ClipPath>
          ) : null}

          {/* Full moon clip */}
          <ClipPath id="moonDisc">
            <Circle cx={cx} cy={cy} r={r} />
          </ClipPath>
        </Defs>

        {/* Moon disc background (dark side base) */}
        <Circle cx={cx} cy={cy} r={r} fill={isNewMoon ? 'url(#moonBase)' : '#0A0612'} />

        {/* New moon: faint limb outline */}
        {isNewMoon ? (
          <>
            <Circle cx={cx} cy={cy} r={r} fill="url(#moonBase)" />
            <Circle cx={cx} cy={cy} r={r - 0.5} fill="none" stroke="rgba(200,190,210,0.15)" strokeWidth={1} />
            {/* Subtle crater hints even on new moon */}
            <G opacity={0.08}>
              {CRATERS.slice(0, 5).map((c, i) => (
                <Circle
                  key={`nm-crater-${i}`}
                  cx={cx + (c.x - 0.5) * size * 0.9}
                  cy={cy + (c.y - 0.5) * size * 0.9}
                  r={c.r * r * 0.9}
                  fill="rgba(100,90,110,0.3)"
                />
              ))}
            </G>
          </>
        ) : null}

        {/* Illuminated surface — clipped to phase shape */}
        {!isNewMoon && illuminatedPath ? (
          <G clipPath="url(#illuminated)">
            {/* Base moon surface */}
            <Circle cx={cx} cy={cy} r={r} fill="url(#moonBase)" />

            {/* Mare (dark basalt seas) */}
            {MARE.map((m, i) => (
              <Ellipse
                key={`mare-${i}`}
                cx={cx + (m.x - 0.5) * size * 0.9}
                cy={cy + (m.y - 0.5) * size * 0.9}
                rx={m.rx * r}
                ry={m.ry * r}
                fill={`rgba(130,118,100,${m.opacity})`}
              />
            ))}

            {/* Craters with rim highlights */}
            {CRATERS.map((c, i) => {
              const craterCx = cx + (c.x - 0.5) * size * 0.9;
              const craterCy = cy + (c.y - 0.5) * size * 0.9;
              const craterR = c.r * r * 0.9;
              return (
                <G key={`crater-${i}`}>
                  {/* Crater shadow (bottom-right) */}
                  <Circle
                    cx={craterCx + craterR * 0.15}
                    cy={craterCy + craterR * 0.15}
                    r={craterR}
                    fill={`rgba(110,95,80,${c.depth * 0.3})`}
                  />
                  {/* Crater body */}
                  <Circle
                    cx={craterCx}
                    cy={craterCy}
                    r={craterR}
                    fill={`rgba(165,150,135,${c.depth * 0.25})`}
                  />
                  {/* Crater rim highlight (top-left) */}
                  <Circle
                    cx={craterCx - craterR * 0.12}
                    cy={craterCy - craterR * 0.12}
                    r={craterR * 0.85}
                    fill="none"
                    stroke={`rgba(240,232,218,${c.depth * 0.12})`}
                    strokeWidth={craterR * 0.2}
                  />
                </G>
              );
            })}

            {/* Specular highlight */}
            <Circle cx={cx} cy={cy} r={r} fill="url(#specular)" />

            {/* Limb darkening */}
            <Circle cx={cx} cy={cy} r={r} fill="url(#limbDark)" />
          </G>
        ) : null}

        {/* Terminator edge softening — a thin gradient strip along the terminator line */}
        {!isFullMoon && !isNewMoon ? (
          <G clipPath="url(#moonDisc)">
            <Ellipse
              cx={cx}
              cy={cy}
              rx={size * 0.04}
              ry={r}
              fill="rgba(40,25,50,0.35)"
              opacity={0.6}
            />
          </G>
        ) : null}

        {/* Outer glow ring on the SVG level */}
        {!isNewMoon ? (
          <Circle
            cx={cx} cy={cy} r={r + 1}
            fill="none"
            stroke={isFullMoon ? 'rgba(255,248,225,0.08)' : 'rgba(220,215,235,0.06)'}
            strokeWidth={2}
          />
        ) : null}
      </Svg>
    </View>
  );
}
