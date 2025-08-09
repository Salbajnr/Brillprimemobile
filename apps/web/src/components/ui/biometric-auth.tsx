import { useState, useEffect } from "react";
import { Fingerprint, Eye, Shield, AlertCircle } from "lucide-react";
import { Button } from "./button";
import { NotificationModal } from "./notification-modal";

interface BiometricAuthProps {
  onSuccess: (type: 'fingerprint' | 'face') => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

interface BiometricCapabilities {
  fingerprint: boolean;
  faceId: boolean;
  supported: boolean;
}

export function BiometricAuth({ onSuccess, onError, onCancel }: BiometricAuthProps) {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities>({
    fingerprint: false,
    faceId: false,
    supported: false
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'fingerprint' | 'face' | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

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
      setCapabilities({ fingerprint: false, faceId: false, supported: false });
    }
  };

  const startBiometricAuth = async (type: 'fingerprint' | 'face') => {
    setIsScanning(true);
    setScanType(type);

    try {
      // Create credential request options
      const options: PublicKeyCredentialCreationOptions = {
        challenge: new Uint8Array(32),
        rp: {
          name: "Brillprime",
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode("user123"),
          name: "user@brillprime.com",
          displayName: "Brillprime User",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: "direct",
      };

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: options,
      });

      if (credential) {
        setIsScanning(false);
        onSuccess(type);
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error: any) {
      setIsScanning(false);
      setScanType(null);
      
      let errorMessage = "Biometric authentication failed";
      if (error.name === "NotAllowedError") {
        errorMessage = "Biometric authentication was cancelled or not allowed";
      } else if (error.name === "AbortError") {
        errorMessage = "Authentication timeout";
      } else if (error.name === "NotSupportedError") {
        errorMessage = "This device does not support biometric authentication";
      }
      
      onError(errorMessage);
    }
  };

  const authenticateExisting = async (type: 'fingerprint' | 'face') => {
    setIsScanning(true);
    setScanType(type);

    try {
      const options: PublicKeyCredentialRequestOptions = {
        challenge: new Uint8Array(32),
        timeout: 60000,
        userVerification: "required",
        rpId: window.location.hostname,
      };

      const assertion = await navigator.credentials.get({
        publicKey: options,
      });

      if (assertion) {
        setIsScanning(false);
        onSuccess(type);
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error: any) {
      setIsScanning(false);
      setScanType(null);
      
      let errorMessage = "Biometric authentication failed";
      if (error.name === "NotAllowedError") {
        errorMessage = "Authentication cancelled";
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
          Your device or browser doesn't support biometric authentication.
        </p>
        <Button 
          onClick={onCancel}
          className="bg-[var(--brill-primary)] hover:bg-[var(--brill-secondary)]"
        >
          Continue without Biometrics
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center p-6">
      <Shield className="w-16 h-16 mx-auto text-[var(--brill-primary)] mb-4" />
      <h3 className="text-xl font-bold text-[var(--brill-text)] mb-2">
        Secure Your Account
      </h3>
      <p className="text-[var(--brill-text-light)] mb-8">
        Enable biometric authentication for faster and more secure access to your account.
      </p>

      <div className="space-y-4">
        {capabilities.fingerprint && (
          <Button
            onClick={() => startBiometricAuth('fingerprint')}
            disabled={isScanning}
            className="w-full flex items-center justify-center space-x-3 py-4 bg-white border-2 border-[var(--brill-primary)] text-[var(--brill-primary)] hover:bg-[var(--brill-primary)] hover:text-white rounded-xl transition duration-200"
          >
            {isScanning && scanType === 'fingerprint' ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                <span>Scanning fingerprint...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                <span>Set up Fingerprint</span>
              </>
            )}
          </Button>
        )}

        {capabilities.faceId && (
          <Button
            onClick={() => startBiometricAuth('face')}
            disabled={isScanning}
            className="w-full flex items-center justify-center space-x-3 py-4 bg-white border-2 border-[var(--brill-secondary)] text-[var(--brill-secondary)] hover:bg-[var(--brill-secondary)] hover:text-white rounded-xl transition duration-200"
          >
            {isScanning && scanType === 'face' ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                <span>Scanning face...</span>
              </>
            ) : (
              <>
                <Eye className="w-5 h-5" />
                <span>Set up Face ID</span>
              </>
            )}
          </Button>
        )}

        <Button
          onClick={onCancel}
          variant="outline"
          className="w-full py-3 rounded-xl border-gray-300 text-[var(--brill-text-light)] hover:bg-gray-50"
        >
          Skip for now
        </Button>
      </div>

      <div className="mt-6 text-xs text-[var(--brill-text-light)]">
        <p>Your biometric data is stored securely on your device and never shared.</p>
      </div>
    </div>
  );
}