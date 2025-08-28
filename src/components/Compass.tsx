import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import Svg, { Circle, Line, Text as SvgText, G, Polygon } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

// Shared compass hook that can be used by multiple components
export const useCompass = () => {
  const [heading, setHeading] = useState(0);
  const smoothedHeadingRef = useRef(0);
  const accelRef = useRef({ x: 0, y: 0, z: 0 });

  // Calculate tilt-compensated compass heading
  const calculateTiltCompensatedHeading = (magnet: { x: number; y: number; z: number }, accel: { x: number; y: number; z: number }): number => {
    // Normalize vectors
    const norm = (vec: { x: number; y: number; z: number }) => {
      const mag = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z) || 1;
      return { x: vec.x / mag, y: vec.y / mag, z: vec.z / mag };
    };

    const a = norm(accel);
    const m = norm(magnet);

    // Calculate roll and pitch from accelerometer
    const roll = Math.atan2(a.y, a.z); // Rotation around X axis
    const pitch = Math.atan2(-a.x, Math.sqrt(a.y * a.y + a.z * a.z)); // Rotation around Y axis

    // Tilt compensation
    const mx = m.x * Math.cos(pitch) + m.z * Math.sin(pitch);
    const my = m.x * Math.sin(roll) * Math.sin(pitch) + m.y * Math.cos(roll) - m.z * Math.sin(roll) * Math.cos(pitch);

    // Calculate heading
    const radians = Math.atan2(-mx, my);
    let degrees = radians * (180 / Math.PI);

    // Convert to 0-360 range
    return (degrees + 360) % 360;
  };

  useEffect(() => {
    let magSub: any;
    let accSub: any;

    const startCompass = async () => {
      Magnetometer.setUpdateInterval(100);
      Accelerometer.setUpdateInterval(100);

      // Listen to accelerometer for device orientation
      accSub = Accelerometer.addListener((data) => {
        accelRef.current = data;
      });

      // Listen to magnetometer with tilt compensation
      magSub = Magnetometer.addListener((data) => {
        const accel = accelRef.current;

        // Calculate tilt-compensated heading (fallback to basic if no accel data)
        let degrees: number;
        if (accel && (accel.x !== 0 || accel.y !== 0 || accel.z !== 0)) {
          degrees = calculateTiltCompensatedHeading(data, accel);
        } else {
          // Fallback to basic calculation if accelerometer data is not available
          const radians = Math.atan2(data.y, data.x);
          degrees = (radians * 180 / Math.PI + 360) % 360;
        }

        // Smooth the transition to avoid jerky movements
        const current = smoothedHeadingRef.current;
        let diff = degrees - current;

        // Handle 360/0 boundary crossing
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        // Apply smoothing (lower = smoother)
        const smoothingFactor = 0.3;
        const smoothed = current + diff * smoothingFactor;

        // Keep in 0-360 range
        const finalHeading = ((smoothed % 360) + 360) % 360;

        smoothedHeadingRef.current = finalHeading;
        setHeading(finalHeading);
      });
    };

    startCompass();

    return () => {
      if (magSub) magSub.remove();
      if (accSub) accSub.remove();
    };
  }, []);

  return heading;
};

interface CompassProps {
  style?: ViewStyle;
}

export default function Compass({ style }: CompassProps) {
  const heading = useCompass(); // Use the shared compass hook
  const { theme, isDark } = useTheme();

  // Compass dimensions
  const size = 180;
  const center = size / 2;
  const outerRadius = center - 12;
  const innerRadius = outerRadius - 20;

  // Generate tick marks
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const isMain = deg % 90 === 0;
    const tickLength = isMain ? 15 : 10;
    const tickRadius = outerRadius - tickLength;

    const x1 = center + Math.cos(rad) * outerRadius;
    const y1 = center + Math.sin(rad) * outerRadius;
    const x2 = center + Math.cos(rad) * tickRadius;
    const y2 = center + Math.sin(rad) * tickRadius;

    ticks.push(
      <Line
        key={deg}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isDark ? '#64748b' : '#475569'}
        strokeWidth={isMain ? 2 : 1}
      />
    );
  }

  // Cardinal directions
  const directions = [
    { label: 'N', angle: 0, color: '#ef4444' },
    { label: 'E', angle: 90, color: isDark ? '#e2e8f0' : '#334155' },
    { label: 'S', angle: 180, color: isDark ? '#e2e8f0' : '#334155' },
    { label: 'W', angle: 270, color: isDark ? '#e2e8f0' : '#334155' },
  ];

  const labels = directions.map(({ label, angle, color }) => {
    const rad = (angle * Math.PI) / 180;
    const labelRadius = outerRadius - 30;
    const x = center + Math.cos(rad) * labelRadius;
    const y = center + Math.sin(rad) * labelRadius;

    return (
      <SvgText
        key={label}
        x={x}
        y={y + 5}
        fontSize="16"
        fontWeight="bold"
        fill={color}
        textAnchor="middle"
      >
        {label}
      </SvgText>
    );
  });

  // Rotate the compass face - try -90° offset instead
  // Negative rotation for opposite direction, -90° to correct cardinal alignment
  const visualRotation = -heading - 90;
  const faceRotation = `rotate(${visualRotation} ${center} ${center})`;

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      marginVertical: 10,
    },
    compassContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.colors.border,
    },
    infoContainer: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginTop: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    headingText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
    },
    directionText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 2,
    },
  });

  const getCardinalDirection = (deg: number): string => {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(deg / 22.5) % 16;
    return dirs[idx];
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.compassContainer}>
        <Svg width={size} height={size}>
          {/* Outer ring */}
          <Circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke={isDark ? '#475569' : '#64748b'}
            strokeWidth={2}
          />

          {/* Inner ring */}
          <Circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke={isDark ? '#334155' : '#cbd5e1'}
            strokeWidth={1}
          />

          {/* Rotating face */}
          <G transform={faceRotation}>
            {ticks}
            {labels}
          </G>

          {/* Fixed north needle */}
          <Polygon
            points={`${center},${center - outerRadius + 25} ${center - 6},${center - 6} ${center + 6},${center - 6}`}
            fill="#ef4444"
            stroke="#dc2626"
            strokeWidth={1.5}
          />

          <Line
            x1={center}
            y1={center - 6}
            x2={center}
            y2={center - outerRadius + 25}
            stroke="#dc2626"
            strokeWidth={3}
            strokeLinecap="round"
          />

          {/* Center dot */}
          <Circle
            cx={center}
            cy={center}
            r={5}
            fill={isDark ? '#1e293b' : '#334155'}
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        </Svg>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.headingText}>{Math.round(heading)}°</Text>
        <Text style={styles.directionText}>{getCardinalDirection(heading)}</Text>
      </View>
    </View>
  );
}