import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import Svg, { Circle, Line, Text as SvgText, G, Polygon } from 'react-native-svg';

interface CompassProps {
  style?: ViewStyle;
}

export default function Compass({ style }: CompassProps) {
  const [heading, setHeading] = useState(0);
  const [magnetometerData, setMagnetometerData] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    let subscription: any;

    const subscribe = async () => {
      // Set update interval to 100ms for smooth rotation
      Magnetometer.setUpdateInterval(100);
      
      subscription = Magnetometer.addListener((data) => {
        setMagnetometerData(data);
        
        // Calculate heading from magnetometer data
        // atan2 gives us the angle from magnetic field vector
        let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
        
        // Convert to compass heading where 0° = North
        // Magnetometer Y points to magnetic north when device is flat
        let compassHeading = Math.atan2(-data.x, data.y) * (180 / Math.PI);
        
        // Ensure positive angle (0-360°)
        if (compassHeading < 0) {
          compassHeading += 360;
        }
        
        setHeading(compassHeading);
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
          stroke="#4B5563"
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
          fill="#1F2937"
          textAnchor="middle"
        >
          {text}
        </SvgText>
      );
    });
  };

  // Create compass needle - rotate opposite to heading so needle points to north
  const needleRotation = `rotate(${-heading} ${center} ${center})`;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.compassContainer}>
        <Svg width={compassSize} height={compassSize}>
          {/* Outer circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#6B7280"
            strokeWidth="3"
          />
          
          {/* Inner circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius - 40}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />

          {/* Tick marks */}
          {generateTicks()}

          {/* Cardinal direction labels */}
          {generateLabels()}

          {/* Compass needle */}
          <G transform={needleRotation}>
            {/* North pointer (red) */}
            <Polygon
              points={`${center},${center - radius + 50} ${center - 8},${center + 10} ${center + 8},${center + 10}`}
              fill="#EF4444"
              stroke="#DC2626"
              strokeWidth="1"
            />
            {/* South pointer (white with black border) */}
            <Polygon
              points={`${center},${center + radius - 50} ${center - 8},${center - 10} ${center + 8},${center - 10}`}
              fill="#FFFFFF"
              stroke="#374151"
              strokeWidth="2"
            />
          </G>

          {/* Center dot */}
          <Circle
            cx={center}
            cy={center}
            r="4"
            fill="#374151"
          />
        </Svg>
      </View>
      
      <View style={styles.headingContainer}>
        <Text style={styles.headingText}>
          {Math.round(heading)}°
        </Text>
        <Text style={styles.directionText}>
          {getCardinalDirection(heading)}
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
