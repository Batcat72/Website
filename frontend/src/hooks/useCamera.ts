import { useState, useEffect } from 'react';

interface CameraHook {
  stream: MediaStream | null;
  error: string | null;
  isStreaming: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => Promise<string | null>;
  getVideoDevices: () => Promise<MediaDeviceInfo[]>;
  switchCamera: (deviceId: string) => Promise<void>;
}

export const useCamera = (): CameraHook => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Start camera
  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setIsStreaming(true);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);
    }
  };

  // Capture frame as base64
  const captureFrame = async (): Promise<string | null> => {
    if (!stream) return null;

    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    // Wait for video to be ready
    await new Promise(resolve => {
      video.addEventListener('loadeddata', resolve);
    });

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    video.remove();
    
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  // Get available video devices
  const getVideoDevices = async (): Promise<MediaDeviceInfo[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (err) {
      console.error('Error enumerating devices:', err);
      return [];
    }
  };

  // Switch camera
  const switchCamera = async (deviceId: string) => {
    stopCamera();
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      setIsStreaming(true);
    } catch (err) {
      console.error('Camera switch error:', err);
      setError('Failed to switch camera.');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return {
    stream,
    error,
    isStreaming,
    startCamera,
    stopCamera,
    captureFrame,
    getVideoDevices,
    switchCamera,
  };
};