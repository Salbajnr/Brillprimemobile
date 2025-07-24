import { useState, useEffect } from "react";
import { Fingerprint, Eye, Shield, AlertCircle } from "lucide-react";
import { Button } from "./button";
import { NotificationModal } from "./notification-modal";

interface BiometricLoginProps {
  onSuccess: (type: 'fingerprint' | 'face') => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

interface BiometricCapabilities {
  fingerprint: boolean;
  faceId: boolean;
  supported: boolean;
}

export function BiometricLogin({ onSuccess, onError, onCancel }: BiometricLoginProps) {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities>({
    fingerprint: false,
    faceId: false,
    supported: false
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'fingerprint' | 'face' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);

  useEffect(() => {
    checkBiometricCapabilities();
    checkStoredCredentials();
  }, []);

  const checkStoredCredentials = () => {
    const credentialId = localStorage.getItem('biometric_credential_id');
    const biometricType = localStorage.getItem('biometric_type');
    setHasStoredCredentials(!!(credentialId && biometricType));
  };

  const checkBiometricCapabilities = async () => {
    try {
      // Check if Web Authentication API is supported
      if (!window.PublicKeyCredential) {
        setCapabilities({ fingerprint: false, faceId: false, supported: false });
        return;
      }

      // Check for biometric capabilities
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      // Check for platform-specific biometric features
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const isWindows = /windows/.test(userAgent);
      const isMacOS = /macintosh|mac os/.test(userAgent);

      setCapabilities({
        fingerprint: available && (isAndroid || isWindows || isMacOS),
        faceId: available && (isIOS || isWindows),
        supported: available
      });
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      setCapabilities({ fingerprint: false, faceId: false, supported: false });
    }
  };

  const authenticateWithBiometric = async (type: 'fingerprint' | 'face') => {
    setIsScanning(true);
    setScanType(type);

    try {
      // Get stored credential ID
      const storedCredentialId = localStorage.getItem('biometric_credential_id');
      const storedType = localStorage.getItem('biometric_type');
      
      if (!storedCredentialId || storedType !== type) {
        throw new Error('No biometric credentials found for this authentication type');
      }
      
      // Convert credential ID back to Uint8Array
      const credentialIdBytes = new Uint8Array(
        storedCredentialId.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
      
      // Generate a random challenge
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      
      const options: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
        allowCredentials: [{
          id: credentialIdBytes,
          type: "public-key",
          transports: ["internal"]
        }]
      };

      const assertion = await navigator.credentials.get({
        publicKey: options,
      });

      if (assertion) {
        setIsScanning(false);
        onSuccess(type);
      }
    } catch (error) {
      setIsScanning(false);
      console.error('Biometric authentication error:', error);
      
      // Provide more specific error messages
      let errorMessage = `${type === 'fingerprint' ? 'Fingerprint' : 'Face ID'} authentication failed`;
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Biometric authentication was cancelled or not allowed';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Biometric authentication is not supported on this device';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Security error during biometric authentication';
        } else if (error.message.includes('No biometric credentials')) {
          errorMessage = 'Please set up biometric authentication first';
        }
      }
      
      onError(errorMessage);
    }
  };

  if (!capabilities.supported) {
    return (
      <div className="text-center p-6">
        <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-bold text-[var(--brill-text)] mb-2">
          Biometric Authentication Not Available
        </h3>
        <p className="text-[var(--brill-text-light)] mb-4">
          Your device doesn't support biometric authentication or it's not enabled.
        </p>
        <Button
          onClick={onCancel}
          variant="outline"
          className="w-full"
        >
          Continue with Password
        </Button>
      </div>
    );
  }

  if (!hasStoredCredentials) {
    return (
      <div className="text-center p-6">
        <Shield className="w-16 h-16 mx-auto text-[var(--brill-secondary)] mb-4" />
        <h3 className="text-lg font-bold text-[var(--brill-text)] mb-2">
          Biometric Authentication Not Set Up
        </h3>
        <p className="text-[var(--brill-text-light)] mb-4">
          Please set up biometric authentication in your profile settings first.
        </p>
        <Button
          onClick={onCancel}
          variant="outline"
          className="w-full"
        >
          Continue with Password
        </Button>
      </div>
    );
  }

  const storedType = localStorage.getItem('biometric_type') as 'fingerprint' | 'face';

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <Shield className="w-16 h-16 mx-auto text-[var(--brill-secondary)] mb-4" />
        <h3 className="text-lg font-bold text-[var(--brill-text)] mb-2">
          Biometric Authentication
        </h3>
        <p className="text-[var(--brill-text-light)]">
          Use your {storedType === 'fingerprint' ? 'fingerprint' : 'face'} to sign in securely
        </p>
      </div>

      <div className="space-y-4">
        {storedType === 'fingerprint' && capabilities.fingerprint && (
          <Button
            onClick={() => authenticateWithBiometric('fingerprint')}
            disabled={isScanning}
            className="w-full flex items-center justify-center space-x-3 py-4 bg-[var(--brill-secondary)] text-white hover:bg-[var(--brill-secondary)]/90 rounded-xl transition duration-200"
          >
            {isScanning && scanType === 'fingerprint' ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                <span>Scanning fingerprint...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                <span>Use Fingerprint</span>
              </>
            )}
          </Button>
        )}

        {storedType === 'face' && capabilities.faceId && (
          <Button
            onClick={() => authenticateWithBiometric('face')}
            disabled={isScanning}
            className="w-full flex items-center justify-center space-x-3 py-4 bg-[var(--brill-secondary)] text-white hover:bg-[var(--brill-secondary)]/90 rounded-xl transition duration-200"
          >
            {isScanning && scanType === 'face' ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                <span>Scanning face...</span>
              </>
            ) : (
              <>
                <Eye className="w-5 h-5" />
                <span>Use Face ID</span>
              </>
            )}
          </Button>
        )}

        <Button
          onClick={onCancel}
          variant="outline"
          className="w-full py-3 border-[var(--brill-secondary)] text-[var(--brill-secondary)] hover:bg-[var(--brill-secondary)] hover:text-white rounded-xl transition duration-200"
        >
          Use Password Instead
        </Button>
      </div>

      <NotificationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Biometric Authentication"
        message="Authentication successful!"
        type="success"
      />
    </div>
  );
}

// Global type declarations
declare global {
  interface Window {
    PublicKeyCredential?: any;
  }
}