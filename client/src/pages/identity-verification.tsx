import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  XCircle, 
  User, 
  Phone, 
  Mail, 
  Car,
  FileText,
  Shield,
  ArrowLeft,
  ArrowRight
} from "lucide-react";

// Color constants
const COLORS = {
  PRIMARY: '#4682b4',
  SECONDARY: '#0b1a51', 
  ACTIVE: '#010e42',
  TEXT: '#131313',
  WHITE: '#ffffff'
} as const;

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

interface DriverVerification {
  licenseNumber: string;
  licenseExpiry: string;
  licenseImage?: File;
  vehicleType: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleYear: string;
  faceVerification: boolean;
}

interface ConsumerVerification {
  phoneVerification: boolean;
  emailVerification: boolean;
  faceVerification: boolean;
}

export default function IdentityVerification() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [verificationData, setVerificationData] = useState<DriverVerification | ConsumerVerification>(
    user?.role === 'DRIVER' 
      ? { licenseNumber: '', licenseExpiry: '', vehicleType: '', vehiclePlate: '', vehicleModel: '', vehicleYear: '', faceVerification: false }
      : { phoneVerification: false, emailVerification: user?.isVerified || false, faceVerification: false }
  );
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [licenseImage, setLicenseImage] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);

  // Driver verification steps
  const driverSteps: VerificationStep[] = [
    {
      id: 'license',
      title: 'Driver License Verification',
      description: 'Upload your valid driver license',
      completed: false,
      required: true
    },
    {
      id: 'vehicle',
      title: 'Vehicle Registration',
      description: 'Register your vehicle details',
      completed: false,
      required: true
    },
    {
      id: 'face',
      title: 'Face Verification',
      description: 'Verify your identity with face recognition',
      completed: false,
      required: true
    }
  ];

  // Consumer verification steps
  const consumerSteps: VerificationStep[] = [
    {
      id: 'email',
      title: 'Email Verification',
      description: 'Verify your email address',
      completed: user?.isVerified || false,
      required: true
    },
    {
      id: 'phone',
      title: 'Phone Verification',
      description: 'Verify your phone number',
      completed: false,
      required: true
    },
    {
      id: 'face',
      title: 'Face Verification',
      description: 'Verify your identity with face recognition',
      completed: false,
      required: true
    }
  ];

  const steps = user?.role === 'DRIVER' ? driverSteps : consumerSteps;

  const vehicleTypes = [
    'Motorcycle',
    'Car',
    'Van',
    'Truck',
    'Bicycle'
  ];

  // Start camera for face verification
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
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
    mutationFn: (data: FormData) => 
      apiRequest("POST", "/api/auth/verify-identity", data),
    onSuccess: () => {
      setLocation(user?.role === 'DRIVER' ? '/driver-dashboard' : '/consumer-home');
    },
  });

  // Calculate progress
  useEffect(() => {
    const completedSteps = steps.filter(step => step.completed).length;
    setVerificationProgress((completedSteps / steps.length) * 100);
  }, [steps]);

  const renderDriverLicenseStep = () => (
    <Card className="rounded-3xl border-2 shadow-xl" style={{ borderColor: COLORS.PRIMARY }}>
      <CardHeader>
        <CardTitle className="flex items-center" style={{ color: COLORS.SECONDARY }}>
          <FileText className="h-6 w-6 mr-3" />
          Driver License Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="licenseNumber">License Number</Label>
            <Input
              id="licenseNumber"
              placeholder="Enter license number"
              value={(verificationData as DriverVerification).licenseNumber || ''}
              onChange={(e) => setVerificationData(prev => ({
                ...prev,
                licenseNumber: e.target.value
              }))}
              className="rounded-xl border-2"
              style={{ borderColor: COLORS.PRIMARY + '40' }}
            />
          </div>
          <div>
            <Label htmlFor="licenseExpiry">Expiry Date</Label>
            <Input
              id="licenseExpiry"
              type="date"
              value={(verificationData as DriverVerification).licenseExpiry || ''}
              onChange={(e) => setVerificationData(prev => ({
                ...prev,
                licenseExpiry: e.target.value
              }))}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLicenseImage(null)}
                  >
                    <XCircle className="h-4 w-4" />
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
      </CardContent>
    </Card>
  );

  const renderVehicleRegistrationStep = () => (
    <Card className="rounded-3xl border-2 shadow-xl" style={{ borderColor: COLORS.PRIMARY }}>
      <CardHeader>
        <CardTitle className="flex items-center" style={{ color: COLORS.SECONDARY }}>
          <Car className="h-6 w-6 mr-3" />
          Vehicle Registration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Vehicle Type</Label>
            <Select
              value={(verificationData as DriverVerification).vehicleType || ''}
              onValueChange={(value) => setVerificationData(prev => ({
                ...prev,
                vehicleType: value
              }))}
            >
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
              value={(verificationData as DriverVerification).vehiclePlate || ''}
              onChange={(e) => setVerificationData(prev => ({
                ...prev,
                vehiclePlate: e.target.value.toUpperCase()
              }))}
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
              value={(verificationData as DriverVerification).vehicleModel || ''}
              onChange={(e) => setVerificationData(prev => ({
                ...prev,
                vehicleModel: e.target.value
              }))}
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
              value={(verificationData as DriverVerification).vehicleYear || ''}
              onChange={(e) => setVerificationData(prev => ({
                ...prev,
                vehicleYear: e.target.value
              }))}
              className="rounded-xl border-2"
              style={{ borderColor: COLORS.PRIMARY + '40' }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderFaceVerificationStep = () => (
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
                <Button
                  variant="outline"
                  onClick={() => setFaceImage(null)}
                  className="rounded-xl"
                >
                  Retake Photo
                </Button>
                <Button
                  onClick={() => setVerificationData(prev => ({
                    ...prev,
                    faceVerification: true
                  }))}
                  className="rounded-xl"
                  style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE }}
                >
                  Confirm Photo
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
                    <Button
                      variant="outline"
                      onClick={stopCamera}
                      className="rounded-xl"
                    >
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
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        asChild
                      >
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
  );

  const renderConsumerVerificationSteps = () => (
    <div className="space-y-6">
      {/* Email Verification */}
      <Card className="rounded-3xl border-2 shadow-xl" style={{ borderColor: COLORS.PRIMARY }}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between" style={{ color: COLORS.SECONDARY }}>
            <div className="flex items-center">
              <Mail className="h-6 w-6 mr-3" />
              Email Verification
            </div>
            {user?.isVerified ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-4 w-4 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800">
                Pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user?.isVerified ? (
            <p className="text-green-600">Your email address has been verified successfully.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">Please check your email and click the verification link.</p>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {/* Resend verification email */}}
              >
                Resend Verification Email
              </Button>
            </div>
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
            <div className="flex items-center space-x-3">
              <span className="text-sm">Phone: {user?.phone}</span>
              <Badge className="bg-yellow-100 text-yellow-800">
                Pending
              </Badge>
            </div>
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
    </div>
  );

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append('userId', user?.id.toString() || '');
    formData.append('role', user?.role || '');
    formData.append('verificationData', JSON.stringify(verificationData));

    if (faceImage) {
      formData.append('faceImage', faceImage);
    }
    if (licenseImage) {
      formData.append('licenseImage', licenseImage);
    }

    submitVerificationMutation.mutate(formData);
  };

  const canProceed = () => {
    if (user?.role === 'DRIVER') {
      const data = verificationData as DriverVerification;
      switch (currentStep) {
        case 0:
          return data.licenseNumber && data.licenseExpiry && licenseImage;
        case 1:
          return data.vehicleType && data.vehiclePlate && data.vehicleModel && data.vehicleYear;
        case 2:
          return data.faceVerification && faceImage;
        default:
          return false;
      }
    } else {
      // For consumer, only face verification is the last step after email/phone
      // We need to check if email and phone are verified before proceeding to face verification
      const isEmailVerified = user?.isVerified;
      const isPhoneVerified = (verificationData as ConsumerVerification).phoneVerification; // Assuming this state is updated elsewhere or via OTP flow

      if (currentStep === 0) { // Email verification step
        return isEmailVerified;
      } else if (currentStep === 1) { // Phone verification step
        return isPhoneVerified;
      } else { // Face verification step
        return (verificationData as ConsumerVerification).faceVerification && faceImage;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.SECONDARY }}>
            Identity Verification
          </h1>
          <p className="text-gray-600">
            Complete your verification to access all features
          </p>

          {/* Progress Bar */}
          <div className="mt-6">
            <Progress value={verificationProgress} className="h-2" />
            <p className="text-sm text-gray-500 mt-2">
              {Math.round(verificationProgress)}% Complete
            </p>
          </div>
        </div>

        {/* Steps Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full border-2 cursor-pointer transition-colors duration-300 ${
                  index === currentStep
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : step.completed || (user?.role === 'CONSUMER' && index < 2 && user?.isVerified && index === 0) || (user?.role === 'CONSUMER' && index < 2 && (verificationData as ConsumerVerification).phoneVerification && index === 1)
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                }`}
                onClick={() => setCurrentStep(index)}
              >
                {step.completed || (user?.role === 'CONSUMER' && index < 2 && user?.isVerified && index === 0) || (user?.role === 'CONSUMER' && index < 2 && (verificationData as ConsumerVerification).phoneVerification && index === 1) ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                    index === currentStep ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-400 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                )}
                <span className="text-sm font-medium">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <div className="mb-8">
          {user?.role === 'DRIVER' ? (
            <>
              {currentStep === 0 && renderDriverLicenseStep()}
              {currentStep === 1 && renderVehicleRegistrationStep()}
              {currentStep === 2 && renderFaceVerificationStep()}
            </>
          ) : (
            <>
              {currentStep === 0 && renderConsumerVerificationSteps()}
              {currentStep === 1 && renderConsumerVerificationSteps()}
              {currentStep === 2 && renderFaceVerificationStep()}
            </>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : setLocation(user?.role === 'DRIVER' ? '/driver-dashboard' : '/consumer-home')}
            className="rounded-xl"
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? 'Back to Dashboard' : 'Previous'}
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button
              onClick={() => {
                // Mark current step as completed before moving to the next
                const newSteps = [...steps];
                newSteps[currentStep].completed = true;
                setVerificationProgress((newSteps.filter(s => s.completed).length / newSteps.length) * 100);
                setCurrentStep(currentStep + 1);
              }}
              disabled={!canProceed()}
              className="rounded-xl"
              style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE }}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || submitVerificationMutation.isPending}
              className="rounded-xl"
              style={{ backgroundColor: COLORS.ACTIVE, color: COLORS.WHITE }}
            >
              {submitVerificationMutation.isPending ? 'Submitting...' : 'Complete Verification'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}