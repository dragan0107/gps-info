import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const LiveStreamScreen: React.FC = () => {
  const { theme } = useTheme();
  const webViewRef1 = useRef<WebView>(null);
  const webViewRef2 = useRef<WebView>(null);
  const [isLoading1, setIsLoading1] = useState(true);
  const [isLoading2, setIsLoading2] = useState(true);
  const [error1, setError1] = useState<string | null>(null);
  const [error2, setError2] = useState<string | null>(null);
  const [fullscreenStream, setFullscreenStream] = useState<number | null>(null);

  const videoUrl1 = 'https://kamere.mup.gov.rs:4443/Presevo/presevo1.m3u8';
  const videoUrl2 = 'https://kamere.mup.gov.rs:4443/Presevo/presevo2.m3u8';

  const handleLoadStart1 = () => {
    setIsLoading1(true);
    setError1(null);
  };

  const handleLoadEnd1 = () => {
    setIsLoading1(false);
    setError1(null);
  };

  const handleError1 = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.log('WebView 1 error:', nativeEvent);
    setError1('Failed to load stream');
    setIsLoading1(false);
  };

  const handleLoadStart2 = () => {
    setIsLoading2(true);
    setError2(null);
  };

  const handleLoadEnd2 = () => {
    setIsLoading2(false);
    setError2(null);
  };

  const handleError2 = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.log('WebView 2 error:', nativeEvent);
    setError2('Failed to load stream');
    setIsLoading2(false);
  };

  const retryStream1 = () => {
    setIsLoading1(true);
    setError1(null);
    if (webViewRef1.current) {
      webViewRef1.current.reload();
    }
  };

  const retryStream2 = () => {
    setIsLoading2(true);
    setError2(null);
    if (webViewRef2.current) {
      webViewRef2.current.reload();
    }
  };

  const openFullscreen = (streamNumber: number) => {
    setFullscreenStream(streamNumber);
  };

  const closeFullscreen = () => {
    setFullscreenStream(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Live Stream
        </Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: '#ff4444' }]} />
          <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
            LIVE
          </Text>
        </View>
      </View>

                                                       <View style={styles.videoContainer}>
                                   {/* Stream 1 */}
                  <View style={styles.streamContainer}>
                    <Text style={[styles.streamTitle, { color: theme.colors.text }]}>
                      Preševo ulaz
                    </Text>
                   {isLoading1 && (
                     <View style={styles.loadingContainer}>
                       <ActivityIndicator size="large" color={theme.colors.primary} />
                       <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                         Loading stream...
                       </Text>
                     </View>
                   )}

                   {error1 && (
                     <View style={styles.errorContainer}>
                       <Ionicons name="warning-outline" size={48} color={theme.colors.error} />
                       <Text style={[styles.errorText, { color: theme.colors.text }]}>
                         Stream unavailable
                       </Text>
                       <TouchableOpacity
                         style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                         onPress={retryStream1}
                       >
                         <Text style={[styles.retryButtonText, { color: theme.colors.surface }]}>
                           Retry
                         </Text>
                       </TouchableOpacity>
                     </View>
                   )}

                                       <WebView
                      ref={webViewRef1}
                      style={styles.video}
                      source={{
                        html: `
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                              body { margin: 0; padding: 0; background: #000; }
                              video { 
                                width: 100%; 
                                height: 100%; 
                                object-fit: contain;
                                background: #000;
                              }
                            </style>
                          </head>
                          <body>
                            <video 
                              autoplay 
                              muted 
                              controls 
                              playsinline
                              webkit-playsinline
                              x5-playsinline
                              x5-video-player-type="h5"
                              x5-video-player-fullscreen="true"
                            >
                              <source src="${videoUrl1}" type="application/x-mpegURL">
                              Your browser does not support the video tag.
                            </video>
                          </body>
                          </html>
                        `
                      }}
                      onLoadStart={handleLoadStart1}
                      onLoadEnd={handleLoadEnd1}
                      onError={handleError1}
                      allowsInlineMediaPlayback={true}
                      mediaPlaybackRequiresUserAction={false}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                      startInLoadingState={true}
                      scalesPageToFit={true}
                      bounces={false}
                      scrollEnabled={false}
                    />
                    <TouchableOpacity
                      style={styles.fullscreenButton}
                      onPress={() => openFullscreen(1)}
                    >
                      <Ionicons name="expand" size={24} color="#fff" />
                    </TouchableOpacity>
                 </View>

                                   {/* Stream 2 */}
                  <View style={styles.streamContainer}>
                    <Text style={[styles.streamTitle, { color: theme.colors.text }]}>
                      Preševo izlaz
                    </Text>
                   {isLoading2 && (
                     <View style={styles.loadingContainer}>
                       <ActivityIndicator size="large" color={theme.colors.primary} />
                       <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                         Loading stream...
                       </Text>
                     </View>
                   )}

                   {error2 && (
                     <View style={styles.errorContainer}>
                       <Ionicons name="warning-outline" size={48} color={theme.colors.error} />
                       <Text style={[styles.errorText, { color: theme.colors.text }]}>
                         Stream unavailable
                       </Text>
                       <TouchableOpacity
                         style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                         onPress={retryStream2}
                       >
                         <Text style={[styles.retryButtonText, { color: theme.colors.surface }]}>
                           Retry
                         </Text>
                       </TouchableOpacity>
                     </View>
                   )}

                                       <WebView
                      ref={webViewRef2}
                      style={styles.video}
                      source={{
                        html: `
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                              body { margin: 0; padding: 0; background: #000; }
                              video { 
                                width: 100%; 
                                height: 100%; 
                                object-fit: contain;
                                background: #000;
                              }
                            </style>
                          </head>
                          <body>
                            <video 
                              autoplay 
                              muted 
                              controls 
                              playsinline
                              webkit-playsinline
                              x5-playsinline
                              x5-video-player-type="h5"
                              x5-video-player-fullscreen="true"
                            >
                              <source src="${videoUrl2}" type="application/x-mpegURL">
                              Your browser does not support the video tag.
                            </video>
                          </body>
                          </html>
                        `
                      }}
                      onLoadStart={handleLoadStart2}
                      onLoadEnd={handleLoadEnd2}
                      onError={handleError2}
                      allowsInlineMediaPlayback={true}
                      mediaPlaybackRequiresUserAction={false}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                      startInLoadingState={true}
                      scalesPageToFit={true}
                      bounces={false}
                      scrollEnabled={false}
                    />
                    <TouchableOpacity
                      style={styles.fullscreenButton}
                      onPress={() => openFullscreen(2)}
                    >
                      <Ionicons name="expand" size={24} color="#fff" />
                    </TouchableOpacity>
                 </View>
               </View>

                               <View style={styles.infoContainer}>
         <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
           Presevo Traffic Camera
         </Text>
         <Text style={[styles.infoDescription, { color: theme.colors.textSecondary }]}>
           Live traffic stream from Presevo, Serbia
         </Text>
       </View>

       {/* Fullscreen Modal */}
       <Modal
         visible={fullscreenStream !== null}
         animationType="slide"
         presentationStyle="fullScreen"
       >
         <View style={styles.fullscreenContainer}>
           <View style={styles.fullscreenHeader}>
             <Text style={[styles.fullscreenTitle, { color: theme.colors.text }]}>
               {fullscreenStream === 1 ? 'Preševo ulaz' : 'Preševo izlaz'}
             </Text>
             <TouchableOpacity
               style={styles.closeButton}
               onPress={closeFullscreen}
             >
               <Ionicons name="close" size={24} color={theme.colors.text} />
             </TouchableOpacity>
           </View>
           
           <WebView
             style={styles.fullscreenVideo}
             source={{
               html: `
                 <!DOCTYPE html>
                 <html>
                 <head>
                   <meta name="viewport" content="width=device-width, initial-scale=1.0">
                   <style>
                     body { margin: 0; padding: 0; background: #000; }
                     video { 
                       width: 100%; 
                       height: 100vh; 
                       object-fit: contain;
                       background: #000;
                     }
                   </style>
                 </head>
                 <body>
                   <video 
                     autoplay 
                     muted 
                     controls 
                     playsinline
                     webkit-playsinline
                     x5-playsinline
                     x5-video-player-type="h5"
                     x5-video-player-fullscreen="true"
                   >
                     <source src="${fullscreenStream === 1 ? videoUrl1 : videoUrl2}" type="application/x-mpegURL">
                     Your browser does not support the video tag.
                   </video>
                 </body>
                 </html>
               `
             }}
             allowsInlineMediaPlayback={true}
             mediaPlaybackRequiresUserAction={false}
             javaScriptEnabled={true}
             domStorageEnabled={true}
             startInLoadingState={true}
             scalesPageToFit={true}
             bounces={false}
             scrollEnabled={false}
           />
         </View>
       </Modal>
     </View>
   );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
     videoContainer: {
     flex: 1,
     marginHorizontal: 20,
     gap: 20,
   },
   streamContainer: {
     flex: 1,
     borderRadius: 12,
     overflow: 'hidden',
     backgroundColor: '#000',
     position: 'relative',
   },
   streamTitle: {
     fontSize: 16,
     fontWeight: '600',
     padding: 12,
     textAlign: 'center',
   },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1,
  },
     errorText: {
     marginTop: 12,
     fontSize: 18,
     fontWeight: '600',
     marginBottom: 8,
   },
   errorSubtext: {
     fontSize: 14,
     textAlign: 'center',
     marginBottom: 20,
     paddingHorizontal: 20,
   },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
     infoDescription: {
     fontSize: 14,
     lineHeight: 20,
   },
   fullscreenButton: {
     position: 'absolute',
     top: 12,
     right: 12,
     backgroundColor: 'rgba(0, 0, 0, 0.7)',
     borderRadius: 20,
     padding: 8,
     zIndex: 2,
   },
   fullscreenContainer: {
     flex: 1,
     backgroundColor: '#000',
   },
   fullscreenHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     paddingHorizontal: 20,
     paddingTop: 50,
     paddingBottom: 20,
     backgroundColor: 'rgba(0, 0, 0, 0.9)',
   },
   fullscreenTitle: {
     fontSize: 20,
     fontWeight: 'bold',
   },
   closeButton: {
     padding: 8,
   },
   fullscreenVideo: {
     flex: 1,
   },
});

export default LiveStreamScreen;
