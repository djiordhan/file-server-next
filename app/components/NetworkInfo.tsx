'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface NetworkInfoProps {
  className?: string;
}

export function NetworkInfo({ className = '' }: NetworkInfoProps) {
  const [localIP, setLocalIP] = useState<string>('');
  const [port, setPort] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getNetworkInfo = async () => {
      try {
        // Get the current port from the window location
        const currentPort = window.location.port || '3000';
        setPort(currentPort);

        // Try to get local IP address
        try {
          // Use a public STUN server to get local IP
          const response = await fetch('https://api.ipify.org?format=json');
          const data = await response.json();
          
          // For local network, we'll use the hostname and let the user know
          // they can access via their computer's local IP
          setLocalIP('Your computer\'s local IP');
        } catch (error) {
          setLocalIP('Your computer\'s local IP');
        }

        // Generate QR code for local network access
        const localUrl = `http://${window.location.hostname}:${currentPort}`;
        const qrCodeDataUrl = await QRCode.toDataURL(localUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#1e293b', // slate-800
            light: '#f8fafc'  // slate-50
          }
        });
        setQrCodeDataUrl(qrCodeDataUrl);
      } catch (error) {
        console.error('Error generating network info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getNetworkInfo();
  }, []);

  const getLocalIPInstructions = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'To access from other devices on your network, use your computer\'s local IP address instead of localhost.';
      }
      return `This app is accessible at: ${hostname}:${port}`;
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50 ${className}`}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
        {/* Network Information */}
        <div className="flex-1 space-y-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            🌐 Local Network Access
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-slate-600 dark:text-slate-300">Current URL:</span>
              <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
              </code>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="font-medium text-slate-600 dark:text-slate-300">Port:</span>
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded font-mono">
                {port}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="font-medium text-slate-600 dark:text-slate-300">Network Access:</span>
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                {localIP}
              </span>
            </div>
          </div>
          
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 How to access from other devices:</p>
            <p>{getLocalIPInstructions()}</p>
            <p className="mt-2">
              <strong>Windows:</strong> Open Command Prompt and type <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">ipconfig</code><br/>
              <strong>Mac/Linux:</strong> Open Terminal and type <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">ifconfig</code> or <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">ip addr</code>
            </p>
            <p className="mt-2">
              Look for your local IP address (usually starts with 192.168.x.x or 10.0.x.x) and use that instead of localhost.
            </p>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center space-y-3">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300">
            📱 Scan to access
          </h4>
          {qrCodeDataUrl && (
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code for local network access" 
                className="w-32 h-32"
              />
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-32">
            Scan with your phone's camera to open the app
          </p>
        </div>
      </div>
    </div>
  );
}
