import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import Svg, { Circle, Path, Line, Text as SvgText, G, Defs, LinearGradient, Stop, RadialGradient, Polygon } from 'react-native-svg';

interface SpeedometerProps {
  speed: number | null; // Speed in km/h
  altitude: number | null; // Altitude in meters
  accuracy: number | null; // GPS accuracy in meters
  heading: number | null; // Compass heading in degrees
  maxSpeed?: number;
  style?: ViewStyle;
}

export default function Speedometer({ speed, altitude, accuracy, heading, maxSpeed = 250, style }: SpeedometerProps) {
  const [animatedSpeed] = useState(new Animated.Value(0));
  const [displaySpeed, setDisplaySpeed] = useState(0);

  useEffect(() => {
    const currentSpeed = speed || 0;
    
    // Animate speed change
    Animated.timing(animatedSpeed, {
      toValue: currentSpeed,
      duration: 600,
      useNativeDriver: false,
    }).start();

    // Update display speed for text
    const listener = animatedSpeed.addListener(({ value }) => {
      setDisplaySpeed(Math.round(value));
    });

    return () => {
      animatedSpeed.removeListener(listener);
    };
  }, [speed]);

  const size = 320;
  const center = size / 2;
  const outerRadius = center - 20;
  const innerRadius = outerRadius - 40;
  
  // Calculate angle for speed (240 degrees range, like real car speedometer)
  const currentSpeed = speed || 0;
  const startAngle = 150; // Start from bottom left
  const endAngle = 30;   // End at bottom right
  const totalAngle = 240; // Total sweep
  const speedAngle = Math.min((currentSpeed / maxSpeed) * totalAngle, totalAngle);
  const needleAngle = startAngle + speedAngle;

  // Generate speed tick marks and numbers
  const generateSpeedometer = () => {
    const elements = [];
    const majorTickCount = 10; // 0, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250 (25 km/h increments)
    const minorTicksPerMajor = 4; // 4 minor ticks between each major
    
    // Background circles for depth
    elements.push(
      <Circle
        key="outer-ring"
        cx={center}
        cy={center}
        r={outerRadius}
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="3"
      />
    );
    
    elements.push(
      <Circle
        key="inner-ring"
        cx={center}
        cy={center}
        r={innerRadius}
        fill="none"
        stroke="#333"
        strokeWidth="2"
      />
    );

    // Generate ticks and numbers
    for (let i = 0; i <= majorTickCount; i++) {
      const tickSpeed = (i * maxSpeed) / majorTickCount;
      const angle = startAngle + (i * totalAngle) / majorTickCount;
      const radians = (angle * Math.PI) / 180;
      
      // Major tick
      const majorTickStart = outerRadius - 5;
      const majorTickEnd = outerRadius - 25;
      const x1 = center + Math.cos(radians) * majorTickStart;
      const y1 = center + Math.sin(radians) * majorTickStart;
      const x2 = center + Math.cos(radians) * majorTickEnd;
      const y2 = center + Math.sin(radians) * majorTickEnd;

      elements.push(
        <Line
          key={`major-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
        />
      );

      // Speed numbers
      const numberRadius = outerRadius - 35;
      const numberX = center + Math.cos(radians) * numberRadius;
      const numberY = center + Math.sin(radians) * numberRadius;
      
      elements.push(
        <SvgText
          key={`number-${i}`}
          x={numberX}
          y={numberY + 6}
          fontSize="16"
          fontWeight="bold"
          fill="#ffffff"
          textAnchor="middle"
        >
          {Math.round(tickSpeed)}
        </SvgText>
      );

      // Minor ticks between major ticks
      if (i < majorTickCount) {
        for (let j = 1; j <= minorTicksPerMajor; j++) {
          const minorAngle = angle + (j * (totalAngle / majorTickCount) / (minorTicksPerMajor + 1));
          const minorRadians = (minorAngle * Math.PI) / 180;
          
          const minorTickStart = outerRadius - 5;
          const minorTickEnd = outerRadius - 15;
          const mx1 = center + Math.cos(minorRadians) * minorTickStart;
          const my1 = center + Math.sin(minorRadians) * minorTickStart;
          const mx2 = center + Math.cos(minorRadians) * minorTickEnd;
          const my2 = center + Math.sin(minorRadians) * minorTickEnd;

          elements.push(
            <Line
              key={`minor-${i}-${j}`}
              x1={mx1}
              y1={my1}
              x2={mx2}
              y2={my2}
              stroke="#cccccc"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          );
        }
      }
    }

    return elements;
  };

  // Generate colored zones (like real car speedometer)
  const generateColorZones = () => {
    const zones = [];
    const zoneWidth = 8;
    
    // Green zone (0-120)
    const greenStart = startAngle;
    const greenEnd = startAngle + (120 / maxSpeed) * totalAngle;
    const greenStartRad = (greenStart * Math.PI) / 180;
    const greenEndRad = (greenEnd * Math.PI) / 180;
    
    zones.push(
      <Path
        key="green-zone"
        d={`M ${center + Math.cos(greenStartRad) * (outerRadius - 30)} ${center + Math.sin(greenStartRad) * (outerRadius - 30)}
            A ${outerRadius - 30} ${outerRadius - 30} 0 0 1 ${center + Math.cos(greenEndRad) * (outerRadius - 30)} ${center + Math.sin(greenEndRad) * (outerRadius - 30)}
            L ${center + Math.cos(greenEndRad) * (outerRadius - 38)} ${center + Math.sin(greenEndRad) * (outerRadius - 38)}
            A ${outerRadius - 38} ${outerRadius - 38} 0 0 0 ${center + Math.cos(greenStartRad) * (outerRadius - 38)} ${center + Math.sin(greenStartRad) * (outerRadius - 38)} Z`}
        fill="#10B981"
      />
    );

    // Yellow zone (120-180)
    const yellowStart = greenEnd;
    const yellowEnd = startAngle + (180 / maxSpeed) * totalAngle;
    const yellowStartRad = (yellowStart * Math.PI) / 180;
    const yellowEndRad = (yellowEnd * Math.PI) / 180;
    
    zones.push(
      <Path
        key="yellow-zone"
        d={`M ${center + Math.cos(yellowStartRad) * (outerRadius - 30)} ${center + Math.sin(yellowStartRad) * (outerRadius - 30)}
            A ${outerRadius - 30} ${outerRadius - 30} 0 0 1 ${center + Math.cos(yellowEndRad) * (outerRadius - 30)} ${center + Math.sin(yellowEndRad) * (outerRadius - 30)}
            L ${center + Math.cos(yellowEndRad) * (outerRadius - 38)} ${center + Math.sin(yellowEndRad) * (outerRadius - 38)}
            A ${outerRadius - 38} ${outerRadius - 38} 0 0 0 ${center + Math.cos(yellowStartRad) * (outerRadius - 38)} ${center + Math.sin(yellowStartRad) * (outerRadius - 38)} Z`}
        fill="#F59E0B"
      />
    );

    // Red zone (180+)
    const redStart = yellowEnd;
    const redEnd = startAngle + totalAngle;
    const redStartRad = (redStart * Math.PI) / 180;
    const redEndRad = (redEnd * Math.PI) / 180;
    
    zones.push(
      <Path
        key="red-zone"
        d={`M ${center + Math.cos(redStartRad) * (outerRadius - 30)} ${center + Math.sin(redStartRad) * (outerRadius - 30)}
            A ${outerRadius - 30} ${outerRadius - 30} 0 0 1 ${center + Math.cos(redEndRad) * (outerRadius - 30)} ${center + Math.sin(redEndRad) * (outerRadius - 30)}
            L ${center + Math.cos(redEndRad) * (outerRadius - 38)} ${center + Math.sin(redEndRad) * (outerRadius - 38)}
            A ${outerRadius - 38} ${outerRadius - 38} 0 0 0 ${center + Math.cos(redStartRad) * (outerRadius - 38)} ${center + Math.sin(redStartRad) * (outerRadius - 38)} Z`}
        fill="#EF4444"
      />
    );

    return zones;
  };

  // Calculate needle position
  const needleRadians = (needleAngle * Math.PI) / 180;
  const needleLength = innerRadius + 20;
  const needleEndX = center + Math.cos(needleRadians) * needleLength;
  const needleEndY = center + Math.sin(needleRadians) * needleLength;

  // Convert heading to cardinal direction
  const getCardinalDirection = (heading: number | null): string => {
    if (heading === null) return '---';
    const directions = [
      'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
    ];
    const index = Math.round(heading / 22.5) % 16;
    return directions[index];
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.speedometerContainer}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="gaugeGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#2a2a2a" />
              <Stop offset="70%" stopColor="#1a1a1a" />
              <Stop offset="100%" stopColor="#000000" />
            </RadialGradient>
            <RadialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#4a4a4a" />
              <Stop offset="100%" stopColor="#2a2a2a" />
            </RadialGradient>
          </Defs>

          {/* Main gauge background */}
          <Circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="url(#gaugeGradient)"
            stroke="#444"
            strokeWidth="2"
          />

          {/* Color zones */}
          {generateColorZones()}

          {/* Tick marks and numbers */}
          {generateSpeedometer()}

          {/* Speed needle */}
          <G>
            {/* Needle shadow */}
            <Polygon
              points={`${center},${center} ${needleEndX + 2},${needleEndY + 2} ${center + 2},${center + 10}`}
              fill="rgba(0,0,0,0.3)"
            />
            
            {/* Main needle */}
            <Polygon
              points={`${center},${center - 8} ${needleEndX},${needleEndY} ${center},${center + 8} ${center - 15},${center}`}
              fill="#ff0000"
              stroke="#cc0000"
              strokeWidth="1"
            />
            
            {/* Needle center cap */}
            <Circle
              cx={center}
              cy={center}
              r="12"
              fill="url(#centerGradient)"
              stroke="#666"
              strokeWidth="2"
            />
            
            {/* Center dot */}
            <Circle
              cx={center}
              cy={center}
              r="4"
              fill="#ff0000"
            />
          </G>

          {/* Brand/Unit text */}
          <SvgText
            x={center}
            y={center + 35}
            fontSize="16"
            fontWeight="bold"
            fill="#ffffff"
            textAnchor="middle"
            stroke="#000000"
            strokeWidth="0.5"
          >
            km/h
          </SvgText>
        </Svg>

        {/* Digital speed display */}
        <View style={styles.digitalDisplay}>
          <Text style={styles.digitalSpeed}>
            {displaySpeed}
          </Text>
        </View>

        {/* Altitude Display - Top Left */}
        <View style={styles.altitudeDisplay}>
          <Text style={styles.altitudeLabel}>ALT</Text>
          <Text style={styles.altitudeValue}>
            {altitude !== null ? `${Math.round(altitude)}m` : '---'}
          </Text>
        </View>

        {/* GPS Accuracy Display - Top Right */}
        <View style={styles.accuracyDisplay}>
          <Text style={styles.accuracyLabel}>GPS</Text>
          <Text style={styles.accuracyValue}>
            {accuracy !== null ? `±${Math.round(accuracy)}m` : '---'}
          </Text>
          {/* GPS Signal Bars */}
          <View style={styles.signalBars}>
            {[1, 2, 3].map((bar) => (
              <View
                key={bar}
                style={[
                  styles.signalBar,
                  {
                    height: bar * 3 + 4,
                    backgroundColor: accuracy !== null && accuracy <= 20 ? 
                      (bar <= (accuracy <= 5 ? 3 : accuracy <= 10 ? 2 : 1) ? '#10B981' : '#333') : '#333',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Compass Direction - Bottom Left */}
        <View style={styles.compassDisplay}>
          <Text style={styles.compassLabel}>DIR</Text>
          <Text style={styles.compassDirection}>
            {getCardinalDirection(heading)}
          </Text>
          <Text style={styles.compassDegrees}>
            {heading !== null ? `${Math.round(heading)}°` : '---°'}
          </Text>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  speedometerContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    padding: 15,
    marginBottom: 25,
    position: 'relative',
    borderWidth: 3,
    borderColor: '#333',
    alignItems: 'center', // Center child elements horizontally
  },
  digitalDisplay: {
    position: 'absolute',
    bottom: 70,
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  digitalSpeed: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ff00',
    fontFamily: 'monospace',
    textAlign: 'center',
    textShadowColor: '#00ff00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  altitudeDisplay: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#444',
    minWidth: 60,
  },
  altitudeLabel: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    fontWeight: '600',
  },
  altitudeValue: {
    fontSize: 14,
    color: '#00aaff',
    fontFamily: 'monospace',
    textAlign: 'center',
    fontWeight: 'bold',
    textShadowColor: '#00aaff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  accuracyDisplay: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#444',
    minWidth: 60,
    alignItems: 'center',
  },
  accuracyLabel: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    fontWeight: '600',
  },
  accuracyValue: {
    fontSize: 12,
    color: '#ffaa00',
    fontFamily: 'monospace',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 2,
    gap: 1,
  },
  signalBar: {
    width: 3,
    backgroundColor: '#333',
    borderRadius: 0.5,
  },
  elevationChart: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    marginLeft: -30, // Half of width (60/2 = 30)
    alignItems: 'center',
    width: 60,
  },
  elevationBar: {
    width: 8,
    height: 30,
    backgroundColor: '#222',
    borderRadius: 4,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: '#444',
  },
  elevationFill: {
    width: '100%',
    borderRadius: 3,
    minHeight: 2,
  },
  elevationText: {
    fontSize: 8,
    color: '#888',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  compassDisplay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#444',
    minWidth: 60,
    alignItems: 'center',
  },
  compassLabel: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
    fontWeight: '600',
  },
  compassDirection: {
    fontSize: 16,
    color: '#ff6b00',
    fontFamily: 'monospace',
    textAlign: 'center',
    fontWeight: 'bold',
    textShadowColor: '#ff6b00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  compassDegrees: {
    fontSize: 10,
    color: '#ff6b00',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 1,
  },
});
