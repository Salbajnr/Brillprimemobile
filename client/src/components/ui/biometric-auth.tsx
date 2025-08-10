import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Fingerprint, Scan, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface BiometricAuthProps {
  onSuccess: (type: 'fingerprint' | 'face') => void;
  onError: (error: string) => void;
  onCancel?: () => void;
  mode?: 'setup' | 'authenticate';
  title?: string;
  description?: string;
}

interface BiometricCapabilities {
  available: boolean;
  types: ('fingerprint' | 'face')[];
  errorMessage?: string;
}

export function BiometricAuth({
  onSuccess,
  onError,
  onCancel,
  mode = 'setup',
  title,
  description
}: BiometricAuthProps) {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities>({
    available: false,
    types: []
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [selectedType, setSelectedType] = useState<'fingerprint' | 'face' | null>(null);

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    try {
      // Check WebAuthn support
      if (!window.PublicKeyCredential) {
        setCapabilities({
          available: false,
          types: [],
          errorMessage: 'Biometric authentication not supported on this device'
        });
        return;
      }

      // Check platform authenticator availability
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

      if (!available) {
        setCapabilities({
          available: false,
          types: [],
          errorMessage: 'No biometric authenticator available'
        });
        return;
      }

      // Detect available biometric types
      const types: ('fingerprint' | 'face')[] = [];

      // This is a simplified detection - in real implementation, you'd check device capabilities
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        types.push('face'); // Face ID
        if (navigator.userAgent.includes('iPhone')) {
          types.push('fingerprint'); // Touch ID on older devices
        }
      } else if (navigator.userAgent.includes('Android')) {
        types.push('fingerprint');
        // Some Android devices support face unlock
        types.push('face');
      } else {
        // Desktop/laptop - likely fingerprint or Windows Hello
        types.push('fingerprint');
      }

      setCapabilities({
        available: true,
        types
      });

    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      setCapabilities({
        available: false,
        types: [],
        errorMessage: 'Error checking biometric support'
      });
    }
  };

  const handleBiometricAuth = async (type: 'fingerprint' | 'face') => {
    setIsAuthenticating(true);
    setSelectedType(type);

    try {
      const challenge = await generateChallenge();

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge,
        allowCredentials: mode === 'authenticate' ? await getStoredCredentials() : [],
        userVerification: 'required',
        timeout: 60000
      };

      if (mode === 'setup') {
        await createCredential(type, challenge);
      } else {
        await authenticateWithCredential(publicKeyCredentialRequestOptions);
      }

      onSuccess(type);
    } catch (error: any) {
      console.error('Biometric authentication error:', error);

      let errorMessage = 'Biometric authentication failed';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric authentication was cancelled or not allowed';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error during biometric authentication';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Biometric authentication was aborted';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Biometric authentication not supported';
      }

      onError(errorMessage);
    } finally {
      setIsAuthenticating(false);
      setSelectedType(null);
    }
  };

  const createCredential = async (type: 'fingerprint' | 'face', challenge: ArrayBuffer) => {
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: "BrillPrime",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode("user-id"), // Should be actual user ID
        name: "user@example.com", // Should be actual user email
        displayName: "User Name", // Should be actual user name
      },
      pubKeyCredParams: [
        {
          alg: -7, // ES256
          type: "public-key"
        }
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        requireResidentKey: true
      },
      timeout: 60000,
      attestation: "direct"
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    }) as PublicKeyCredential;

    // Store credential information
    await storeCredential(credential, type);
  };

  const authenticateWithCredential = async (options: PublicKeyCredentialRequestOptions) => {
    const credential = await navigator.credentials.get({
      publicKey: options
    }) as PublicKeyCredential;

    // Verify credential with server
    await verifyCredential(credential);
  };

  const generateChallenge = async (): Promise<ArrayBuffer> => {
    const response = await fetch('/api/auth/biometric/challenge', {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to generate challenge');
    }

    const { challenge } = await response.json();
    return new Uint8Array(challenge).buffer;
  };

  const getStoredCredentials = async (): Promise<PublicKeyCredentialDescriptor[]> => {
    const response = await fetch('/api/auth/biometric/credentials', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to get stored credentials');
    }

    const { credentials } = await response.json();
    return credentials;
  };

  const storeCredential = async (credential: PublicKeyCredential, type: 'fingerprint' | 'face') => {
    const response = await fetch('/api/auth/biometric/store', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        credentialId: Array.from(new Uint8Array(credential.rawId)),
        publicKey: Array.from(new Uint8Array((credential.response as AuthenticatorAttestationResponse).publicKey!)),
        type: type
      })
    });

    if (!response.ok) {
      throw new Error('Failed to store credential');
    }
  };

  const verifyCredential = async (credential: PublicKeyCredential) => {
    const response = await fetch('/api/auth/biometric/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        credentialId: Array.from(new Uint8Array(credential.rawId)),
        authenticatorData: Array.from(new Uint8Array((credential.response as AuthenticatorAssertionResponse).authenticatorData)),
        signature: Array.from(new Uint8Array((credential.response as AuthenticatorAssertionResponse).signature)),
        clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON))
      })
    });

    if (!response.ok) {
      throw new Error('Failed to verify credential');
    }
  };

  if (!capabilities.available) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Biometric Authentication Unavailable</h3>
          <p className="text-gray-600 mb-4">
            {capabilities.errorMessage || 'Your device does not support biometric authentication'}
          </p>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Continue without Biometrics
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">
            {title || (mode === 'setup' ? 'Setup Biometric Authentication' : 'Biometric Authentication')}
          </h2>
          <p className="text-gray-600">
            {description || 'Choose your preferred biometric authentication method for secure access to your account'}
          </p>
        </div>

        <div className="space-y-4">
          {capabilities.types.map((type) => (
            <Button
              key={type}
              variant="outline"
              size="lg"
              className="w-full h-16 flex items-center justify-start space-x-4 p-4 hover:bg-blue-50 border-2 hover:border-blue-300"
              onClick={() => handleBiometricAuth(type)}
              disabled={isAuthenticating}
            >
              <div className="flex items-center space-x-4">
                {type === 'fingerprint' ? (
                  <Fingerprint className="w-8 h-8 text-blue-600" />
                ) : (
                  <Scan className="w-8 h-8 text-blue-600" />
                )}
                <div className="text-left">
                  <div className="font-semibold">
                    {type === 'fingerprint' ? 'Fingerprint' : 'Face Recognition'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {type === 'fingerprint' 
                      ? 'Use your fingerprint to authenticate' 
                      : 'Use your face to authenticate'}
                  </div>
                </div>
              </div>
              {isAuthenticating && selectedType === type && (
                <div className="ml-auto">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              )}
            </Button>
          ))}
        </div>

        {mode === 'setup' && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Security Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your biometric data stays on your device</li>
                  <li>End-to-end encrypted authentication</li>
                  <li>Can be disabled anytime in settings</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {onCancel && (
          <div className="mt-6 text-center">
            <Button variant="ghost" onClick={onCancel}>
              {mode === 'setup' ? 'Skip for Now' : 'Use Password Instead'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}