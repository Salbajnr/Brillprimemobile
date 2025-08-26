import { useState, useEffect } from "react";
import { ArrowLeft, Upload, Shield, Lock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const driverRegistrationSchema = z.object({
  vehicleType: z.string().min(1, "Vehicle type is required"),
  vehiclePlate: z.string().min(1, "License plate is required"),
  vehicleModel: z.string().min(1, "Vehicle model is required"),
  vehicleYear: z.number().min(1990, "Vehicle year must be 1990 or later"),
  driverLicense: z.string().min(1, "Driver's license is required"),
  specializations: z.array(z.string()).optional(),
  bondInsurance: z.boolean().optional(),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions"
  })
});

type DriverRegistrationForm = z.infer<typeof driverRegistrationSchema>;

export default function DriverRegistration() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [selectedTier, setSelectedTier] = useState<'RESTRICTED' | 'OPEN' | null>(null);

  const form = useForm<DriverRegistrationForm>({
    resolver: zodResolver(driverRegistrationSchema),
    defaultValues: {
      vehicleType: "",
      vehiclePlate: "",
      vehicleModel: "",
      vehicleYear: new Date().getFullYear(),
      driverLicense: "",
      specializations: [],
      bondInsurance: false,
      agreedToTerms: false
    }
  });

  useEffect(() => {
    const tier = sessionStorage.getItem('selectedDriverTier') as 'RESTRICTED' | 'OPEN' | null;
    setSelectedTier(tier);
  }, []);

  const onSubmit = async (data: DriverRegistrationForm) => {
    try {
      await apiRequest("/api/driver/register", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          driverTier: selectedTier,
          accessLevel: selectedTier === 'RESTRICTED' ? 'RESTRICTED' : 'OPEN',
          vehicleDocuments: uploadedDocs
        })
      });

      toast({
        title: "Registration Successful",
        description: "Your driver profile has been created successfully!",
      });

      // Clear session storage and navigate to dashboard
      sessionStorage.removeItem('selectedDriverTier');
      navigate('/dashboard'); // Let dashboard routing handle driver redirect
    } catch (error) {
      console.error("Driver registration error:", error);
      toast({
        title: "Registration Failed",
        description: "Please check your information and try again.",
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

        {/* Registration Form */}
        <Card className="bg-white shadow-lg rounded-3xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Driver Registration
            </CardTitle>
            <CardDescription className="text-gray-600">
              Complete your profile to start delivering with BrillPrime
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Vehicle Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3" />
                    Vehicle Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vehicleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vehicle type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="motorcycle">Motorcycle</SelectItem>
                              <SelectItem value="car">Car</SelectItem>
                              <SelectItem value="van">Van</SelectItem>
                              <SelectItem value="truck">Truck</SelectItem>
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
                          <FormLabel>License Plate</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC-123-XY" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicleModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Model</FormLabel>
                          <FormControl>
                            <Input placeholder="Toyota Camry, Honda Civic, etc." {...field} />
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
                          <FormLabel>Vehicle Year</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="2020" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Driver License */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3" />
                    Driver Information
                  </h3>

                  <FormField
                    control={form.control}
                    name="driverLicense"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver's License Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your driver's license number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Specializations for Restricted Access */}
                {isRestricted && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Lock className="w-5 h-5 text-blue-600 mr-2" />
                      Premium Specializations
                    </h3>

                    <FormField
                      control={form.control}
                      name="specializations"
                      render={() => (
                        <FormItem>
                          <div className="grid grid-cols-2 gap-3">
                            {specializationOptions.map((spec) => (
                              <FormField
                                key={spec}
                                control={form.control}
                                name="specializations"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={spec}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(spec)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), spec])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== spec
                                                  ) || []
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal">
                                        {spec.replace(/_/g, ' ')}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bondInsurance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Bond Insurance Coverage Required
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              I understand that bond insurance is required for premium driver access
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Document Upload */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Upload className="w-5 h-5 text-blue-600 mr-2" />
                    Required Documents
                  </h3>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="document-upload"
                    />
                    <Label htmlFor="document-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload vehicle registration, insurance, and driver's license
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PDF, JPG, PNG up to 10MB each
                      </p>
                    </Label>
                  </div>

                  {uploadedDocs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Uploaded Documents:</p>
                      {uploadedDocs.map((doc, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                          {doc}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Terms and Conditions */}
                <FormField
                  control={form.control}
                  name="agreedToTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I agree to the Terms and Conditions
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          By checking this box, you agree to our driver terms of service and privacy policy
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-lg"
                  disabled={!form.formState.isValid}
                >
                  {isRestricted ? 'Submit for Review' : 'Complete Registration'}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}