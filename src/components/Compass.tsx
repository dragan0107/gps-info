import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import Svg, { Circle, Line, Text as SvgText, G, Polygon } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

interface CompassProps {
  style?: ViewStyle;
}

export default function Compass({ style }: CompassProps) {
  const [heading, setHeading] = useState(0);
  const [displayHeading, setDisplayHeading] = useState(0);
  const smoothedHeading = useRef(0);
  const { theme, isDark } = useTheme();

  useEffect(() => {
    let subscription: any;

    const subscribe = async () => {
      Magnetometer.setUpdateInterval(100);
      
      subscription = Magnetometer.addListener((data) => {
        let compassHeading = Math.atan2(-data.x, data.y) * (180 / Math.PI);
        
        if (compassHeading < 0) {
          compassHeading += 360;
        }

        const alpha = 0.15;
        let diff = compassHeading - smoothedHeading.current;
        if (diff > 180) {
          diff -= 360;
        } else if (diff < -180) {
          diff += 360;
        }
        
        smoothedHeading.current += diff * alpha;
        
        if (smoothedHeading.current < 0) {
          smoothedHeading.current += 360;
        } else if (smoothedHeading.current >= 360) {
          smoothedHeading.current -= 360;
        }

        setHeading(smoothedHeading.current);
        setDisplayHeading(smoothedHeading.current);
      });
    };

    subscribe();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const compassSize = 200;
  const center = compassSize / 2;
  const radius = center - 20;

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

  const compassRotation = `rotate(${-heading} ${center} ${center})`;

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
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={isDark ? "#64748b" : "#6B7280"}
            strokeWidth="3"
          />
          
          <Circle
            cx={center}
            cy={center}
            r={radius - 40}
            fill="none"
            stroke={isDark ? "#475569" : "#E5E7EB"}
            strokeWidth="1"
          />

          <G transform={compassRotation}>
            {generateTicks()}
            {generateLabels()}
          </G>

          <G>
            <Polygon
              points={`${center},${center - radius + 50} ${center - 6},${center - 5} ${center + 6},${center - 5}`}
              fill="#EF4444"
              stroke="#DC2626"
              strokeWidth="2"
            />
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

          <G>
            <Polygon
              points={`${center},${center + radius - 50} ${center - 6},${center + 5} ${center + 6},${center + 5}`}
              fill="#FFFFFF"
              stroke="#374151"
              strokeWidth="2"
            />
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

          <Circle
            cx={center}
            cy={center}
            r="8"
            fill="#2D3748"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          
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

function getCardinalDirection(heading: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(heading / 22.5) % 16;
  return directions[index];
}