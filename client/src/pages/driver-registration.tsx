import { useState, useEffect } from "react";
import { ArrowLeft, Upload, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const driverRegistrationSchema = z.object({
  vehicleType: z.string().min(1, "Vehicle type is required"),
  vehiclePlate: z.string().min(1, "License plate is required"),
  vehicleModel: z.string().min(1, "Vehicle model is required"),
  vehicleYear: z.number().min(1900).max(new Date().getFullYear() + 1),
  driverLicense: z.string().min(1, "Driver's license number is required"),
  specializations: z.array(z.string()).optional(),
  bondInsurance: z.boolean().optional(),
  agreedToTerms: z.boolean().refine(val => val === true, "You must agree to terms and conditions")
});

type DriverRegistrationForm = z.infer<typeof driverRegistrationSchema>;

export default function DriverRegistrationPage() {
  const [selectedTier, setSelectedTier] = useState<"RESTRICTED" | "OPEN" | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<DriverRegistrationForm>({
    resolver: zodResolver(driverRegistrationSchema),
    defaultValues: {
      specializations: [],
      bondInsurance: false,
      agreedToTerms: false
    }
  });

  useEffect(() => {
    const tier = sessionStorage.getItem('selectedDriverTier') as "RESTRICTED" | "OPEN";
    setSelectedTier(tier);
    if (!tier) {
      navigate('/driver-tier-selection');
    }
  }, [navigate]);

  const onSubmit = async (data: DriverRegistrationForm) => {
    try {
      const registrationData = {
        ...data,
        driverTier: selectedTier === 'RESTRICTED' ? 'PREMIUM' : 'STANDARD',
        accessLevel: selectedTier,
        vehicleDocuments: uploadedDocs,
        backgroundCheckStatus: selectedTier === 'RESTRICTED' ? 'PENDING' : 'APPROVED',
        securityClearance: selectedTier === 'RESTRICTED' ? 'BASIC' : 'NONE',
        maxCargoValue: selectedTier === 'RESTRICTED' ? '1000000' : '50000'
      };

      await apiRequest("POST", "/api/driver/register", registrationData);
      
      toast({
        title: "Registration Submitted",
        description: selectedTier === 'RESTRICTED' 
          ? "Your application is under review. We'll contact you within 7-14 days."
          : "Your driver profile has been created. You can start accepting deliveries now!",
      });

      // Clear session storage and navigate to dashboard
      sessionStorage.removeItem('selectedDriverTier');
      navigate('/dashboard'); // Let dashboard routing handle driver redirect
    } catch (error) {
      console.error("Driver registration error:", error);
      toast({
        title: "Registration Failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // In a real app, upload to cloud storage and get URLs
      const newDocs = Array.from(files).map(file => `uploaded_${file.name}`);
      setUploadedDocs(prev => [...prev, ...newDocs]);
    }
  };

  const specializationOptions = [
    "JEWELRY", "ELECTRONICS", "DOCUMENTS", "PHARMACEUTICALS", 
    "LUXURY_GOODS", "LEGAL_DOCUMENTS", "MEDICAL_SUPPLIES"
  ];

  if (!selectedTier) return null;

  const isRestricted = selectedTier === 'RESTRICTED';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6 pt-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/driver-tier-selection')}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Driver Registration</h1>
            <Badge variant={isRestricted ? 'destructive' : 'secondary'} className="mt-1">
              {isRestricted ? 'Premium - Restricted Access' : 'Standard - Open Access'}
            </Badge>
          </div>
        </div>

        {/* Tier Information */}
        <Card className={`mb-6 rounded-3xl card-3d ${isRestricted ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center">
              {isRestricted ? (
                <Shield className="w-6 h-6 text-blue-600 mr-3" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-green-600 mr-3" />
              )}
              <div>
                <h3 className="font-semibold">
                  {isRestricted ? 'High-Security Verification Required' : 'Quick Registration Process'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isRestricted 
                    ? 'Complete verification needed for high-value item transport authorization'
                    : 'Basic verification allows immediate access to general deliveries'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <Card className="rounded-3xl card-3d border-blue-100">
          <CardHeader>
            <CardTitle>Driver Information</CardTitle>
            <CardDescription>
              Please provide accurate information for verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Vehicle Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vehicleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-2xl border-blue-100">
                              <SelectValue placeholder="Select vehicle type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MOTORCYCLE">Motorcycle</SelectItem>
                            <SelectItem value="CAR">Car</SelectItem>
                            <SelectItem value="VAN">Van</SelectItem>
                            <SelectItem value="TRUCK">Truck</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vehiclePlate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Plate *</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC-123-DEF" className="rounded-2xl border-blue-100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vehicleModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Model *</FormLabel>
                        <FormControl>
                          <Input placeholder="Toyota Camry" className="rounded-2xl border-blue-100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vehicleYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2020"
                            className="rounded-2xl border-blue-100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="driverLicense"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver's License Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="DL123456789" className="rounded-2xl border-blue-100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Restricted Access Specific Fields */}
                {isRestricted && (
                  <>
                    <FormField
                      control={form.control}
                      name="specializations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specializations (Optional)</FormLabel>
                          <div className="grid grid-cols-2 gap-2">
                            {specializationOptions.map((spec) => (
                              <div key={spec} className="flex items-center space-x-2">
                                <Checkbox
                                  id={spec}
                                  checked={field.value?.includes(spec) || false}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...(field.value || []), spec]);
                                    } else {
                                      field.onChange(field.value?.filter(s => s !== spec) || []);
                                    }
                                  }}
                                />
                                <Label htmlFor={spec} className="text-sm">
                                  {spec.replace('_', ' ')}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bondInsurance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              I have or will obtain bond insurance coverage
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Required for high-value item transport authorization
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Document Upload */}
                <div className="space-y-3">
                  <Label>Required Documents</Label>
                  <div className="border-2 border-dashed border-blue-200 rounded-3xl p-6 text-center bg-blue-50/30">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload your documents (License, Insurance, Vehicle Registration)
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="document-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl border-blue-200 hover:bg-blue-50"
                      onClick={() => document.getElementById('document-upload')?.click()}
                    >
                      Choose Files
                    </Button>
                  </div>
                  {uploadedDocs.length > 0 && (
                    <div className="space-y-1">
                      {uploadedDocs.map((doc, idx) => (
                        <p key={idx} className="text-sm text-green-600">✓ {doc}</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Terms Agreement */}
                <FormField
                  control={form.control}
                  name="agreedToTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I agree to the terms and conditions *
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Including driver responsibilities, safety protocols, and platform policies
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-[var(--brill-secondary)] hover:bg-[var(--brill-active)] text-white rounded-3xl btn-3d"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Submitting..." : 
                    isRestricted ? "Submit for Review" : "Complete Registration"
                  }
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Next Steps Info */}
        <Card className="mt-6 rounded-3xl card-3d border-blue-100">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Next Steps:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              {isRestricted ? (
                <>
                  <li>• Background verification will begin within 24 hours</li>
                  <li>• Security clearance assessment (7-14 days)</li>
                  <li>• Bond insurance verification</li>
                  <li>• Final approval and platform access</li>
                </>
              ) : (
                <>
                  <li>• Basic document verification (1-3 days)</li>
                  <li>• Driver orientation materials</li>
                  <li>• Platform access and first delivery assignments</li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}