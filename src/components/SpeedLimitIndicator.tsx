import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { SpeedLimitService, SpeedLimitData } from '../services/speedLimitService';
import { LocationData, LocationService } from '../services/locationService';

interface SpeedLimitIndicatorProps {
  location: LocationData | null;
  style?: any;
}

export default function SpeedLimitIndicator({ location, style }: SpeedLimitIndicatorProps) {
  const [speedLimitData, setSpeedLimitData] = useState<SpeedLimitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [isOverSpeeding, setIsOverSpeeding] = useState(false);
  const { theme, isDark } = useTheme();
  
  const speedLimitService = SpeedLimitService.getInstance();
  const warningAnimation = new Animated.Value(1);

  useEffect(() => {
    if (location) {
      setCurrentSpeed(LocationService.convertSpeedToKmh(location.speed));
      fetchSpeedLimit(location);
    }
  }, [location]);

  useEffect(() => {
    // Check for speed warnings
    if (speedLimitData?.speedLimit && currentSpeed) {
      const isSpeeding = speedLimitService.isSpeedingAlert(currentSpeed, speedLimitData.speedLimit);
      setIsOverSpeeding(isSpeeding);
      
      if (isSpeeding) {
        startWarningAnimation();
      }
    } else {
      setIsOverSpeeding(false);
    }
  }, [currentSpeed, speedLimitData]);

  const fetchSpeedLimit = async (locationData: LocationData) => {
    try {
      setIsLoading(true);
      const data = await speedLimitService.getSpeedLimit(locationData);
      setSpeedLimitData(data);
    } catch (error) {
      console.error('Failed to fetch speed limit:', error);
      // Try to use last known speed limit
      const lastKnown = speedLimitService.getLastKnownSpeedLimit();
      setSpeedLimitData(lastKnown);
    } finally {
      setIsLoading(false);
    }
  };

  const startWarningAnimation = () => {
    Animated.sequence([
      Animated.timing(warningAnimation, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(warningAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (isOverSpeeding) {
        startWarningAnimation(); // Continue animation while speeding
      }
    });
  };

  const getAccuracyColor = (accuracy: string): string => {
    switch (accuracy) {
      case 'high': return '#10b981'; // green
      case 'medium': return '#f59e0b'; // amber
      case 'low': return '#f97316'; // orange
      default: return '#6b7280'; // gray
    }
  };

  const getSpeedLimitColor = (): string => {
    if (isOverSpeeding) return '#ef4444'; // red
    if (speedLimitData?.accuracy === 'low') return '#f59e0b'; // amber
    return theme.colors.text;
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: isOverSpeeding 
        ? (isDark ? '#7f1d1d' : '#fef2f2')
        : 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: isOverSpeeding ? 8 : 0,
      borderWidth: isOverSpeeding ? 2 : 0,
      borderColor: isOverSpeeding ? '#ef4444' : 'transparent',
    },
    title: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    leftSection: {
      alignItems: 'center',
      flex: 0,
      minWidth: 80,
    },
    speedLimitSign: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#ffffff',
      borderWidth: 2.5,
      borderColor: '#dc2626',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    speedLimitText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#dc2626',
    },
    speedLimitUnit: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    middleSection: {
      alignItems: 'center',
      flex: 1,
      paddingHorizontal: 16,
    },
    currentSpeedLabel: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      marginBottom: 2,
      fontWeight: '500',
    },
    currentSpeedText: {
      fontSize: 18,
      fontWeight: '600',
      color: getSpeedLimitColor(),
    },
    rightSection: {
      alignItems: 'flex-end',
      flex: 0,
      minWidth: 80,
    },
    roadInfo: {
      alignItems: 'center',
      marginBottom: 6,
    },
    roadName: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      textAlign: 'right',
      marginBottom: 2,
    },
    accuracyIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginBottom: 2,
    },
    accuracyDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 4,
    },
    accuracyText: {
      fontSize: 9,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    sourceText: {
      fontSize: 8,
      color: theme.colors.textSecondary,
      fontWeight: '400',
      textAlign: 'right',
    },
    warningText: {
      fontSize: 9,
      color: '#ef4444',
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 2,
    },
    loadingText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    noDataText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });

  if (isLoading && !speedLimitData) {
    return (
      <View style={[dynamicStyles.container, style]}>
        <Text style={dynamicStyles.title}>SPEED LIMIT</Text>
        <Text style={dynamicStyles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!speedLimitData) {
    return (
      <View style={[dynamicStyles.container, style]}>
        <Text style={dynamicStyles.title}>SPEED LIMIT</Text>
        <Text style={dynamicStyles.noDataText}>
          No speed limit data{'\n'}available for this area
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        dynamicStyles.container,
        style,
        { opacity: warningAnimation }
      ]}
    >
      {/* Left Side - Speed Limit Sign */}
      <View style={dynamicStyles.leftSection}>
        <View style={dynamicStyles.speedLimitSign}>
          <Text style={dynamicStyles.speedLimitText}>
            {speedLimitData.speedLimit || '--'}
          </Text>
        </View>
        <Text style={dynamicStyles.speedLimitUnit}>km/h</Text>
      </View>

      {/* Middle Section - Current Speed */}
      <View style={dynamicStyles.middleSection}>
        <Text style={dynamicStyles.currentSpeedLabel}>YOUR SPEED</Text>
        <Text style={dynamicStyles.currentSpeedText}>
          {currentSpeed !== null ? `${Math.round(currentSpeed)} km/h` : 'N/A'}
        </Text>
        {isOverSpeeding && (
          <Text style={dynamicStyles.warningText}>⚠️ OVER LIMIT</Text>
        )}
      </View>

      {/* Right Section - Road Info */}
      <View style={dynamicStyles.rightSection}>
        {speedLimitData.road && speedLimitData.road !== 'Unknown Road' && (
          <Text style={dynamicStyles.roadName} numberOfLines={1}>
            {speedLimitData.road}
          </Text>
        )}
        <View style={dynamicStyles.accuracyIndicator}>
          <View 
            style={[
              dynamicStyles.accuracyDot,
              { backgroundColor: getAccuracyColor(speedLimitData.accuracy) }
            ]} 
          />
          <Text style={dynamicStyles.accuracyText}>
            {speedLimitData.accuracy.toUpperCase()}
          </Text>
        </View>
        {speedLimitData.source && (
          <Text style={dynamicStyles.sourceText}>
            {speedLimitData.source === 'here' ? 'HERE' : 
             speedLimitData.source === 'osm' ? 'OSM' : 'Default'}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
