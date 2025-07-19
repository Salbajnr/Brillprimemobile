import { useState } from "react";
import { ArrowLeft, Save, MapPin, Phone, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { NotificationModal } from "@/components/ui/notification-modal";
import { LoadingButton } from "@/components/ui/loading-button";
import { ImagePicker } from "@/components/ui/image-picker";

interface ProfileFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  bio: string;
  profilePicture?: File | null;
}

const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara"
];

export default function EditProfilePage() {
  const { user, updateUser } = useAuth();
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
    country: user?.country || "Nigeria",
    bio: user?.bio || "",
    profilePicture: null,
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // Simulate API call with profile picture handling
      if (data.profilePicture) {
        // In a real app, you would upload the image to a storage service
        // For now, we'll create a data URL for preview
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onload = () => {
            const imageUrl = reader.result as string;
            setTimeout(() => resolve({ success: true, imageUrl }), 1500);
          };
          reader.readAsDataURL(data.profilePicture);
        });
      } else {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), 1500);
        });
      }
    },
    onSuccess: (result: any) => {
      // Update user in auth context with new profile data
      const updatedProfile: any = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        bio: formData.bio,
      };

      if (result.imageUrl) {
        updatedProfile.profilePicture = result.imageUrl;
      }

      updateUser(updatedProfile);
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Failed to update profile. Please try again.");
      setShowErrorModal(true);
    },
  });

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };



  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pt-12 border-b border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/profile")}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--brill-primary)]" />
        </Button>
        <h1 className="text-lg font-bold text-[var(--brill-primary)]">Edit Profile</h1>
        <div className="w-9"></div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-8">
        {/* Profile Picture */}
        <div className="text-center mb-8">
          <ImagePicker
            currentImage={user?.profilePicture}
            onImageSelect={(file) => setFormData(prev => ({ ...prev, profilePicture: file }))}
            onError={(error) => {
              setErrorMessage(error);
              setShowErrorModal(true);
            }}
            maxSize={5}
          />
          <p className="text-xs text-[var(--brill-text-light)] mt-2">
            Tap camera to change photo (Max 5MB)
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-[var(--brill-text)] font-medium">
              <User className="inline w-4 h-4 mr-2" />
              Full Name
            </Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              placeholder="Enter your full name"
              className="rounded-xl border-gray-300 focus:border-[var(--brill-primary)]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[var(--brill-text)] font-medium">
              <Mail className="inline w-4 h-4 mr-2" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter your email"
              className="rounded-xl border-gray-300 focus:border-[var(--brill-primary)]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-[var(--brill-text)] font-medium">
              <Phone className="inline w-4 h-4 mr-2" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="+234 801 234 5678"
              className="rounded-xl border-gray-300 focus:border-[var(--brill-primary)]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-[var(--brill-text)] font-medium">
              About Me
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              className="rounded-xl border-gray-300 focus:border-[var(--brill-primary)] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-[var(--brill-text)] font-medium">
              <MapPin className="inline w-4 h-4 mr-2" />
              Street Address
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Enter your street address"
              className="rounded-xl border-gray-300 focus:border-[var(--brill-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-[var(--brill-text)] font-medium">
                City
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                placeholder="City"
                className="rounded-xl border-gray-300 focus:border-[var(--brill-primary)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state" className="text-[var(--brill-text)] font-medium">
                State
              </Label>
              <Select
                value={formData.state}
                onValueChange={(value) => handleInputChange("state", value)}
              >
                <SelectTrigger className="rounded-xl border-gray-300 focus:border-[var(--brill-primary)]">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {nigerianStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country" className="text-[var(--brill-text)] font-medium">
              Country
            </Label>
            <Select
              value={formData.country}
              onValueChange={(value) => handleInputChange("country", value)}
            >
              <SelectTrigger className="rounded-xl border-gray-300 focus:border-[var(--brill-primary)]">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nigeria">Nigeria</SelectItem>
                <SelectItem value="Ghana">Ghana</SelectItem>
                <SelectItem value="Kenya">Kenya</SelectItem>
                <SelectItem value="South Africa">South Africa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <LoadingButton
          type="submit"
          loading={updateProfileMutation.isPending}
          className="w-full mt-8 py-3 rounded-xl bg-[var(--brill-primary)] hover:bg-[var(--brill-secondary)]"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </LoadingButton>
      </form>

      {/* Success Modal */}
      <NotificationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type="success"
        title="Profile Updated!"
        description="Your profile has been successfully updated."
        actionText="Continue"
        onAction={() => setLocation("/profile")}
      />

      {/* Error Modal */}
      <NotificationModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        type="error"
        title="Update Failed"
        description={errorMessage}
        actionText="Try Again"
        onAction={() => setShowErrorModal(false)}
      />
    </div>
  );
}