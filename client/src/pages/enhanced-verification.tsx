
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  CheckCircle, 
  Upload, 
  Camera, 
  FileText, 
  Shield, 
  Fingerprint,
  Eye,
  AlertCircle,
  Star
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const COLORS = {
  PRIMARY: '#4682b4',
  SECONDARY: '#131313',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444'
};

interface VerificationStatus {
  overall: {
    isVerified: boolean;
    level: string;
    progress: number;
  };
  email: {
    verified: boolean;
    email: string;
  };
  phone: {
    verified: boolean;
    phone: string;
  };
  biometric: {
    verified: boolean;
    type?: string;
  };
  documents: Array<{
    id: number;
    type: string;
    status: string;
    validationScore: number;
    uploadedAt: string;
    expiryDate?: string;
  }>;
  requiredSteps: string[];
}

export default function EnhancedVerificationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [biometricData, setBiometricData] = useState<string>('');

  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const response = await fetch('/api/verification-enhanced/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data.verification);
      }
    } catch (error) {
      console.error('Failed to fetch verification status:', error);
    }
  };

  const handleDocumentUpload = async () => {
    if (!selectedFile || !documentType || !documentNumber) {
      toast({
        title: "Missing Information",
        description: "Please select a file, document type, and number",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('documentType', documentType);
    formData.append('documentNumber', documentNumber);
    if (expiryDate) formData.append('expiryDate', expiryDate);

    try {
      const response = await fetch('/api/verification-enhanced/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Document Uploaded",
          description: `Document uploaded with ${Math.round(data.document.validationScore * 100)}% confidence`,
          variant: "default"
        });
        
        // Reset form
        setSelectedFile(null);
        setDocumentType('');
        setDocumentNumber('');
        setExpiryDate('');
        
        // Refresh status
        fetchVerificationStatus();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricVerification = async (biometricType: 'FACE' | 'FINGERPRINT') => {
    if (!biometricData) {
      // Simulate biometric capture
      setBiometricData(btoa(Math.random().toString()));
      
      toast({
        title: "Biometric Captured",
        description: "Biometric data captured successfully",
        variant: "default"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/verification-enhanced/biometric/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          biometricType,
          biometricData,
          deviceInfo: {
            deviceId: navigator.userAgent,
            platform: navigator.platform,
            version: '1.0.0'
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Biometric Verified",
          description: `${biometricType} verification completed successfully`,
          variant: "default"
        });
        
        setBiometricData('');
        fetchVerificationStatus();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Biometric verification failed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getVerificationLevelColor = (level: string) => {
    switch (level) {
      case 'PREMIUM': return COLORS.SUCCESS;
      case 'STANDARD': return COLORS.PRIMARY;
      case 'BASIC': return COLORS.WARNING;
      default: return COLORS.ERROR;
    }
  };

  const getVerificationLevelIcon = (level: string) => {
    switch (level) {
      case 'PREMIUM': return <Star className="h-5 w-5" />;
      case 'STANDARD': return <Shield className="h-5 w-5" />;
      case 'BASIC': return <CheckCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  if (!verificationStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.SECONDARY }}>
            Enhanced Verification
          </h1>
          <p className="text-gray-600">
            Complete advanced verification for maximum security and benefits
          </p>
          
          {/* Verification Level Badge */}
          <div className="mt-4 flex justify-center">
            <Badge 
              className="px-4 py-2 text-sm font-medium flex items-center"
              style={{ 
                backgroundColor: `${getVerificationLevelColor(verificationStatus.overall.level)}20`,
                color: getVerificationLevelColor(verificationStatus.overall.level),
                border: `1px solid ${getVerificationLevelColor(verificationStatus.overall.level)}40`
              }}
            >
              {getVerificationLevelIcon(verificationStatus.overall.level)}
              <span className="ml-2">{verificationStatus.overall.level} Level</span>
            </Badge>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <Progress value={verificationStatus.overall.progress} className="h-3" />
            <p className="text-sm text-gray-500 mt-2">
              {Math.round(verificationStatus.overall.progress)}% Complete
            </p>
          </div>
        </div>

        {/* Document Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center" style={{ color: COLORS.SECONDARY }}>
              <FileText className="h-6 w-6 mr-3" />
              Document Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Document Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="documentType">Document Type</Label>
                <select
                  id="documentType"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full p-3 border rounded-xl"
                >
                  <option value="">Select Document</option>
                  <option value="LICENSE">Driver's License</option>
                  <option value="NIN">National ID (NIN)</option>
                  <option value="PASSPORT">International Passport</option>
                  <option value="VEHICLE_REGISTRATION">Vehicle Registration</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="documentNumber">Document Number</Label>
                <Input
                  id="documentNumber"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Enter document number"
                  className="rounded-xl"
                />
              </div>
              
              <div>
                <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
                id="document-upload"
              />
              <label htmlFor="document-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">
                  {selectedFile ? selectedFile.name : "Click to upload document image"}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  PNG, JPG, JPEG up to 5MB
                </p>
              </label>
            </div>

            <Button
              onClick={handleDocumentUpload}
              disabled={loading || !selectedFile || !documentType || !documentNumber}
              className="w-full rounded-xl"
              style={{ backgroundColor: COLORS.PRIMARY }}
            >
              {loading ? "Uploading..." : "Upload Document"}
            </Button>
          </CardContent>
        </Card>

        {/* Biometric Verification Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center" style={{ color: COLORS.SECONDARY }}>
              <Fingerprint className="h-6 w-6 mr-3" />
              Biometric Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Face Recognition */}
              <div className="border rounded-xl p-6 text-center">
                <Eye className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                <h3 className="font-semibold mb-2">Face Recognition</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Verify your identity using facial recognition
                </p>
                <Button
                  onClick={() => handleBiometricVerification('FACE')}
                  disabled={loading}
                  className="w-full rounded-xl"
                  variant={verificationStatus.biometric.verified ? "outline" : "default"}
                  style={!verificationStatus.biometric.verified ? { backgroundColor: COLORS.PRIMARY } : {}}
                >
                  {verificationStatus.biometric.verified ? "✓ Verified" : 
                   biometricData ? "Complete Verification" : "Capture Face"}
                </Button>
              </div>

              {/* Fingerprint */}
              <div className="border rounded-xl p-6 text-center">
                <Fingerprint className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                <h3 className="font-semibold mb-2">Fingerprint</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Secure verification using fingerprint
                </p>
                <Button
                  onClick={() => handleBiometricVerification('FINGERPRINT')}
                  disabled={loading}
                  className="w-full rounded-xl"
                  variant={verificationStatus.biometric.verified ? "outline" : "default"}
                  style={!verificationStatus.biometric.verified ? { backgroundColor: COLORS.PRIMARY } : {}}
                >
                  {verificationStatus.biometric.verified ? "✓ Verified" : 
                   biometricData ? "Complete Verification" : "Scan Fingerprint"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle style={{ color: COLORS.SECONDARY }}>Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current Documents */}
              {verificationStatus.documents.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Uploaded Documents</h4>
                  <div className="space-y-2">
                    {verificationStatus.documents.map((doc) => (
                      <div key={doc.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{doc.type.replace('_', ' ')}</span>
                          <p className="text-sm text-gray-600">
                            Confidence: {Math.round(doc.validationScore * 100)}%
                          </p>
                        </div>
                        <Badge
                          variant={doc.status === 'VERIFIED' ? 'default' : 'secondary'}
                          style={{
                            backgroundColor: doc.status === 'VERIFIED' ? COLORS.SUCCESS : COLORS.WARNING,
                            color: 'white'
                          }}
                        >
                          {doc.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Steps */}
              {verificationStatus.requiredSteps.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Remaining Steps</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {verificationStatus.requiredSteps.map((step) => (
                      <div key={step} className="flex items-center p-2 border rounded-lg">
                        <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
                        <span className="text-sm">{step.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
