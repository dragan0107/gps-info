import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import Svg, { Circle, Line, Text as SvgText, G, Polygon } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

interface CompassProps {
  style?: ViewStyle;
}

export default function Compass({ style }: CompassProps) {
  const [heading, setHeading] = useState(0);
  const [magnetometerData, setMagnetometerData] = useState({ x: 0, y: 0, z: 0 });
  const animatedHeading = useRef(new Animated.Value(0)).current;
  const [displayHeading, setDisplayHeading] = useState(0);
  const [rotationValue, setRotationValue] = useState(0); // Raw rotation value for seamless transforms
  const { theme, isDark } = useTheme();
  
  // Smoothing variables
  const headingHistory = useRef<number[]>([]);
  const lastValidHeading = useRef(0);

  useEffect(() => {
    let subscription: any;

    const subscribe = async () => {
      // Set update interval to 150ms for balanced responsiveness and stability
      Magnetometer.setUpdateInterval(150);
      
      subscription = Magnetometer.addListener((data) => {
        setMagnetometerData(data);
        
        // Calculate heading from magnetometer data
        let compassHeading = Math.atan2(-data.x, data.y) * (180 / Math.PI);
        
        // Ensure positive angle (0-360°)
        if (compassHeading < 0) {
          compassHeading += 360;
        }
        
        // Removed logging for cleaner console
        
        // Apply light smoothing to reduce jitter
        const smoothedHeading = applySmoothingFilter(compassHeading);
        
        // Animate to the smoothed heading
        animateToHeading(smoothedHeading);
        setHeading(smoothedHeading);
      });
    };

    subscribe();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Simple smoothing filter to reduce jitter without complex logic
  const applySmoothingFilter = (newHeading: number): number => {
    // Simple moving average with just the last 3 readings
    headingHistory.current.push(newHeading);
    if (headingHistory.current.length > 3) {
      headingHistory.current.shift(); // Keep only last 3 readings
    }

    // If we don't have enough history, return the new heading
    if (headingHistory.current.length < 2) {
      lastValidHeading.current = newHeading;
      return newHeading;
    }

    // Simple average of recent readings
    let sum = 0;
    for (let i = 0; i < headingHistory.current.length; i++) {
      sum += headingHistory.current[i];
    }
    
    const smoothedHeading = sum / headingHistory.current.length;
    lastValidHeading.current = smoothedHeading;
    return smoothedHeading;
  };

  // Animate heading changes smoothly with seamless 360°/0° transitions
  const animateToHeading = (newHeading: number) => {
    const currentValue = displayHeading;
    
    // Find the shortest rotation path
    let diff = newHeading - currentValue;
    
    // Normalize the difference to -180 to +180 range for shortest path
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    
    // Instead of normalizing target, let the animated value continue past 360°
    // This prevents jerky movements at 360°/0° boundary
    const targetValue = currentValue + diff;

    // Removed animation logging for cleaner console

    Animated.timing(animatedHeading, {
      toValue: targetValue,
      duration: 200, // Balanced speed - not too fast, not too slow
      useNativeDriver: false,
    }).start();

    // Update display heading with continuous tracking
    const listener = animatedHeading.addListener(({ value }) => {
      // Keep the raw rotation value for seamless compass transforms
      setRotationValue(value);
      
      // Only normalize for heading display purposes
      let normalizedValue = value % 360;
      if (normalizedValue < 0) normalizedValue += 360;
      setDisplayHeading(normalizedValue);
    });

    // Clean up listener after animation
    setTimeout(() => {
      animatedHeading.removeListener(listener);
    }, 250);
  };

  const compassSize = 200;
  const center = compassSize / 2;
  const radius = center - 20;

  // Generate tick marks for degrees
  const generateTicks = () => {
    const ticks = [];
    for (let i = 0; i < 360; i += 10) {
      const angle = (i * Math.PI) / 180;
      const isMajor = i % 30 === 0;
      const tickLength = isMajor ? 15 : 8;
      const innerRadius = radius - tickLength;
      
      const x1 = center + Math.cos(angle - Math.PI / 2) * radius;
      const y1 = center + Math.sin(angle - Math.PI / 2) * radius;
      const x2 = center + Math.cos(angle - Math.PI / 2) * innerRadius;
      const y2 = center + Math.sin(angle - Math.PI / 2) * innerRadius;

      ticks.push(
        <Line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isDark ? "#94a3b8" : "#4B5563"}
          strokeWidth={isMajor ? 2 : 1}
        />
      );
    }
    return ticks;
  };

  // Generate cardinal direction labels
  const generateLabels = () => {
    const labels = [
      { text: 'N', angle: 0 },
      { text: 'E', angle: 90 },
      { text: 'S', angle: 180 },
      { text: 'W', angle: 270 },
    ];

    return labels.map(({ text, angle }) => {
      const rad = (angle * Math.PI) / 180;
      const labelRadius = radius - 35;
      const x = center + Math.cos(rad - Math.PI / 2) * labelRadius;
      const y = center + Math.sin(rad - Math.PI / 2) * labelRadius;

      return (
        <SvgText
          key={text}
          x={x}
          y={y + 6}
          fontSize="18"
          fontWeight="bold"
          fill={isDark ? "#f1f5f9" : "#1F2937"}
          textAnchor="middle"
        >
          {text}
        </SvgText>
      );
    });
  };

  // Rotate the entire compass face so North always points up
  const compassRotation = `rotate(${-rotationValue} ${center} ${center})`;

  const dynamicStyles = StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    compassContainer: {
      backgroundColor: theme.colors.compassBackground,
      borderRadius: 16,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 4,
      padding: 16,
      marginBottom: 16,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.colors.border,
    },
    headingContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 4,
      elevation: 2,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.colors.border,
    },
    headingText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
    },
    directionText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <View style={[dynamicStyles.container, style]}>
      <View style={dynamicStyles.compassContainer}>
        <Svg width={compassSize} height={compassSize}>
          {/* Outer circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={isDark ? "#64748b" : "#6B7280"}
            strokeWidth="3"
          />
          
          {/* Inner circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius - 40}
            fill="none"
            stroke={isDark ? "#475569" : "#E5E7EB"}
            strokeWidth="1"
          />

          {/* Rotating compass face (ticks and labels) */}
          <G transform={compassRotation}>
            {/* Tick marks */}
            {generateTicks()}

            {/* Cardinal direction labels */}
            {generateLabels()}
          </G>

          {/* Fixed North indicator needle (always points up) */}
          <G>
            {/* North pointer (red arrow) - separate from center */}
            <Polygon
              points={`${center},${center - radius + 50} ${center - 6},${center - 5} ${center + 6},${center - 5}`}
              fill="#EF4444"
              stroke="#DC2626"
              strokeWidth="2"
            />
            {/* North pointer stem */}
            <Line
              x1={center}
              y1={center - 5}
              x2={center}
              y2={center - radius + 50}
              stroke="#DC2626"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </G>

          {/* South indicator (separate from North) */}
          <G>
            {/* South pointer (white arrow) - separate from center */}
            <Polygon
              points={`${center},${center + radius - 50} ${center - 6},${center + 5} ${center + 6},${center + 5}`}
              fill="#FFFFFF"
              stroke="#374151"
              strokeWidth="2"
            />
            {/* South pointer stem */}
            <Line
              x1={center}
              y1={center + 5}
              x2={center}
              y2={center + radius - 50}
              stroke="#374151"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </G>

          {/* Center hub */}
          <Circle
            cx={center}
            cy={center}
            r="8"
            fill="#2D3748"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          
          {/* Center dot */}
          <Circle
            cx={center}
            cy={center}
            r="3"
            fill="#FFFFFF"
          />
        </Svg>
      </View>
      
      <View style={dynamicStyles.headingContainer}>
        <Text style={dynamicStyles.headingText}>
          {Math.round(displayHeading)}°
        </Text>
        <Text style={dynamicStyles.directionText}>
          {getCardinalDirection(displayHeading)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  compassContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    padding: 16,
    marginBottom: 16,
  },
  headingContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  directionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

function getCardinalDirection(heading: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(heading / 22.5) % 16;
  return directions[index];
}
