
import React, { useRef, useEffect, useState } from 'react';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let mediaStream: MediaStream;
    const startCamera = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please grant permission and try again.");
      }
    };

    startCamera();

    return () => {
      // Cleanup: stop all tracks of the media stream
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        // Flip the image horizontally for a mirror effect
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(dataUrl);
      }
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl text-center">
      <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-white">Take a Selfie</h2>
      <div className="relative w-full aspect-square bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden mb-4">
        {error ? (
          <div className="flex items-center justify-center h-full text-red-500">{error}</div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover transform scaleX-[-1]"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="flex space-x-4">
        <button onClick={onCancel} className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-bold py-3 px-4 rounded-lg transition">
          Cancel
        </button>
        <button
          onClick={handleCapture}
          disabled={!!error}
          className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          Capture Photo
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;
