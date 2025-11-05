
import React, { useState, useCallback, useEffect } from 'react';
import { AppStep, AttendanceRecord } from './types';
import { getAddressFromCoordinates } from './services/geminiService';
import { saveAttendance } from './services/googleSheetsService';
import CameraCapture from './components/CameraCapture';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.IDLE);
  const [email, setEmail] = useState<string>('');
  const [currentRecord, setCurrentRecord] = useState<Partial<AttendanceRecord>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);

  const resetState = useCallback(() => {
    setStep(AppStep.IDLE);
    setCurrentRecord({});
    setIsLoading(false);
    setError(null);
    setLoadingMessage('');
  }, []);
  
  const handleError = (message: string) => {
    setError(message);
    setIsLoading(false);
    setTimeout(() => {
        resetState();
    }, 4000);
  };

  const handleStartAttendance = useCallback(async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setIsLoading(true);

    // 1. Capture Timestamp
    setLoadingMessage('Capturing timestamp...');
    const timestamp = new Date();

    // 2. Capture Location
    setLoadingMessage('Getting your location...');
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      
      const { latitude, longitude } = position.coords;

      // 3. Get Address from Gemini
      setLoadingMessage('Fetching address details...');
      const address = await getAddressFromCoordinates(latitude, longitude);

      setCurrentRecord({
        id: `att_${Date.now()}`,
        email,
        timestamp: timestamp.toISOString(),
        latitude,
        longitude,
        address,
      });

      setStep(AppStep.CAPTURING_PHOTO);
      setIsLoading(false);

    } catch (err) {
      console.error(err);
      if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) {
           handleError('Location access was denied. Please enable it in your browser settings.');
        } else {
           handleError('Could not get your location. Please ensure location services are on.');
        }
      } else {
        handleError('An error occurred while fetching your location or address.');
      }
    }
  }, [email]);

  const handlePhotoCaptured = (photoDataUrl: string) => {
    setCurrentRecord(prev => ({ ...prev, photoDataUrl }));
    setStep(AppStep.CONFIRMING);
  };

  const handleConfirm = async () => {
    if (!currentRecord.email || !currentRecord.timestamp || !currentRecord.photoDataUrl || !currentRecord.latitude || !currentRecord.longitude || !currentRecord.address) {
      handleError('Incomplete attendance data. Please try again.');
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Saving your attendance...');

    try {
      const finalRecord = currentRecord as AttendanceRecord;
      const success = await saveAttendance(finalRecord);
      if (success) {
        setAttendanceHistory(prev => [finalRecord, ...prev]);
        resetState();
      } else {
        handleError('Failed to save attendance. Please check your connection.');
      }
    } catch (err) {
      console.error(err);
      handleError('An error occurred while saving.');
    }
  };
  
  const Clock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
      const timerId = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(timerId);
    }, []);

    return (
        <div className="text-center font-mono text-lg text-slate-500 dark:text-slate-400">
            <p>{time.toLocaleDateString()}</p>
            <p>{time.toLocaleTimeString()}</p>
        </div>
    );
  };


  const renderIdleStep = () => (
    <div className="w-full max-w-md mx-auto p-6 md:p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Attendance Tracker</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Enter your email to get started.</p>
      </div>
      
      <Clock />

      {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg text-center">{error}</p>}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
            disabled={isLoading}
          />
        </div>
        <button
          onClick={handleStartAttendance}
          disabled={isLoading || !email}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-slate-400 disabled:dark:bg-slate-600 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{loadingMessage || 'Processing...'}</span>
            </>
          ) : (
            <span>Mark My Attendance</span>
          )}
        </button>
      </div>

      {attendanceHistory.length > 0 && (
          <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">Recent Entries</h2>
              <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {attendanceHistory.map(rec => (
                      <li key={rec.id} className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                          <img src={rec.photoDataUrl} alt="attendance" className="w-10 h-10 rounded-full object-cover" />
                          <div className="flex-1 text-sm">
                              <p className="font-semibold text-slate-800 dark:text-slate-100">{rec.email}</p>
                              <p className="text-slate-500 dark:text-slate-400">{new Date(rec.timestamp).toLocaleString()}</p>
                          </div>
                      </li>
                  ))}
              </ul>
          </div>
      )}
    </div>
  );

  const renderConfirmStep = () => (
    <div className="w-full max-w-md mx-auto p-6 md:p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl space-y-4">
        <h1 className="text-2xl font-bold text-center text-slate-800 dark:text-white">Confirm Your Details</h1>
        <img src={currentRecord.photoDataUrl} alt="Your selfie" className="rounded-lg shadow-md mx-auto w-full h-auto" />
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
            <p><strong>Email:</strong> {currentRecord.email}</p>
            <p><strong>Time:</strong> {currentRecord.timestamp ? new Date(currentRecord.timestamp).toLocaleString() : 'N/A'}</p>
            <p><strong>Location:</strong> {currentRecord.address || 'N/A'}</p>
        </div>
        {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg text-center">{error}</p>}
        <div className="flex space-x-4">
            <button onClick={() => setStep(AppStep.CAPTURING_PHOTO)} disabled={isLoading} className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg transition">Retake</button>
            <button onClick={handleConfirm} disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center">
                 {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm & Save</span>
                  )}
            </button>
        </div>
    </div>
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-900">
      {step === AppStep.IDLE && renderIdleStep()}
      {step === AppStep.CAPTURING_PHOTO && <CameraCapture onCapture={handlePhotoCaptured} onCancel={resetState} />}
      {step === AppStep.CONFIRMING && renderConfirmStep()}
    </main>
  );
};

export default App;
