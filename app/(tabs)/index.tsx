import TextRecognizer from '@react-native-ml-kit/text-recognition';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Image, Platform, StyleSheet, Text, View } from 'react-native';

import testImage from '@/assets/images/label.png';

export default function OCRScreen() {
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          setError('Camera roll permission is required');
          return;
        }
        console.log('OCR component initialized successfully');
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize: ' + (err.message || 'Unknown error'));
      }
    })();
  }, []);

  const processDefaultImage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const asset = Asset.fromModule(testImage);
      await asset.downloadAsync();
      if (asset.localUri) {
        await processImage(asset.localUri);
      } else {
        setError('Failed to load default image URI.');
      }
    } catch (error) {
      console.error('Error processing default image:', error);
      setError('Failed to process default image: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const selectedImageUri = pickerResult.assets[0].uri;
        setImageUri(selectedImageUri);
        await processImage(selectedImageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setError('Failed to pick image');
    } finally {
      setIsLoading(false);
    }
  };

  const processImage = async (uri: string) => {
    try {
      console.log('Processing image from URI:', uri);
      setImageUri(uri);

      let processableUri = uri;

      if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
        console.log('Converting URI to file:// format');

        if (uri.startsWith('data:')) {
          const fileUri = `${FileSystem.cacheDirectory}temp_ocr_image_${Date.now()}.jpg`;
          const base64Data = uri.split(',')[1];
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          processableUri = fileUri;
        } else if (uri.startsWith('http')) {
          const fileUri = `${FileSystem.cacheDirectory}temp_ocr_image_${Date.now()}.jpg`;
          const downloadResult = await FileSystem.downloadAsync(uri, fileUri);
          processableUri = downloadResult.uri;
        } else {
          const fileUri = `${FileSystem.cacheDirectory}temp_ocr_image_${Date.now()}.jpg`;
          try {
            await FileSystem.copyAsync({
              from: uri,
              to: fileUri,
            });
            processableUri = fileUri;
          } catch (copyError) {
            console.error('Error copying file:', copyError);
            setError('Failed to process image: Could not create a local file.');
            setIsLoading(false);
            return;
          }
        }
      }

      console.log('Final processable URI:', processableUri);

      const result = await TextRecognizer.recognize(processableUri);
      console.log('OCR Result:', result);

      if (result && result.text) {
        setRecognizedText(result.text);
      } else {
        setRecognizedText('No text detected');
      }
    } catch (error) {
      console.error('Error in OCR processing:', error);
      setError('OCR processing failed: ' + (error.message || 'Unknown error'));
      setRecognizedText('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image Text Recognition</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Choose Image from Gallery"
          onPress={pickImage}
          disabled={isLoading}
        />

        <Button
          title="Process Default Image"
          onPress={processDefaultImage}
          disabled={isLoading}
        />
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Processing image...</Text>
        </View>
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
        />
      )}

      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Recognized Text:</Text>
        <Text style={styles.resultText}>{recognizedText || 'No text recognized'}</Text>
      </View>

      <Text style={styles.debugText}>
        {Platform.OS === 'ios' ? 'Running on iOS' : 'Running on Android'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    gap: 10,
  },
  loadingContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginVertical: 10,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#ffeeee',
    borderRadius: 5,
    width: '100%',
  },
  image: {
    width: 300,
    height: 300,
    marginVertical: 20,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  resultContainer: {
    width: '100%',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 16,
    lineHeight: 24,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
  },
});