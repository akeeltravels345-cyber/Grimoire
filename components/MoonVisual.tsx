import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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
 * View-based moon phase visual that works reliably on all devices.
 * Uses overlapping Views with light moon surface and dark shadow overlay.
 *
 * phaseIndex: 0=New, 1=Wax.Crescent, 2=First Quarter, 3=Wax.Gibbous,
 *             4=Full, 5=Wan.Gibbous, 6=Last Quarter, 7=Wan.Crescent
 */

export default function MoonVisual({ phaseIndex, size }: MoonVisualProps) {
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const glowAnimStyle = useAnimatedStyle(() => {
    const scale = interpolate(breathe.value, [0, 1], [1, 1.12]);
    const opacity = interpolate(breathe.value, [0, 1], [0.4, 0.8]);
    return { transform: [{ scale }], opacity };
  });

  const isNewMoon = phaseIndex === 0;
  const isFullMoon = phaseIndex === 4;

  const glowSize = size * 1.4;

  // Moon surface colors — warm cream/gold tones visible on any background
  const moonSurfaceColor = isNewMoon ? '#3A3245' : '#F0E6D0';
  const moonSurfaceDarker = isNewMoon ? '#2A2035' : '#D8CDB8';

  // Glow color
  const glowColor = isNewMoon
    ? 'rgba(160,150,180,0.08)'
    : isFullMoon
      ? 'rgba(245,230,200,0.35)'
      : 'rgba(230,220,190,0.2)';

  // Calculate shadow for each phase
  // Shadow comes from the left for waning, right for waxing
  const getShadowStyle = () => {
    if (isFullMoon) return null; // No shadow
    if (isNewMoon) return { width: size, left: 0 }; // Full shadow (but moon is already dark)

    const halfSize = size / 2;

    switch (phaseIndex) {
      case 1: // Waxing Crescent — large shadow from left, thin sliver of light on right
        return { width: size * 0.75, left: 0 };
      case 2: // First Quarter — shadow covers left half
        return { width: halfSize, left: 0 };
      case 3: // Waxing Gibbous — small shadow on left
        return { width: size * 0.3, left: 0 };
      case 5: // Waning Gibbous — small shadow on right
        return { width: size * 0.3, right: 0 };
      case 6: // Last Quarter — shadow covers right half
        return { width: halfSize, right: 0 };
      case 7: // Waning Crescent — large shadow from right
        return { width: size * 0.75, right: 0 };
      default:
        return null;
    }
  };

  const shadowStyle = getShadowStyle();

  // Terminator curve direction and amount
  const getTerminatorBorderRadius = () => {
    // For crescents/gibbous, the terminator has a curved edge
    switch (phaseIndex) {
      case 1: // Waxing crescent — shadow has curved right edge (convex into light)
        return { borderTopRightRadius: size * 0.6, borderBottomRightRadius: size * 0.6 };
      case 3: // Waxing gibbous — shadow has curved right edge (concave, bulging into shadow)
        return { borderTopRightRadius: size * 0.3, borderBottomRightRadius: size * 0.3 };
      case 5: // Waning gibbous — shadow has curved left edge
        return { borderTopLeftRadius: size * 0.3, borderBottomLeftRadius: size * 0.3 };
      case 7: // Waning crescent — shadow has curved left edge
        return { borderTopLeftRadius: size * 0.6, borderBottomLeftRadius: size * 0.6 };
      default:
        return {};
    }
  };

  const terminatorRadius = getTerminatorBorderRadius();

  return (
    <View style={{ width: glowSize, height: glowSize, alignItems: 'center', justifyContent: 'center' }}>
      {/* Animated atmospheric glow */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: glowColor,
          },
          glowAnimStyle,
        ]}
      />

      {/* Glow ring */}
      {!isNewMoon ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: size * 1.15,
              height: size * 1.15,
              borderRadius: size * 0.575,
              borderWidth: 1,
              borderColor: isFullMoon ? 'rgba(255,248,230,0.12)' : 'rgba(230,220,200,0.08)',
            },
            glowAnimStyle,
          ]}
        />
      ) : null}

      {/* Moon disc */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: moonSurfaceColor,
          overflow: 'hidden',
          // Subtle shadow for depth
          shadowColor: isNewMoon ? '#8880AA' : '#FFF5E0',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isNewMoon ? 0.15 : 0.3,
          shadowRadius: size * 0.15,
          elevation: isNewMoon ? 1 : 3,
        }}
      >
        {/* Surface texture — lighter highlight area */}
        {!isNewMoon ? (
          <View
            style={{
              position: 'absolute',
              top: size * 0.1,
              left: size * 0.1,
              width: size * 0.55,
              height: size * 0.55,
              borderRadius: size * 0.275,
              backgroundColor: 'rgba(255,255,248,0.15)',
            }}
          />
        ) : null}

        {/* Mare patches (dark spots on the moon surface) */}
        {!isNewMoon ? (
          <>
            <View
              style={{
                position: 'absolute',
                top: size * 0.2,
                left: size * 0.25,
                width: size * 0.3,
                height: size * 0.22,
                borderRadius: size * 0.12,
                backgroundColor: 'rgba(120,110,95,0.18)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.45,
                left: size * 0.4,
                width: size * 0.25,
                height: size * 0.18,
                borderRadius: size * 0.1,
                backgroundColor: 'rgba(120,110,95,0.14)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.15,
                left: size * 0.55,
                width: size * 0.18,
                height: size * 0.14,
                borderRadius: size * 0.08,
                backgroundColor: 'rgba(120,110,95,0.12)',
              }}
            />
            {/* Small crater dots */}
            <View
              style={{
                position: 'absolute',
                top: size * 0.6,
                left: size * 0.2,
                width: size * 0.08,
                height: size * 0.08,
                borderRadius: size * 0.04,
                backgroundColor: 'rgba(140,130,115,0.15)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: size * 0.35,
                left: size * 0.65,
                width: size * 0.06,
                height: size * 0.06,
                borderRadius: size * 0.03,
                backgroundColor: 'rgba(140,130,115,0.12)',
              }}
            />
          </>
        ) : null}

        {/* Limb darkening — edge of the moon slightly darker */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: size / 2,
            borderWidth: size * 0.06,
            borderColor: isNewMoon ? 'rgba(15,10,25,0.4)' : 'rgba(100,85,70,0.12)',
          }}
        />

        {/* Phase shadow overlay */}
        {shadowStyle && !isNewMoon ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(8,5,18,0.92)',
              ...shadowStyle,
              ...terminatorRadius,
            }}
          />
        ) : null}

        {/* New moon: faint limb outline */}
        {isNewMoon ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: size / 2,
              borderWidth: 1,
              borderColor: 'rgba(200,190,210,0.2)',
            }}
          />
        ) : null}
      </View>
    </View>
  );
}
