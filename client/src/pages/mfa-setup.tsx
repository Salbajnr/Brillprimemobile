
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  Shield, 
  Smartphone, 
  Mail, 
  QrCode, 
  Key, 
  CheckCircle,
  AlertTriangle,
  Copy,
  Download
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useLocation } from 'wouter';

const COLORS = {
  PRIMARY: '#4682b4',
  SECONDARY: '#131313',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444'
};

interface MFAStatus {
  enabled: boolean;
  method?: string;
  backupCodesRemaining: number;
  sessionVerified: boolean;
}

export default function MFASetupPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'SMS' | 'EMAIL' | 'TOTP' | ''>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'setup' | 'verify' | 'complete'>('select');

  useEffect(() => {
    fetchMFAStatus();
  }, []);

  const fetchMFAStatus = async () => {
    try {
      const response = await fetch('/api/mfa/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMfaStatus(data.mfa);
        
        if (data.mfa.enabled) {
          setStep('complete');
        }
      }
    } catch (error) {
      console.error('Failed to fetch MFA status:', error);
    }
  };

  const handleMFASetup = async () => {
    if (!selectedMethod) return;
    
    setLoading(true);
    try {
      const payload: any = { method: selectedMethod };
      
      if (selectedMethod === 'SMS' && phoneNumber) {
        payload.phoneNumber = phoneNumber;
      } else if (selectedMethod === 'EMAIL' && email) {
        payload.email = email;
      }

      const response = await fetch('/api/mfa/setup', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.success) {
        if (selectedMethod === 'TOTP') {
          setQrCode(data.qrCode);
          setSecret(data.secret);
        }
        
        setBackupCodes(data.backupCodes || []);
        setStep('verify');
        
        toast({
          title: "MFA Setup Started",
          description: `${selectedMethod} MFA has been configured`,
          variant: "default"
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to setup MFA",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerification = async () => {
    if (!verificationToken) {
      toast({
        title: "Token Required",
        description: "Please enter the verification token",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/mfa/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: verificationToken,
          method: selectedMethod,
          rememberDevice: false
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setStep('complete');
        fetchMFAStatus();
        
        toast({
          title: "MFA Verified",
          description: "Multi-factor authentication is now active",
          variant: "default"
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification token",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
      variant: "default"
    });
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!mfaStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 mx-auto text-blue-600 mb-4" />
          <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.SECONDARY }}>
            Multi-Factor Authentication
          </h1>
          <p className="text-gray-600">
            Add an extra layer of security to your account
          </p>
        </div>

        {/* MFA Selection Step */}
        {step === 'select' && (
          <Card>
            <CardHeader>
              <CardTitle>Choose MFA Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* TOTP Option */}
              <div 
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  selectedMethod === 'TOTP' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedMethod('TOTP')}
              >
                <div className="flex items-center">
                  <QrCode className="h-8 w-8 text-blue-600 mr-4" />
                  <div>
                    <h3 className="font-semibold">Authenticator App</h3>
                    <p className="text-sm text-gray-600">
                      Use Google Authenticator, Authy, or similar apps
                    </p>
                    <Badge className="mt-1 bg-green-100 text-green-800">Recommended</Badge>
                  </div>
                </div>
              </div>

              {/* SMS Option */}
              <div 
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  selectedMethod === 'SMS' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedMethod('SMS')}
              >
                <div className="flex items-center">
                  <Smartphone className="h-8 w-8 text-blue-600 mr-4" />
                  <div>
                    <h3 className="font-semibold">SMS Text Message</h3>
                    <p className="text-sm text-gray-600">
                      Receive codes via text message
                    </p>
                  </div>
                </div>
                {selectedMethod === 'SMS' && (
                  <div className="mt-4">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+234xxxxxxxxxx"
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* Email Option */}
              <div 
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  selectedMethod === 'EMAIL' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedMethod('EMAIL')}
              >
                <div className="flex items-center">
                  <Mail className="h-8 w-8 text-blue-600 mr-4" />
                  <div>
                    <h3 className="font-semibold">Email Verification</h3>
                    <p className="text-sm text-gray-600">
                      Receive codes via email
                    </p>
                  </div>
                </div>
                {selectedMethod === 'EMAIL' && (
                  <div className="mt-4">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={handleMFASetup}
                disabled={loading || !selectedMethod}
                className="w-full rounded-xl"
                style={{ backgroundColor: COLORS.PRIMARY }}
              >
                {loading ? "Setting up..." : "Continue Setup"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Setup Step (TOTP QR Code) */}
        {step === 'setup' && selectedMethod === 'TOTP' && qrCode && (
          <Card>
            <CardHeader>
              <CardTitle>Scan QR Code</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-white p-4 rounded-xl inline-block">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
              
              <div className="text-left space-y-2">
                <p className="text-sm font-medium">Manual Setup Key:</p>
                <div className="flex items-center space-x-2 bg-gray-100 p-3 rounded-lg">
                  <code className="flex-1 text-sm">{secret}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(secret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <p>1. Open your authenticator app</p>
                <p>2. Scan the QR code or enter the manual key</p>
                <p>3. Enter the 6-digit code from your app below</p>
              </div>

              <Button
                onClick={() => setStep('verify')}
                className="w-full rounded-xl"
                style={{ backgroundColor: COLORS.PRIMARY }}
              >
                I've Added the Account
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Verification Step */}
        {step === 'verify' && (
          <Card>
            <CardHeader>
              <CardTitle>Verify Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Key className="h-16 w-16 mx-auto text-blue-600 mb-4" />
                <p className="text-gray-600 mb-4">
                  Enter the verification code from your {selectedMethod.toLowerCase()}
                </p>
              </div>

              <div>
                <Label htmlFor="token">Verification Code</Label>
                <Input
                  id="token"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="rounded-xl text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleMFAVerification}
                disabled={loading || verificationToken.length !== 6}
                className="w-full rounded-xl"
                style={{ backgroundColor: COLORS.PRIMARY }}
              >
                {loading ? "Verifying..." : "Verify & Enable MFA"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <CheckCircle className="h-6 w-6 mr-2" />
                MFA Enabled Successfully
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Your account is now protected with multi-factor authentication
                </p>
                
                {mfaStatus.method && (
                  <Badge className="bg-green-100 text-green-800">
                    Method: {mfaStatus.method}
                  </Badge>
                )}
              </div>

              {/* Backup Codes */}
              {backupCodes.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center mb-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <h3 className="font-semibold text-yellow-800">Backup Codes</h3>
                  </div>
                  <p className="text-sm text-yellow-700 mb-3">
                    Save these backup codes in a secure place. You can use them to access your account if you lose access to your MFA device.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {backupCodes.slice(0, 6).map((code, index) => (
                      <code key={index} className="bg-white p-2 rounded text-sm text-center">
                        {code}
                      </code>
                    ))}
                  </div>
                  
                  <Button
                    onClick={downloadBackupCodes}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Backup Codes
                  </Button>
                </div>
              )}

              <Button
                onClick={() => setLocation('/account-settings')}
                className="w-full rounded-xl"
                style={{ backgroundColor: COLORS.PRIMARY }}
              >
                Return to Account Settings
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
