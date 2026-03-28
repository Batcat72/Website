import { useRef, useEffect, useState } from 'react';
import { useCamera } from '@hooks/useCamera';
import { motion } from 'framer-motion';
import { FaCamera, FaVideo, FaVideoSlash } from 'react-icons/fa';

interface FaceCameraProps {
  onCapture?: (frame: string) => void;
  onStreamChange?: (stream: MediaStream | null) => void;
  className?: string;
  showControls?: boolean;
  autoCapture?: boolean;
  captureInterval?: number; // milliseconds
}

const FaceCamera = ({
  onCapture,
  onStreamChange,
  className = '',
  showControls = true,
  autoCapture = false,
  captureInterval = 200,
}: FaceCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const {
    stream,
    error,
    isStreaming,
    startCamera,
    stopCamera,
    captureFrame,
  } = useCamera();

  const [isAutoCapturing, setIsAutoCapturing] = useState(autoCapture);

  // Setup video stream
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      if (onStreamChange) {
        onStreamChange(stream);
      }
    }
  }, [stream, onStreamChange]);

  // Auto capture frames
  useEffect(() => {
    if (isAutoCapturing && isStreaming && onCapture) {
      intervalRef.current = setInterval(async () => {
        const frame = await captureFrame();
        if (frame) {
          onCapture(frame);
        }
      }, captureInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoCapturing, isStreaming, onCapture, captureInterval, captureFrame]);

  // Toggle auto capture
  const toggleAutoCapture = () => {
    setIsAutoCapturing(!isAutoCapturing);
  };

  // Manual capture
  const handleManualCapture = async () => {
    const frame = await captureFrame();
    if (frame && onCapture) {
      onCapture(frame);
    }
  };

  // Toggle camera
  const toggleCamera = async () => {
    if (isStreaming) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Video Preview */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror effect
        />
        
        {/* Camera overlay */}
        <div className="absolute inset-0 border-4 border-white rounded-lg pointer-events-none" />
        
        {/* Face detection indicator */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-blue-500 rounded-full w-64 h-64 opacity-70" />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="mt-3 flex justify-center space-x-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleCamera}
            className={`flex items-center px-4 py-2 rounded-md ${
              isStreaming
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isStreaming ? <FaVideoSlash className="mr-2" /> : <FaVideo className="mr-2" />}
            {isStreaming ? 'Stop Camera' : 'Start Camera'}
          </motion.button>

          {isStreaming && (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleManualCapture}
                className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
              >
                <FaCamera className="mr-2" />
                Capture Frame
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={toggleAutoCapture}
                className={`flex items-center px-4 py-2 rounded-md ${
                  isAutoCapturing
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                }`}
              >
                {isAutoCapturing ? 'Stop Auto Capture' : 'Start Auto Capture'}
              </motion.button>
            </>
          )}
        </div>
      )}

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default FaceCamera;