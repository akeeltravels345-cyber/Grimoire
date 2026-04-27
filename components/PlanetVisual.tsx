import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PlanetVisualProps {
  planetKey: string;
  size: number;
  showGlow?: boolean;
}

/**
 * Realistic planet sphere visuals with gradients, atmospheric glow,
 * surface details, and characteristic features (rings for Saturn, bands for Jupiter, etc.)
 */

// Planet appearance configs
const PLANET_VISUALS: Record<string, {
  baseColors: string[];
  highlightColor: string;
  glowColor: string;
  features?: 'bands' | 'rings' | 'spot' | 'craters' | 'clouds' | 'swirl';
  featureColor?: string;
  atmosphere?: string;
}> = {
  sun: {
    baseColors: ['#FFF0B8', '#FFD966', '#F5A623', '#E08A00'],
    highlightColor: 'rgba(255,255,240,0.55)',
    glowColor: 'rgba(255,200,60,0.5)',
    features: 'swirl',
    featureColor: '#FFB830',
    atmosphere: 'rgba(255,180,50,0.2)',
  },
  moon: {
    baseColors: ['#E8E0D2', '#D0C8BA', '#B8AFA2', '#A09890'],
    highlightColor: 'rgba(255,252,245,0.35)',
    glowColor: 'rgba(200,195,210,0.3)',
    features: 'craters',
    featureColor: '#9A9080',
  },
  mars: {
    baseColors: ['#E8A088', '#D4725A', '#C05040', '#983828'],
    highlightColor: 'rgba(255,200,180,0.35)',
    glowColor: 'rgba(220,80,60,0.3)',
    features: 'craters',
    featureColor: '#B85838',
    atmosphere: 'rgba(200,100,80,0.1)',
  },
  mercury: {
    baseColors: ['#C8B8D8', '#A088C0', '#7860A0', '#5A4580'],
    highlightColor: 'rgba(220,200,245,0.35)',
    glowColor: 'rgba(140,90,210,0.3)',
    features: 'swirl',
    featureColor: '#9070B8',
    atmosphere: 'rgba(160,120,220,0.12)',
  },
  jupiter: {
    baseColors: ['#E8D0A8', '#D4B888', '#C8A068', '#B08848'],
    highlightColor: 'rgba(255,240,210,0.35)',
    glowColor: 'rgba(60,130,246,0.3)',
    features: 'bands',
    featureColor: '#C09058',
    atmosphere: 'rgba(100,150,230,0.1)',
  },
  venus: {
    baseColors: ['#FFD0E0', '#F0A0C0', '#E07098', '#C85078'],
    highlightColor: 'rgba(255,220,240,0.4)',
    glowColor: 'rgba(236,72,153,0.3)',
    features: 'clouds',
    featureColor: '#F0B8D0',
    atmosphere: 'rgba(240,160,200,0.12)',
  },
  saturn: {
    baseColors: ['#D8CCA8', '#C4B890', '#A89870', '#8A7858'],
    highlightColor: 'rgba(240,230,200,0.35)',
    glowColor: 'rgba(100,116,139,0.3)',
    features: 'rings',
    featureColor: '#C8B888',
    atmosphere: 'rgba(180,170,150,0.1)',
  },
};

const DEFAULT_VISUAL = {
  baseColors: ['#C0B8D0', '#A098B8', '#8078A0', '#605880'],
  highlightColor: 'rgba(220,215,235,0.3)',
  glowColor: 'rgba(160,150,180,0.25)',
};

export default function PlanetVisual({ planetKey, size, showGlow = true }: PlanetVisualProps) {
  const config = PLANET_VISUALS[planetKey] || DEFAULT_VISUAL;
  const r = size / 2;
  const glowSize = size * 1.4;

  const renderFeatures = () => {
    const feat = 'features' in config ? config.features : undefined;
    const featColor = 'featureColor' in config ? config.featureColor : '#888';

    switch (feat) {
      case 'bands':
        // Jupiter-style horizontal cloud bands
        return (
          <>
            {[0.22, 0.38, 0.52, 0.65, 0.78].map((y, i) => (
              <View key={`band-${i}`} style={{
                position: 'absolute',
                left: size * 0.08,
                right: size * 0.08,
                top: y * size,
                height: size * (i % 2 === 0 ? 0.06 : 0.04),
                borderRadius: size * 0.03,
                backgroundColor: i % 2 === 0
                  ? `${featColor}40`
                  : 'rgba(255,255,255,0.08)',
              }} />
            ))}
            {/* Great red spot */}
            <View style={{
              position: 'absolute',
              left: size * 0.55,
              top: size * 0.45,
              width: size * 0.14,
              height: size * 0.09,
              borderRadius: size * 0.05,
              backgroundColor: 'rgba(200,100,60,0.35)',
            }} />
          </>
        );

      case 'rings':
        // Saturn-style rings
        return (
          <View style={{
            position: 'absolute',
            width: size * 1.6,
            height: size * 0.45,
            left: -size * 0.3,
            top: size * 0.28,
            zIndex: -1,
          }}>
            {/* Outer ring */}
            <View style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: size * 0.8,
              borderWidth: size * 0.035,
              borderColor: `rgba(200,185,135,0.35)`,
              backgroundColor: 'transparent',
              transform: [{ scaleY: 0.35 }],
            }} />
            {/* Middle ring */}
            <View style={{
              position: 'absolute',
              width: '88%',
              height: '88%',
              left: '6%',
              top: '6%',
              borderRadius: size * 0.7,
              borderWidth: size * 0.05,
              borderColor: `rgba(180,165,120,0.25)`,
              backgroundColor: 'transparent',
              transform: [{ scaleY: 0.35 }],
            }} />
            {/* Inner ring */}
            <View style={{
              position: 'absolute',
              width: '76%',
              height: '76%',
              left: '12%',
              top: '12%',
              borderRadius: size * 0.6,
              borderWidth: size * 0.025,
              borderColor: `rgba(160,148,110,0.2)`,
              backgroundColor: 'transparent',
              transform: [{ scaleY: 0.35 }],
            }} />
          </View>
        );

      case 'craters':
        // Mars/Moon surface craters
        return (
          <>
            {[
              { x: 0.30, y: 0.28, s: 0.10 },
              { x: 0.58, y: 0.20, s: 0.07 },
              { x: 0.65, y: 0.48, s: 0.12 },
              { x: 0.35, y: 0.62, s: 0.08 },
              { x: 0.50, y: 0.75, s: 0.06 },
              { x: 0.25, y: 0.48, s: 0.05 },
            ].map((c, i) => {
              const cs = c.s * size;
              return (
                <View key={`crater-${i}`} style={{
                  position: 'absolute',
                  left: c.x * size - cs / 2,
                  top: c.y * size - cs / 2,
                  width: cs,
                  height: cs,
                  borderRadius: cs / 2,
                  backgroundColor: `${featColor}25`,
                  borderWidth: cs * 0.1,
                  borderColor: `${featColor}15`,
                }} />
              );
            })}
          </>
        );

      case 'clouds':
        // Venus cloud wisps
        return (
          <>
            {[
              { x: 0.20, y: 0.30, w: 0.35, h: 0.06 },
              { x: 0.40, y: 0.48, w: 0.30, h: 0.05 },
              { x: 0.25, y: 0.62, w: 0.40, h: 0.05 },
              { x: 0.45, y: 0.20, w: 0.25, h: 0.04 },
            ].map((c, i) => (
              <View key={`cloud-${i}`} style={{
                position: 'absolute',
                left: c.x * size,
                top: c.y * size,
                width: c.w * size,
                height: c.h * size,
                borderRadius: c.h * size,
                backgroundColor: `${featColor}30`,
              }} />
            ))}
          </>
        );

      case 'swirl':
        // Sun/Mercury swirl patterns
        return (
          <>
            {[
              { x: 0.25, y: 0.35, w: 0.22, h: 0.18, r: -15 },
              { x: 0.50, y: 0.50, w: 0.18, h: 0.14, r: 20 },
              { x: 0.35, y: 0.68, w: 0.20, h: 0.10, r: -8 },
            ].map((s, i) => (
              <View key={`swirl-${i}`} style={{
                position: 'absolute',
                left: s.x * size,
                top: s.y * size,
                width: s.w * size,
                height: s.h * size,
                borderRadius: s.w * size / 2,
                backgroundColor: `${featColor}20`,
                transform: [{ rotate: `${s.r}deg` }],
              }} />
            ))}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <View style={{ width: glowSize, height: planetKey === 'saturn' ? glowSize * 0.85 : glowSize, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer atmospheric glow */}
      {showGlow ? (
        <View style={[styles.glow, {
          width: glowSize,
          height: glowSize,
          borderRadius: glowSize / 2,
          backgroundColor: config.glowColor,
          shadowColor: config.baseColors[1],
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: size * 0.4,
          elevation: 0,
        }]} />
      ) : null}

      {/* Planet body */}
      <View style={[styles.body, {
        width: size,
        height: size,
        borderRadius: r,
        overflow: planetKey === 'saturn' ? 'visible' : 'hidden',
      }]}>
        {/* Base gradient */}
        <LinearGradient
          colors={config.baseColors as [string, string, ...string[]]}
          locations={[0, 0.3, 0.6, 1]}
          start={{ x: 0.25, y: 0.15 }}
          end={{ x: 0.75, y: 0.9 }}
          style={[StyleSheet.absoluteFill, { borderRadius: r }]}
        />

        {/* Top-left specular highlight */}
        <View style={{
          position: 'absolute',
          width: size * 0.5,
          height: size * 0.35,
          borderRadius: size * 0.2,
          top: size * 0.08,
          left: size * 0.12,
          backgroundColor: config.highlightColor,
          transform: [{ rotate: '-20deg' }],
        }} />

        {/* Secondary softer highlight */}
        <View style={{
          position: 'absolute',
          width: size * 0.25,
          height: size * 0.18,
          borderRadius: size * 0.1,
          top: size * 0.15,
          left: size * 0.22,
          backgroundColor: 'rgba(255,255,255,0.12)',
          transform: [{ rotate: '-15deg' }],
        }} />

        {/* Surface features */}
        {renderFeatures()}

        {/* Limb darkening */}
        <LinearGradient
          colors={['transparent', 'transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.4)']}
          locations={[0, 0.5, 0.75, 1]}
          start={{ x: 0.3, y: 0.2 }}
          end={{ x: 0.8, y: 0.9 }}
          style={[StyleSheet.absoluteFill, { borderRadius: r }]}
          pointerEvents="none"
        />

        {/* Atmosphere rim */}
        {'atmosphere' in config && config.atmosphere ? (
          <View style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: r,
            borderWidth: size * 0.02,
            borderColor: config.atmosphere,
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
  body: {
    position: 'absolute',
  },
});
