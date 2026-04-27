import React from 'react';
import { View, StyleSheet } from 'react-native';

interface PlanetVisualProps {
  planetKey: string;
  size: number;
  showGlow?: boolean;
}

interface PlanetStyle {
  bg: string;
  highlight: string;
  glow: string;
  accent?: string;
  ring?: string;
  hasStripes?: boolean;
  stripeColors?: string[];
  hasCap?: boolean;
}

const PLANETS: Record<string, PlanetStyle> = {
  sun: {
    bg: '#FFB830',
    highlight: 'rgba(255,252,230,0.6)',
    glow: 'rgba(255,200,60,0.5)',
    accent: '#F59A10',
  },
  moon: {
    bg: '#D8CEBC',
    highlight: 'rgba(255,252,245,0.35)',
    glow: 'rgba(200,195,210,0.25)',
    accent: '#B8AE9C',
  },
  mars: {
    bg: '#C85040',
    highlight: 'rgba(255,180,150,0.35)',
    glow: 'rgba(220,80,60,0.3)',
    accent: '#A03828',
    hasCap: true,
  },
  mercury: {
    bg: '#9088A8',
    highlight: 'rgba(210,200,230,0.3)',
    glow: 'rgba(140,100,200,0.25)',
    accent: '#706090',
  },
  jupiter: {
    bg: '#D0A870',
    highlight: 'rgba(255,235,200,0.3)',
    glow: 'rgba(200,170,100,0.3)',
    hasStripes: true,
    stripeColors: ['rgba(180,130,60,0.25)', 'rgba(220,190,130,0.15)', 'rgba(160,110,50,0.3)', 'rgba(210,180,120,0.12)', 'rgba(170,120,55,0.25)'],
    accent: '#C08848',
  },
  venus: {
    bg: '#E8B890',
    highlight: 'rgba(255,235,215,0.4)',
    glow: 'rgba(240,180,120,0.25)',
    accent: '#D0A078',
  },
  saturn: {
    bg: '#D0C098',
    highlight: 'rgba(240,232,210,0.35)',
    glow: 'rgba(180,165,120,0.3)',
    ring: 'rgba(210,195,155,0.5)',
    hasStripes: true,
    stripeColors: ['rgba(180,160,110,0.15)', 'rgba(200,185,140,0.1)', 'rgba(170,150,100,0.15)'],
    accent: '#B8A878',
  },
};

const DEFAULT_STYLE: PlanetStyle = {
  bg: '#9088A8',
  highlight: 'rgba(220,215,235,0.3)',
  glow: 'rgba(160,150,180,0.2)',
  accent: '#706090',
};

export default function PlanetVisual({ planetKey, size, showGlow = true }: PlanetVisualProps) {
  const config = PLANETS[planetKey] || DEFAULT_STYLE;
  const r = size / 2;
  const isSaturn = planetKey === 'saturn';
  const showRing = isSaturn && size >= 28;

  const containerW = showRing ? size * 1.9 : size;
  const containerH = showRing ? size * 1.1 : size;

  return (
    <View style={{ width: containerW, height: containerH, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer glow */}
      {showGlow ? (
        <View style={[styles.glow, {
          width: size * 1.35,
          height: size * 1.35,
          borderRadius: size * 0.675,
          backgroundColor: config.glow,
          shadowColor: config.bg,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: size * 0.3,
          elevation: 0,
        }]} />
      ) : null}

      {/* Saturn ring (behind planet) */}
      {showRing ? (
        <View style={[styles.ring, {
          width: size * 1.8,
          height: size * 0.45,
          borderRadius: size * 0.9,
          borderWidth: Math.max(2, size * 0.06),
          borderColor: config.ring || 'rgba(210,195,155,0.4)',
          top: containerH / 2 - size * 0.225,
        }]} />
      ) : null}

      {/* Planet body */}
      <View style={[styles.planet, {
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: config.bg,
        overflow: 'hidden',
      }]}>
        {/* Stripes for Jupiter / Saturn */}
        {config.hasStripes && config.stripeColors ? (
          config.stripeColors.map((color, i) => {
            const bandHeight = size / (config.stripeColors!.length + 1);
            return (
              <View key={`stripe-${i}`} style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: bandHeight * (i + 0.5),
                height: bandHeight * 0.6,
                backgroundColor: color,
                borderRadius: bandHeight * 0.3,
              }} />
            );
          })
        ) : null}

        {/* Mars polar cap */}
        {config.hasCap ? (
          <View style={{
            position: 'absolute',
            top: -size * 0.02,
            left: size * 0.2,
            right: size * 0.2,
            height: size * 0.18,
            borderBottomLeftRadius: size * 0.25,
            borderBottomRightRadius: size * 0.25,
            backgroundColor: 'rgba(235,228,218,0.3)',
          }} />
        ) : null}

        {/* Jupiter Great Red Spot */}
        {planetKey === 'jupiter' ? (
          <View style={{
            position: 'absolute',
            top: size * 0.48,
            left: size * 0.55,
            width: size * 0.18,
            height: size * 0.1,
            borderRadius: size * 0.09,
            backgroundColor: 'rgba(195,90,55,0.35)',
          }} />
        ) : null}

        {/* Moon craters */}
        {planetKey === 'moon' ? (
          <>
            <View style={{ position: 'absolute', top: size * 0.2, left: size * 0.25, width: size * 0.12, height: size * 0.12, borderRadius: size * 0.06, backgroundColor: 'rgba(150,138,120,0.2)' }} />
            <View style={{ position: 'absolute', top: size * 0.5, left: size * 0.55, width: size * 0.1, height: size * 0.1, borderRadius: size * 0.05, backgroundColor: 'rgba(150,138,120,0.18)' }} />
            <View style={{ position: 'absolute', top: size * 0.35, left: size * 0.12, width: size * 0.08, height: size * 0.08, borderRadius: size * 0.04, backgroundColor: 'rgba(150,138,120,0.15)' }} />
            <View style={{ position: 'absolute', top: size * 0.65, left: size * 0.3, width: size * 0.07, height: size * 0.07, borderRadius: size * 0.035, backgroundColor: 'rgba(150,138,120,0.16)' }} />
          </>
        ) : null}

        {/* Mercury craters */}
        {planetKey === 'mercury' ? (
          <>
            <View style={{ position: 'absolute', top: size * 0.22, left: size * 0.3, width: size * 0.14, height: size * 0.14, borderRadius: size * 0.07, backgroundColor: 'rgba(80,65,100,0.18)' }} />
            <View style={{ position: 'absolute', top: size * 0.48, left: size * 0.55, width: size * 0.1, height: size * 0.1, borderRadius: size * 0.05, backgroundColor: 'rgba(80,65,100,0.15)' }} />
            <View style={{ position: 'absolute', top: size * 0.6, left: size * 0.18, width: size * 0.08, height: size * 0.08, borderRadius: size * 0.04, backgroundColor: 'rgba(80,65,100,0.13)' }} />
          </>
        ) : null}

        {/* Sun active regions */}
        {planetKey === 'sun' ? (
          <>
            <View style={{ position: 'absolute', top: size * 0.3, left: size * 0.5, width: size * 0.15, height: size * 0.1, borderRadius: size * 0.05, backgroundColor: 'rgba(255,255,230,0.15)' }} />
            <View style={{ position: 'absolute', top: size * 0.55, left: size * 0.2, width: size * 0.1, height: size * 0.08, borderRadius: size * 0.04, backgroundColor: 'rgba(210,150,50,0.2)' }} />
          </>
        ) : null}

        {/* Venus clouds */}
        {planetKey === 'venus' ? (
          <>
            <View style={{ position: 'absolute', top: size * 0.25, left: size * 0.1, right: size * 0.15, height: size * 0.08, borderRadius: size * 0.04, backgroundColor: 'rgba(255,235,210,0.12)' }} />
            <View style={{ position: 'absolute', top: size * 0.5, left: size * 0.15, right: size * 0.1, height: size * 0.07, borderRadius: size * 0.035, backgroundColor: 'rgba(255,235,210,0.1)' }} />
          </>
        ) : null}

        {/* Specular highlight */}
        <View style={[styles.highlight, {
          width: size * 0.5,
          height: size * 0.4,
          borderRadius: size * 0.25,
          backgroundColor: config.highlight,
          top: size * 0.08,
          left: size * 0.12,
        }]} />

        {/* Limb darkening overlay */}
        <View style={[styles.limbDark, {
          width: size,
          height: size,
          borderRadius: r,
          borderWidth: Math.max(2, size * 0.12),
          borderColor: 'rgba(0,0,0,0.18)',
        }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    backgroundColor: 'transparent',
    zIndex: 0,
  },
  planet: {
    zIndex: 1,
  },
  highlight: {
    position: 'absolute',
  },
  limbDark: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
