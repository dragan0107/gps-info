# GPS Info - Expo React Native App

A comprehensive GPS tracking application with compass functionality, real-time location data, and background tracking capabilities.

## Features

- **Detailed Compass**: SVG-based compass with magnetic north pointer, cardinal directions, and degree markings
- **Real-time GPS Data**: Live coordinates, altitude, speed (km/h), and location reverse geocoding
- **Background Tracking**: Continues GPS tracking when app is in background *(requires development build)*
- **Android Persistent Notification**: Shows current altitude in notification bar *(requires development build)*
- **Modern UI**: Clean design with React Native StyleSheet

⚠️ **Note**: Background location and notifications are **not supported in Expo Go** for SDK 53+. These features require a development build.

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Expo CLI (if not already installed):**
   ```bash
   npm install -g @expo/cli
   ```

## Development Setup

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Run on specific platforms:**
   ```bash
   # Android
   npm run android

   # iOS
   npm run ios

   # Web (limited functionality)
   npm run web
   ```

## Permissions

The app requires the following permissions:

### Android
- `ACCESS_FINE_LOCATION` - High accuracy GPS
- `ACCESS_COARSE_LOCATION` - Network-based location
- `ACCESS_BACKGROUND_LOCATION` - Background location tracking
- `FOREGROUND_SERVICE` - Background service for persistent notification
- `WAKE_LOCK` - Keep device awake for GPS tracking
- `POST_NOTIFICATIONS` - Display persistent notifications

### iOS
- `NSLocationAlwaysAndWhenInUseUsageDescription` - Location access
- `NSLocationWhenInUseUsageDescription` - Foreground location
- `NSLocationAlwaysUsageDescription` - Background location
- `NSMotionUsageDescription` - Magnetometer for compass

## Testing Background Location

### Android Testing

1. **Build and install the app:**
   ```bash
   expo build:android
   # OR for development build
   expo run:android
   ```

2. **Grant all permissions:**
   - Location (Allow all the time)
   - Notifications
   - Physical activity (for sensors)

3. **Test background tracking:**
   - Open the app and wait for GPS lock
   - Minimize the app (don't close it)
   - Check notification bar for "GPS Info" with altitude
   - Move around and verify notification updates

4. **Verify persistent notification:**
   - The notification should show: "Alt: XXXm"
   - Notification should update as altitude changes
   - Tapping notification should bring app to foreground

### iOS Testing

1. **Build and install:**
   ```bash
   expo run:ios
   ```

2. **Grant permissions:**
   - Location: "Allow While Using App" or "Allow Always"
   - Motion & Fitness access

3. **Background limitations:**
   - iOS has stricter background location policies
   - App may pause background updates after some time
   - Test with device connected to Xcode for debugging

## Project Structure

```
GPS Info/
├── App.tsx                          # Main app component
├── src/
│   ├── components/
│   │   └── Compass.tsx              # SVG compass component
│   └── services/
│       └── locationService.ts       # Location tracking service
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── tailwind.config.js              # Tailwind CSS configuration
└── babel.config.js                 # Babel configuration with NativeWind
```

## Key Components

### Compass Component
- Uses `expo-sensors` Magnetometer for heading detection
- SVG-based rendering with `react-native-svg`
- Real-time needle rotation based on magnetic north
- Cardinal direction labels and degree markings

### Location Service
- Singleton service for GPS tracking
- Foreground and background location updates
- Reverse geocoding for place names
- Speed conversion from m/s to km/h
- Android persistent notification management

### Background Task
- Uses `expo-task-manager` for background location updates
- Updates Android notification with current altitude
- Handles permission requests for all required access

## Expo Go vs Development Build

### ✅ **Works in Expo Go:**
- GPS coordinate tracking
- Compass functionality
- Speed and altitude display
- Reverse geocoding (place names)
- Basic UI and navigation

### ❌ **Requires Development Build:**
- Background location tracking
- Persistent Android notifications
- Full background task functionality

### **Creating a Development Build:**
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure your project
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS  
eas build --platform ios
```

Read more: [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)

## Troubleshooting

### Common Issues

1. **Location not updating:**
   - Ensure all location permissions are granted
   - Check device location services are enabled
   - Try testing outdoors for better GPS signal

2. **Compass not working:**
   - Verify device has magnetometer sensor
   - Calibrate device compass in device settings
   - Some emulators don't support magnetometer

3. **Background tracking stops:**
   - Check battery optimization settings (Android)
   - Ensure app is not being killed by system
   - Verify background app refresh is enabled (iOS)

4. **Android notification not showing:**
   - Grant notification permissions
   - Check if notification channels are enabled
   - Test on physical device (not emulator)

### Android Manifest Configuration

For bare React Native projects, add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<service android:name="expo.modules.taskmanager.TaskService" />
```

### iOS Info.plist Configuration

For bare React Native projects, add to `ios/YourApp/Info.plist`:

```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app needs location access to display GPS information and compass heading.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs location access to display GPS information and compass heading.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>This app needs location access to track GPS in the background.</string>
<key>NSMotionUsageDescription</key>
<string>This app uses motion sensors for compass functionality.</string>
```

## Production Deployment

1. **Configure app signing and build settings**
2. **Test thoroughly on physical devices**
3. **Submit to app stores with proper permission descriptions**
4. **Monitor background battery usage and optimize if needed**

## Notes

- The app prioritizes accuracy over battery life with `Location.Accuracy.Highest`
- Background updates are throttled to balance battery usage
- Persistent notification is Android-only due to platform restrictions
- Web version has limited functionality (no native sensors/GPS)
