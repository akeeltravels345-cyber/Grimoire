import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Defs, RadialGradient, LinearGradient as SvgLinearGradient,
  Stop, Circle, Ellipse, G, Path, Rect, ClipPath,
} from 'react-native-svg';

interface PlanetVisualProps {
  planetKey: string;
  size: number;
  showGlow?: boolean;
}

/**
 * Realistic SVG planet illustrations with radial gradients,
 * surface features, atmospheric effects, and characteristic details.
 */

interface PlanetConfig {
  baseGradient: { offset: string; color: string }[];
  highlightColor: string;
  glowColor: string;
  atmosphere?: string;
  limbColor: string;
}

const PLANET_CONFIGS: Record<string, PlanetConfig> = {
  sun: {
    baseGradient: [
      { offset: '0%', color: '#FFFCE8' },
      { offset: '25%', color: '#FFE680' },
      { offset: '55%', color: '#FFB830' },
      { offset: '80%', color: '#F59A10' },
      { offset: '100%', color: '#D07800' },
    ],
    highlightColor: 'rgba(255,255,245,0.6)',
    glowColor: 'rgba(255,200,60,0.45)',
    atmosphere: 'rgba(255,180,50,0.15)',
    limbColor: 'rgba(180,100,0,0.4)',
  },
  moon: {
    baseGradient: [
      { offset: '0%', color: '#F0E8DA' },
      { offset: '30%', color: '#E0D5C5' },
      { offset: '60%', color: '#CCC2B2' },
      { offset: '100%', color: '#AAA090' },
    ],
    highlightColor: 'rgba(255,252,245,0.35)',
    glowColor: 'rgba(200,195,210,0.25)',
    limbColor: 'rgba(80,70,60,0.35)',
  },
  mars: {
    baseGradient: [
      { offset: '0%', color: '#F0A888' },
      { offset: '30%', color: '#D87458' },
      { offset: '60%', color: '#C05040' },
      { offset: '100%', color: '#882828' },
    ],
    highlightColor: 'rgba(255,200,175,0.35)',
    glowColor: 'rgba(220,80,60,0.3)',
    atmosphere: 'rgba(200,100,80,0.08)',
    limbColor: 'rgba(80,20,15,0.4)',
  },
  mercury: {
    baseGradient: [
      { offset: '0%', color: '#C8C0D0' },
      { offset: '30%', color: '#A8A0B8' },
      { offset: '60%', color: '#8878A0' },
      { offset: '100%', color: '#5A4878' },
    ],
    highlightColor: 'rgba(220,210,240,0.35)',
    glowColor: 'rgba(140,100,200,0.25)',
    atmosphere: 'rgba(160,130,210,0.08)',
    limbColor: 'rgba(40,30,60,0.4)',
  },
  jupiter: {
    baseGradient: [
      { offset: '0%', color: '#F0D8B0' },
      { offset: '25%', color: '#E0C090' },
      { offset: '55%', color: '#CCA870' },
      { offset: '80%', color: '#B89050' },
      { offset: '100%', color: '#907038' },
    ],
    highlightColor: 'rgba(255,240,210,0.3)',
    glowColor: 'rgba(60,130,246,0.25)',
    atmosphere: 'rgba(100,150,230,0.08)',
    limbColor: 'rgba(70,50,25,0.4)',
  },
  venus: {
    baseGradient: [
      { offset: '0%', color: '#FFE0C8' },
      { offset: '25%', color: '#F5C8A8' },
      { offset: '55%', color: '#E8B090' },
      { offset: '100%', color: '#C89070' },
    ],
    highlightColor: 'rgba(255,235,215,0.4)',
    glowColor: 'rgba(240,180,120,0.25)',
    atmosphere: 'rgba(245,200,150,0.1)',
    limbColor: 'rgba(100,65,40,0.35)',
  },
  saturn: {
    baseGradient: [
      { offset: '0%', color: '#E8DCC0' },
      { offset: '30%', color: '#D4C8A8' },
      { offset: '60%', color: '#C0B090' },
      { offset: '100%', color: '#988868' },
    ],
    highlightColor: 'rgba(240,232,210,0.35)',
    glowColor: 'rgba(180,165,120,0.25)',
    atmosphere: 'rgba(180,170,150,0.08)',
    limbColor: 'rgba(70,60,40,0.4)',
  },
};

const DEFAULT_CONFIG: PlanetConfig = {
  baseGradient: [
    { offset: '0%', color: '#C0B8D0' },
    { offset: '50%', color: '#9088A8' },
    { offset: '100%', color: '#605880' },
  ],
  highlightColor: 'rgba(220,215,235,0.3)',
  glowColor: 'rgba(160,150,180,0.2)',
  limbColor: 'rgba(40,35,50,0.4)',
};

function renderSunFeatures(cx: number, cy: number, r: number) {
  // Solar granulation / convection cells
  return (
    <G>
      {/* Active regions / sunspots */}
      <Ellipse cx={cx + r * 0.2} cy={cy - r * 0.1} rx={r * 0.12} ry={r * 0.08}
        fill="rgba(210,150,50,0.25)" />
      <Ellipse cx={cx - r * 0.25} cy={cy + r * 0.25} rx={r * 0.08} ry={r * 0.06}
        fill="rgba(200,140,40,0.2)" />
      {/* Bright plages */}
      <Circle cx={cx + r * 0.35} cy={cy + r * 0.15} r={r * 0.06}
        fill="rgba(255,255,230,0.15)" />
      <Circle cx={cx - r * 0.15} cy={cy - r * 0.35} r={r * 0.05}
        fill="rgba(255,255,240,0.12)" />
      {/* Granulation texture circles */}
      {[
        { x: 0.1, y: 0.3, s: 0.04 }, { x: -0.3, y: -0.1, s: 0.035 },
        { x: 0.4, y: -0.3, s: 0.03 }, { x: -0.1, y: 0.4, s: 0.04 },
        { x: 0.25, y: -0.15, s: 0.025 },
      ].map((g, i) => (
        <Circle key={`gran-${i}`}
          cx={cx + g.x * r} cy={cy + g.y * r} r={g.s * r}
          fill="rgba(255,230,150,0.1)" />
      ))}
    </G>
  );
}

function renderMoonFeatures(cx: number, cy: number, r: number) {
  return (
    <G>
      {/* Mare patches */}
      <Ellipse cx={cx - r * 0.08} cy={cy - r * 0.15} rx={r * 0.18} ry={r * 0.13}
        fill="rgba(130,118,100,0.18)" />
      <Ellipse cx={cx + r * 0.1} cy={cy + r * 0.12} rx={r * 0.14} ry={r * 0.10}
        fill="rgba(130,118,100,0.14)" />
      {/* Craters */}
      {[
        { x: 0.25, y: -0.2, s: 0.08 }, { x: -0.2, y: 0.3, s: 0.06 },
        { x: 0.35, y: 0.1, s: 0.05 }, { x: -0.1, y: -0.35, s: 0.04 },
        { x: 0.1, y: 0.35, s: 0.05 }, { x: -0.3, y: 0, s: 0.035 },
      ].map((c, i) => (
        <G key={`mc-${i}`}>
          <Circle cx={cx + c.x * r} cy={cy + c.y * r} r={c.s * r}
            fill="rgba(160,145,125,0.2)" />
          <Circle cx={cx + c.x * r - c.s * r * 0.1} cy={cy + c.y * r - c.s * r * 0.1}
            r={c.s * r * 0.8} fill="none"
            stroke="rgba(230,220,205,0.08)" strokeWidth={c.s * r * 0.2} />
        </G>
      ))}
    </G>
  );
}

function renderMarsFeatures(cx: number, cy: number, r: number) {
  return (
    <G>
      {/* Polar ice cap */}
      <Ellipse cx={cx} cy={cy - r * 0.82} rx={r * 0.35} ry={r * 0.12}
        fill="rgba(240,235,225,0.25)" />
      {/* Dark regions (Syrtis Major-like) */}
      <Ellipse cx={cx + r * 0.15} cy={cy + r * 0.1} rx={r * 0.18} ry={r * 0.25}
        fill="rgba(100,55,40,0.18)" />
      <Ellipse cx={cx - r * 0.3} cy={cy - r * 0.1} rx={r * 0.12} ry={r * 0.15}
        fill="rgba(100,55,40,0.12)" />
      {/* Impact craters */}
      {[
        { x: 0.3, y: -0.25, s: 0.06 }, { x: -0.15, y: 0.35, s: 0.05 },
        { x: 0.1, y: 0.1, s: 0.04 },
      ].map((c, i) => (
        <Circle key={`mars-c-${i}`}
          cx={cx + c.x * r} cy={cy + c.y * r} r={c.s * r}
          fill="rgba(80,40,30,0.15)" />
      ))}
    </G>
  );
}

function renderMercuryFeatures(cx: number, cy: number, r: number) {
  return (
    <G>
      {/* Heavily cratered surface */}
      {[
        { x: 0.2, y: -0.2, s: 0.1 }, { x: -0.25, y: 0.15, s: 0.08 },
        { x: 0.35, y: 0.3, s: 0.07 }, { x: -0.1, y: -0.35, s: 0.06 },
        { x: 0.0, y: 0.2, s: 0.09 }, { x: -0.3, y: -0.1, s: 0.05 },
        { x: 0.15, y: 0.05, s: 0.04 },
      ].map((c, i) => (
        <G key={`merc-c-${i}`}>
          <Circle cx={cx + c.x * r} cy={cy + c.y * r} r={c.s * r}
            fill="rgba(80,65,100,0.15)" />
          <Circle cx={cx + c.x * r} cy={cy + c.y * r}
            r={c.s * r * 0.7} fill="none"
            stroke="rgba(180,165,200,0.06)" strokeWidth={c.s * r * 0.15} />
        </G>
      ))}
    </G>
  );
}

function renderJupiterFeatures(cx: number, cy: number, r: number) {
  return (
    <G>
      {/* Cloud bands */}
      {[
        { y: -0.38, h: 0.08, opacity: 0.12, light: false },
        { y: -0.22, h: 0.06, opacity: 0.08, light: true },
        { y: -0.08, h: 0.09, opacity: 0.14, light: false },
        { y: 0.08, h: 0.06, opacity: 0.06, light: true },
        { y: 0.20, h: 0.10, opacity: 0.15, light: false },
        { y: 0.36, h: 0.07, opacity: 0.10, light: false },
      ].map((band, i) => {
        const bandCy = cy + band.y * r;
        const bandH = band.h * r;
        const halfW = Math.sqrt(Math.max(0, r * r - (band.y * r) * (band.y * r)));
        return (
          <Ellipse key={`band-${i}`}
            cx={cx} cy={bandCy}
            rx={halfW * 0.95} ry={bandH}
            fill={band.light ? `rgba(255,240,210,${band.opacity})` : `rgba(160,120,70,${band.opacity})`}
          />
        );
      })}
      {/* Great Red Spot */}
      <Ellipse cx={cx + r * 0.25} cy={cy + r * 0.12} rx={r * 0.12} ry={r * 0.07}
        fill="rgba(200,100,60,0.3)" />
      <Ellipse cx={cx + r * 0.25} cy={cy + r * 0.12} rx={r * 0.08} ry={r * 0.04}
        fill="rgba(210,80,50,0.2)" />
    </G>
  );
}

function renderVenusFeatures(cx: number, cy: number, r: number) {
  return (
    <G>
      {/* Thick cloud bands */}
      {[
        { y: -0.3, rx: 0.4, ry: 0.06, opacity: 0.12 },
        { y: -0.1, rx: 0.42, ry: 0.07, opacity: 0.1 },
        { y: 0.12, rx: 0.38, ry: 0.06, opacity: 0.14 },
        { y: 0.3, rx: 0.35, ry: 0.05, opacity: 0.08 },
      ].map((c, i) => (
        <Ellipse key={`vcloud-${i}`}
          cx={cx + (i % 2 === 0 ? r * 0.05 : -r * 0.05)}
          cy={cy + c.y * r}
          rx={c.rx * r} ry={c.ry * r}
          fill={`rgba(255,235,210,${c.opacity})`}
        />
      ))}
      {/* Bright spot (subsolar point reflection) */}
      <Circle cx={cx - r * 0.1} cy={cy - r * 0.15} r={r * 0.15}
        fill="rgba(255,240,220,0.08)" />
    </G>
  );
}

function renderSaturnRings(cx: number, cy: number, r: number, size: number) {
  const ringW = r * 1.7;
  const ringH = r * 0.35;
  return (
    <G>
      {/* A ring (outer) */}
      <Ellipse cx={cx} cy={cy} rx={ringW} ry={ringH}
        fill="none" stroke="rgba(200,185,140,0.3)" strokeWidth={r * 0.06} />
      {/* B ring (main, brightest) */}
      <Ellipse cx={cx} cy={cy} rx={ringW * 0.88} ry={ringH * 0.88}
        fill="none" stroke="rgba(210,195,155,0.35)" strokeWidth={r * 0.1} />
      {/* Cassini division */}
      <Ellipse cx={cx} cy={cy} rx={ringW * 0.82} ry={ringH * 0.82}
        fill="none" stroke="rgba(20,15,10,0.15)" strokeWidth={r * 0.015} />
      {/* C ring (inner, faint) */}
      <Ellipse cx={cx} cy={cy} rx={ringW * 0.75} ry={ringH * 0.75}
        fill="none" stroke="rgba(180,165,125,0.18)" strokeWidth={r * 0.04} />
    </G>
  );
}

function renderSaturnBands(cx: number, cy: number, r: number) {
  return (
    <G>
      {[
        { y: -0.3, opacity: 0.08 },
        { y: -0.1, opacity: 0.06 },
        { y: 0.1, opacity: 0.08 },
        { y: 0.28, opacity: 0.06 },
      ].map((b, i) => {
        const halfW = Math.sqrt(Math.max(0, r * r - (b.y * r) * (b.y * r)));
        return (
          <Ellipse key={`sb-${i}`}
            cx={cx} cy={cy + b.y * r}
            rx={halfW * 0.9} ry={r * 0.04}
            fill={`rgba(180,160,110,${b.opacity})`}
          />
        );
      })}
    </G>
  );
}

function renderFeatures(planetKey: string, cx: number, cy: number, r: number, size: number) {
  switch (planetKey) {
    case 'sun': return renderSunFeatures(cx, cy, r);
    case 'moon': return renderMoonFeatures(cx, cy, r);
    case 'mars': return renderMarsFeatures(cx, cy, r);
    case 'mercury': return renderMercuryFeatures(cx, cy, r);
    case 'jupiter': return renderJupiterFeatures(cx, cy, r);
    case 'venus': return renderVenusFeatures(cx, cy, r);
    case 'saturn': return renderSaturnBands(cx, cy, r);
    default: return null;
  }
}

export default function PlanetVisual({ planetKey, size, showGlow = true }: PlanetVisualProps) {
  const config = PLANET_CONFIGS[planetKey] || DEFAULT_CONFIG;
  const isSaturn = planetKey === 'saturn';

  // Saturn needs extra width for rings (only when large enough to show them)
  const showRings = isSaturn && size >= 28;
  const svgW = showRings ? size * 2.0 : size;
  const svgH = showRings ? size * 1.2 : size;
  const cx = svgW / 2;
  const cy = svgH / 2;
  const r = size / 2 - 1;

  const glowSize = showGlow ? Math.max(svgW, svgH) * 1.4 : Math.max(svgW, svgH);

  return (
    <View style={{
      width: showRings ? svgW : (showGlow ? glowSize : size),
      height: showRings ? svgH : (showGlow ? glowSize : size),
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Outer atmospheric glow */}
      {showGlow ? (
        <View style={[styles.glow, {
          width: isSaturn ? svgW * 1.1 : glowSize,
          height: isSaturn ? svgH * 1.1 : glowSize,
          borderRadius: glowSize / 2,
          backgroundColor: config.glowColor,
          shadowColor: config.baseGradient[1]?.color || '#888',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: size * 0.35,
          elevation: 0,
        }]} />
      ) : null}

      <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        <Defs>
          {/* Base planet gradient */}
          <RadialGradient id={`base-${planetKey}`} cx="38%" cy="35%" rx="55%" ry="55%" fx="32%" fy="30%">
            {config.baseGradient.map((s, i) => (
              <Stop key={`bg-${i}`} offset={s.offset} stopColor={s.color} />
            ))}
          </RadialGradient>

          {/* Specular highlight */}
          <RadialGradient id={`spec-${planetKey}`} cx="32%" cy="28%" rx="28%" ry="22%">
            <Stop offset="0%" stopColor={config.highlightColor} />
            <Stop offset="50%" stopColor={config.highlightColor.replace(/[\d.]+\)$/, '0.05)')} />
            <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </RadialGradient>

          {/* Limb darkening */}
          <RadialGradient id={`limb-${planetKey}`} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <Stop offset="55%" stopColor="rgba(0,0,0,0)" />
            <Stop offset="78%" stopColor={config.limbColor.replace(/[\d.]+\)$/, '0.12)')} />
            <Stop offset="92%" stopColor={config.limbColor.replace(/[\d.]+\)$/, '0.3)')} />
            <Stop offset="100%" stopColor={config.limbColor} />
          </RadialGradient>

          {/* Planet disc clip */}
          <ClipPath id={`disc-${planetKey}`}>
            <Circle cx={cx} cy={cy} r={r} />
          </ClipPath>
        </Defs>

        {/* Saturn: back rings (behind planet) */}
        {showRings ? (
          <G opacity={0.5}>
            {renderSaturnRings(cx, cy, r, size)}
          </G>
        ) : null}

        {/* Planet body — clipped to disc */}
        <G clipPath={`url(#disc-${planetKey})`}>
          {/* Base surface */}
          <Circle cx={cx} cy={cy} r={r} fill={`url(#base-${planetKey})`} />

          {/* Surface features */}
          {renderFeatures(planetKey, cx, cy, r, size)}

          {/* Specular highlight */}
          <Circle cx={cx} cy={cy} r={r} fill={`url(#spec-${planetKey})`} />

          {/* Limb darkening */}
          <Circle cx={cx} cy={cy} r={r} fill={`url(#limb-${planetKey})`} />
        </G>

        {/* Saturn: front rings (in front of planet) — upper half clipped away */}
        {showRings ? (
          <G>
            <Defs>
              <ClipPath id="ring-front-clip">
                <Rect x={0} y={cy} width={svgW} height={svgH / 2} />
              </ClipPath>
            </Defs>
            <G clipPath="url(#ring-front-clip)">
              {renderSaturnRings(cx, cy, r, size)}
            </G>
          </G>
        ) : null}

        {/* Atmosphere rim */}
        {config.atmosphere ? (
          <Circle cx={cx} cy={cy} r={r}
            fill="none"
            stroke={config.atmosphere}
            strokeWidth={r * 0.04}
          />
        ) : null}

        {/* Outer subtle highlight rim (top) */}
        <Path
          d={`M ${cx - r * 0.7} ${cy - r * 0.72} A ${r} ${r} 0 0 1 ${cx + r * 0.7} ${cy - r * 0.72}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
});
