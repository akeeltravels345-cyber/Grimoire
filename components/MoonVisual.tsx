import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MoonVisualProps {
  phaseIndex: number;
  size: number;
}

/**
 * Realistic moon phase visual with craters, atmospheric glow, and terminator line.
 * phaseIndex: 0=New, 1=Wax.Crescent, 2=First Quarter, 3=Wax.Gibbous,
 *             4=Full, 5=Wan.Gibbous, 6=Last Quarter, 7=Wan.Crescent
 */
export default function MoonVisual({ phaseIndex, size }: MoonVisualProps) {
  const r = size / 2;

  // Crater positions relative to size (as fractions)
  const craters = [
    { x: 0.30, y: 0.25, s: 0.14 },
    { x: 0.55, y: 0.18, s: 0.10 },
    { x: 0.68, y: 0.42, s: 0.16 },
    { x: 0.38, y: 0.55, s: 0.12 },
    { x: 0.22, y: 0.68, s: 0.09 },
    { x: 0.52, y: 0.72, s: 0.11 },
    { x: 0.42, y: 0.38, s: 0.07 },
    { x: 0.75, y: 0.65, s: 0.08 },
    { x: 0.18, y: 0.45, s: 0.06 },
  ];

  // Mare (dark patches) positions
  const mares = [
    { x: 0.35, y: 0.30, w: 0.28, h: 0.22 },
    { x: 0.50, y: 0.55, w: 0.24, h: 0.18 },
    { x: 0.20, y: 0.50, w: 0.18, h: 0.14 },
  ];

  // Shadow offset for phase simulation
  const getTerminatorOffset = () => {
    // Returns: left offset of shadow circle as fraction of size
    // Negative = shadow from left (waxing), Positive = shadow from right (waning)
    const offsets: Record<number, number> = {
      0: 0,        // New moon (fully shadowed)
      1: -0.32,    // Waxing crescent
      2: -0.55,    // First quarter
      3: -0.85,    // Waxing gibbous
      4: 999,      // Full (no shadow)
      5: 0.85,     // Waning gibbous
      6: 0.55,     // Last quarter
      7: 0.32,     // Waning crescent
    };
    return offsets[phaseIndex] ?? 0;
  };

  const terminatorOffset = getTerminatorOffset();
  const isFullMoon = phaseIndex === 4;
  const isNewMoon = phaseIndex === 0;

  // Glow color based on phase
  const glowColor = isNewMoon
    ? 'rgba(180,170,200,0.15)'
    : isFullMoon
      ? 'rgba(245,230,200,0.5)'
      : 'rgba(220,210,190,0.3)';

  const glowSize = size * 1.45;

  return (
    <View style={{ width: glowSize, height: glowSize, alignItems: 'center', justifyContent: 'center' }}>
      {/* Atmospheric glow */}
      <View style={[styles.glow, {
        width: glowSize, height: glowSize, borderRadius: glowSize / 2,
        backgroundColor: glowColor,
        shadowColor: isFullMoon ? '#FFF5E0' : '#D0C8E0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isFullMoon ? 0.7 : 0.3,
        shadowRadius: size * 0.5,
        elevation: 0,
      }]} />

      {/* Secondary soft glow ring */}
      {!isNewMoon ? (
        <View style={[styles.glowRing, {
          width: size * 1.25, height: size * 1.25, borderRadius: size * 0.625,
          borderWidth: size * 0.03,
          borderColor: isFullMoon ? 'rgba(255,248,230,0.12)' : 'rgba(220,215,235,0.08)',
        }]} />
      ) : null}

      {/* Moon body */}
      <View style={[styles.moonBody, {
        width: size, height: size, borderRadius: r,
        overflow: 'hidden',
      }]}>
        {/* Base surface gradient */}
        <LinearGradient
          colors={
            isNewMoon
              ? ['#2A2035', '#1A1525', '#151020']
              : ['#F0E8D8', '#E8DCC8', '#D8CCBA', '#C8BCA8']
          }
          locations={[0, 0.3, 0.6, 1]}
          start={{ x: 0.3, y: 0.15 }}
          end={{ x: 0.7, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Warm highlight (top-left illumination) */}
        {!isNewMoon ? (
          <LinearGradient
            colors={['rgba(255,250,235,0.45)', 'rgba(255,245,220,0.15)', 'transparent']}
            start={{ x: 0.2, y: 0.1 }}
            end={{ x: 0.8, y: 0.8 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {/* Mare (dark patches) — subtle basalt seas */}
        {!isNewMoon ? mares.map((m, i) => (
          <View
            key={`mare-${i}`}
            style={{
              position: 'absolute',
              left: m.x * size - (m.w * size) / 2,
              top: m.y * size - (m.h * size) / 2,
              width: m.w * size,
              height: m.h * size,
              borderRadius: (m.w * size) / 2,
              backgroundColor: 'rgba(140,125,110,0.25)',
            }}
          />
        )) : null}

        {/* Craters */}
        {!isNewMoon ? craters.map((c, i) => {
          const craterSize = c.s * size;
          return (
            <View key={`crater-${i}`} style={{
              position: 'absolute',
              left: c.x * size - craterSize / 2,
              top: c.y * size - craterSize / 2,
              width: craterSize,
              height: craterSize,
              borderRadius: craterSize / 2,
              backgroundColor: 'rgba(160,145,130,0.2)',
              borderWidth: craterSize * 0.08,
              borderColor: 'rgba(120,110,95,0.15)',
              // Subtle inner shadow effect
              shadowColor: '#8B7D6B',
              shadowOffset: { width: craterSize * 0.1, height: craterSize * 0.1 },
              shadowOpacity: 0.15,
              shadowRadius: craterSize * 0.2,
            }} />
          );
        }) : null}

        {/* Limb darkening (edge shadow) */}
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(80,60,50,0.25)', 'rgba(40,30,25,0.5)']}
          locations={[0, 0.55, 0.8, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: r }]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Phase terminator shadow */}
        {!isFullMoon ? (
          <View style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: r,
            backgroundColor: isNewMoon ? 'rgba(15,10,25,0.92)' : 'rgba(15,10,25,0.88)',
            left: terminatorOffset * size,
            top: 0,
          }} />
        ) : null}

        {/* Terminator edge gradient (soft transition) */}
        {!isFullMoon && !isNewMoon ? (
          <LinearGradient
            colors={
              phaseIndex < 4
                ? ['transparent', 'rgba(15,10,25,0.6)', 'rgba(15,10,25,0.88)']
                : ['rgba(15,10,25,0.88)', 'rgba(15,10,25,0.6)', 'transparent']
            }
            start={{ x: phaseIndex < 4 ? 0.3 : 0.7, y: 0.5 }}
            end={{ x: phaseIndex < 4 ? 0.7 : 0.3, y: 0.5 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : null}

        {/* Specular highlight on illuminated portion */}
        {!isNewMoon ? (
          <View style={{
            position: 'absolute',
            width: size * 0.35,
            height: size * 0.25,
            borderRadius: size * 0.15,
            backgroundColor: 'rgba(255,252,245,0.18)',
            top: size * 0.15,
            left: phaseIndex <= 4 ? size * 0.15 : size * 0.5,
            transform: [{ rotate: '-25deg' }],
          }} />
        ) : null}

        {/* New moon faint limb glow */}
        {isNewMoon ? (
          <View style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: r,
            borderWidth: 1.5,
            borderColor: 'rgba(200,190,210,0.18)',
          }} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
  glowRing: {
    position: 'absolute',
  },
  moonBody: {
    position: 'absolute',
  },
});
