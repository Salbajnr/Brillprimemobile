import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  FileText,
  Shield,
  ArrowRight,
  Phone,
  Mail
} from "lucide-react";

// Color constants
const COLORS = {
  PRIMARY: '#4682b4',
  SECONDARY: '#0b1a51', 
  ACTIVE: '#010e42',
  TEXT: '#131313',
  WHITE: '#ffffff'
} as const;

export default function IdentityVerification() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [licenseImage, setLicenseImage] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const vehicleTypes = ['Motorcycle', 'Car', 'Van', 'Truck', 'Bicycle'];

  // Start camera for face verification
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  // Capture face photo
  const captureFace = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'face-verification.jpg', { type: 'image/jpeg' });
            setFaceImage(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'license' | 'face') => {
    const file = event.target.files?.[0];
    if (file) {
      if (type === 'license') {
        setLicenseImage(file);
      } else {
        setFaceImage(file);
      }
    }
  };

  // Submit verification mutation
  const submitVerificationMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return fetch("/api/auth/verify-identity", {
        method: "POST",
        body: data,
      }).then(res => res.json());
    },
    onSuccess: () => {
      setLocation(user?.role === 'DRIVER' ? '/driver-dashboard' : '/consumer-home');
    },
  });

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append('userId', user?.id.toString() || '');
    formData.append('role', user?.role || '');
    
    const verificationData = user?.role === 'DRIVER' 
      ? { licenseNumber, licenseExpiry, vehicleType, vehiclePlate, vehicleModel, vehicleYear }
      : { phoneVerification: true };
    
    formData.append('verificationData', JSON.stringify(verificationData));
    
    if (faceImage) {
      formData.append('faceImage', faceImage);
    }
    if (licenseImage && user?.role === 'DRIVER') {
      formData.append('licenseImage', licenseImage);
    }

    submitVerificationMutation.mutate(formData);
  };

  if (user?.role === 'DRIVER') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.SECONDARY }}>
              Driver Identity Verification
            </h1>
            <p className="text-gray-600">Complete your verification to start earning</p>
            
            {/* Progress Indicator */}
            <div className="mt-6">
              <div className="flex justify-center items-center space-x-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step <= currentStep
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {step}
                    </div>
                    {step < 3 && (
                      <div
                        className={`w-8 h-1 ${
                          step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>License Info</span>
                <span>Vehicle Details</span>
                <span>Photo Verification</span>
              </div>
            </div>
          </div>

          {/* Step 1: License Information */}
          {currentStep === 1 && (
            <Card className="rounded-3xl border-2 shadow-xl mb-6" style={{ borderColor: COLORS.PRIMARY }}>
              <CardHeader>
                <CardTitle className="flex items-center" style={{ color: COLORS.SECONDARY }}>
                  <FileText className="h-6 w-6 mr-3" />
                  Driver License Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      placeholder="Enter license number"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="rounded-xl border-2"
                      style={{ borderColor: COLORS.PRIMARY + '40' }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="licenseExpiry">Expiry Date</Label>
                    <Input
                      id="licenseExpiry"
                      type="date"
                      value={licenseExpiry}
                      onChange={(e) => setLicenseExpiry(e.target.value)}
                      className="rounded-xl border-2"
                      style={{ borderColor: COLORS.PRIMARY + '40' }}
                    />
                  </div>
                </div>

                <div>
                  <Label>Upload License Image</Label>
                  <div className="mt-2">
                    {licenseImage ? (
                      <div className="p-4 border-2 border-dashed rounded-xl" style={{ borderColor: COLORS.PRIMARY }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-6 w-6 text-green-500" />
                            <span className="text-sm font-medium">{licenseImage.name}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setLicenseImage(null)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50" style={{ borderColor: COLORS.PRIMARY }}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="h-8 w-8 mb-2" style={{ color: COLORS.PRIMARY }} />
                          <p className="text-sm" style={{ color: COLORS.TEXT }}>
                            <span className="font-semibold">Click to upload</span> driver license
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'license')}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Vehicle Type</Label>
                    <Select value={vehicleType} onValueChange={setVehicleType}>
                      <SelectTrigger className="rounded-xl border-2" style={{ borderColor: COLORS.PRIMARY + '40' }}>
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vehiclePlate">Vehicle Plate Number</Label>
                    <Input
                      id="vehiclePlate"
                      placeholder="e.g., LAG-123-AA"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      className="rounded-xl border-2"
                      style={{ borderColor: COLORS.PRIMARY + '40' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vehicleModel">Vehicle Model</Label>
                    <Input
                      id="vehicleModel"
                      placeholder="e.g., Honda CB 150"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="rounded-xl border-2"
                      style={{ borderColor: COLORS.PRIMARY + '40' }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicleYear">Vehicle Year</Label>
                    <Input
                      id="vehicleYear"
                      type="number"
                      placeholder="e.g., 2020"
                      min="2000"
                      max={new Date().getFullYear() + 1}
                      value={vehicleYear}
                      onChange={(e) => setVehicleYear(e.target.value)}
                      className="rounded-xl border-2"
                      style={{ borderColor: COLORS.PRIMARY + '40' }}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!licenseNumber || !licenseExpiry || !licenseImage || !vehicleType || !vehiclePlate}
                  className="w-full rounded-xl py-3"
                  style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE }}
                >
                  Next: Face Verification
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Face Verification */}
          {currentStep === 2 && (
            <Card className="rounded-3xl border-2 shadow-xl" style={{ borderColor: COLORS.PRIMARY }}>
              <CardHeader>
                <CardTitle className="flex items-center" style={{ color: COLORS.SECONDARY }}>
                  <Shield className="h-6 w-6 mr-3" />
                  Face Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Take a clear photo of your face for identity verification
                  </p>
                  
                  {faceImage ? (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <img
                          src={URL.createObjectURL(faceImage)}
                          alt="Face verification"
                          className="w-48 h-48 object-cover rounded-xl border-2"
                          style={{ borderColor: COLORS.PRIMARY }}
                        />
                      </div>
                      <div className="flex space-x-3 justify-center">
                        <Button variant="outline" onClick={() => setFaceImage(null)} className="rounded-xl">
                          Retake Photo
                        </Button>
                        <Button
                          onClick={handleSubmit}
                          disabled={submitVerificationMutation.isPending}
                          className="rounded-xl"
                          style={{ backgroundColor: COLORS.ACTIVE, color: COLORS.WHITE }}
                        >
                          {submitVerificationMutation.isPending ? "Submitting..." : "Complete Verification"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {isCameraActive ? (
                        <div className="space-y-4">
                          <div className="flex justify-center">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              className="w-64 h-48 object-cover rounded-xl border-2"
                              style={{ borderColor: COLORS.PRIMARY }}
                            />
                          </div>
                          <div className="flex space-x-3 justify-center">
                            <Button variant="outline" onClick={stopCamera} className="rounded-xl">
                              Cancel
                            </Button>
                            <Button
                              onClick={captureFace}
                              className="rounded-xl"
                              style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE }}
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Capture
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-64 h-48 mx-auto border-2 border-dashed rounded-xl flex items-center justify-center" style={{ borderColor: COLORS.PRIMARY }}>
                            <Camera className="h-12 w-12" style={{ color: COLORS.PRIMARY }} />
                          </div>
                          <div className="flex space-x-3 justify-center">
                            <Button
                              onClick={startCamera}
                              className="rounded-xl"
                              style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE }}
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Start Camera
                            </Button>
                            <label>
                              <Button variant="outline" className="rounded-xl" asChild>
                                <span>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload Photo
                                </span>
                              </Button>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'face')}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Consumer verification
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.SECONDARY }}>
            Consumer Identity Verification
          </h1>
          <p className="text-gray-600">Complete your verification to access all features</p>
        </div>

        <div className="space-y-6">
          {/* Email Verification Status */}
          <Card className="rounded-3xl border-2 shadow-xl" style={{ borderColor: COLORS.PRIMARY }}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between" style={{ color: COLORS.SECONDARY }}>
                <div className="flex items-center">
                  <Mail className="h-6 w-6 mr-3" />
                  Email Verification
                </div>
                {user?.isVerified ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <div className="w-6 h-6 border-2 border-yellow-500 rounded-full" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user?.isVerified ? (
                <p className="text-green-600">Your email address has been verified successfully.</p>
              ) : (
                <p className="text-yellow-600">Please verify your email address to continue.</p>
              )}
            </CardContent>
          </Card>

          {/* Phone Verification */}
          <Card className="rounded-3xl border-2 shadow-xl" style={{ borderColor: COLORS.PRIMARY }}>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: COLORS.SECONDARY }}>
                <Phone className="h-6 w-6 mr-3" />
                Phone Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Verify your phone number: {user?.phone}</p>
                <Button
                  className="rounded-xl"
                  style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE }}
                  onClick={() => setLocation('/otp-verification?type=phone')}
                >
                  Verify Phone Number
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Face Verification */}
          <Card className="rounded-3xl border-2 shadow-xl" style={{ borderColor: COLORS.PRIMARY }}>
            <CardHeader>
              <CardTitle className="flex items-center" style={{ color: COLORS.SECONDARY }}>
                <Shield className="h-6 w-6 mr-3" />
                Face Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Take a clear photo of your face for identity verification
                </p>
                
                {faceImage ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <img
                        src={URL.createObjectURL(faceImage)}
                        alt="Face verification"
                        className="w-48 h-48 object-cover rounded-xl border-2"
                        style={{ borderColor: COLORS.PRIMARY }}
                      />
                    </div>
                    <div className="flex space-x-3 justify-center">
                      <Button variant="outline" onClick={() => setFaceImage(null)} className="rounded-xl">
                        Retake Photo
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={submitVerificationMutation.isPending || !user?.isVerified}
                        className="rounded-xl"
                        style={{ backgroundColor: COLORS.ACTIVE, color: COLORS.WHITE }}
                      >
                        {submitVerificationMutation.isPending ? "Submitting..." : "Complete Verification"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isCameraActive ? (
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-64 h-48 object-cover rounded-xl border-2"
                            style={{ borderColor: COLORS.PRIMARY }}
                          />
                        </div>
                        <div className="flex space-x-3 justify-center">
                          <Button variant="outline" onClick={stopCamera} className="rounded-xl">
                            Cancel
                          </Button>
                          <Button
                            onClick={captureFace}
                            className="rounded-xl"
                            style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE }}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Capture
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-64 h-48 mx-auto border-2 border-dashed rounded-xl flex items-center justify-center" style={{ borderColor: COLORS.PRIMARY }}>
                          <Camera className="h-12 w-12" style={{ color: COLORS.PRIMARY }} />
                        </div>
                        <div className="flex space-x-3 justify-center">
                          <Button
                            onClick={startCamera}
                            className="rounded-xl"
                            style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE }}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Start Camera
                          </Button>
                          <label>
                            <Button variant="outline" className="rounded-xl" asChild>
                              <span>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Photo
                              </span>
                            </Button>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'face')}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}