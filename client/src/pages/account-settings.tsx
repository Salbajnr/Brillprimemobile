import { useState } from "react";
import { ArrowLeft, Shield, Bell, Lock, Eye, EyeOff, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { NotificationModal } from "@/components/ui/notification-modal";
import { LoadingButton } from "@/components/ui/loading-button";

interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  transactionAlerts: boolean;
  promotionalEmails: boolean;
  securityAlerts: boolean;
}

interface PrivacySettings {
  profileVisibility: "public" | "private";
  allowDataSharing: boolean;
  twoFactorAuth: boolean;
}

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Security Settings State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notification Settings State
  const [notifications, setNotifications] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: true,
    transactionAlerts: true,
    promotionalEmails: false,
    securityAlerts: true,
  });

  // Privacy Settings State
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: "private",
    allowDataSharing: false,
    twoFactorAuth: false,
  });

  // Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"security" | "notifications" | "privacy">("security");

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      // Simulate API call
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (data.currentPassword === "wrongpassword") {
            reject(new Error("Current password is incorrect"));
          } else {
            resolve({ success: true });
          }
        }, 1500);
      });
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Failed to change password. Please try again.");
      setShowErrorModal(true);
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { notifications?: NotificationSettings; privacy?: PrivacySettings }) => {
      // Simulate API call
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 1000);
      });
    },
    onSuccess: () => {
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Failed to update settings. Please try again.");
      setShowErrorModal(true);
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match");
      setShowErrorModal(true);
      return;
    }

    // Enhanced password validation
    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long");
      setShowErrorModal(true);
      return;
    }

    if (!/(?=.*[a-z])/.test(newPassword)) {
      setErrorMessage("Password must contain at least one lowercase letter");
      setShowErrorModal(true);
      return;
    }

    if (!/(?=.*[A-Z])/.test(newPassword)) {
      setErrorMessage("Password must contain at least one uppercase letter");
      setShowErrorModal(true);
      return;
    }

    if (!/(?=.*\d)/.test(newPassword)) {
      setErrorMessage("Password must contain at least one number");
      setShowErrorModal(true);
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    updateSettingsMutation.mutate({ notifications: { ...notifications, [key]: value } });
  };

  const handlePrivacyChange = (key: keyof PrivacySettings, value: boolean | string) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
    updateSettingsMutation.mutate({ privacy: { ...privacy, [key]: value } });
  };

  const tabs = [
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Globe },
  ] as const;

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
        <h1 className="text-lg font-bold text-[var(--brill-primary)]">Settings</h1>
        <div className="w-9"></div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[var(--brill-primary)] text-[var(--brill-primary)]"
                  : "border-transparent text-[var(--brill-text-light)] hover:text-[var(--brill-text)]"
              }`}
            >
              <Icon className="w-4 h-4 mx-auto mb-1" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="px-6 py-8">
        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[var(--brill-text)]">Change Password</h2>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-[var(--brill-text)] font-medium">
                  Current Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--brill-text-light)] w-5 h-5" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="pl-12 pr-12 rounded-xl border-gray-300 focus:border-[var(--brill-primary)]"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-[var(--brill-text-light)]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[var(--brill-text-light)]" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-[var(--brill-text)] font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--brill-text-light)] w-5 h-5" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pl-12 pr-12 rounded-xl border-gray-300 focus:border-[var(--brill-primary)]"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-[var(--brill-text-light)]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[var(--brill-text-light)]" />
                    )}
                  </Button>
                </div>
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="text-xs space-y-1">
                      <div className={`flex items-center space-x-2 ${newPassword.length >= 8 ? 'text-green-600' : 'text-red-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${newPassword.length >= 8 ? 'bg-green-600' : 'bg-red-500'}`}></div>
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${/(?=.*[a-z])/.test(newPassword) ? 'text-green-600' : 'text-red-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${/(?=.*[a-z])/.test(newPassword) ? 'bg-green-600' : 'bg-red-500'}`}></div>
                        <span>One lowercase letter</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${/(?=.*[A-Z])/.test(newPassword) ? 'text-green-600' : 'text-red-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${/(?=.*[A-Z])/.test(newPassword) ? 'bg-green-600' : 'bg-red-500'}`}></div>
                        <span>One uppercase letter</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${/(?=.*\d)/.test(newPassword) ? 'text-green-600' : 'text-red-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${/(?=.*\d)/.test(newPassword) ? 'bg-green-600' : 'bg-red-500'}`}></div>
                        <span>One number</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[var(--brill-text)] font-medium">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--brill-text-light)] w-5 h-5" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pl-12 pr-12 rounded-xl border-gray-300 focus:border-[var(--brill-primary)]"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-[var(--brill-text-light)]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[var(--brill-text-light)]" />
                    )}
                  </Button>
                </div>
              </div>

              <LoadingButton
                type="submit"
                loading={changePasswordMutation.isPending}
                className="w-full mt-6 py-3 rounded-xl bg-[var(--brill-primary)] hover:bg-[var(--brill-secondary)]"
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                Change Password
              </LoadingButton>
            </form>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[var(--brill-text)]">Notification Preferences</h2>
            
            <div className="space-y-4">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <h3 className="font-medium text-[var(--brill-text)]">
                      {key === 'pushNotifications' && 'Push Notifications'}
                      {key === 'emailNotifications' && 'Email Notifications'}
                      {key === 'transactionAlerts' && 'Transaction Alerts'}
                      {key === 'promotionalEmails' && 'Promotional Emails'}
                      {key === 'securityAlerts' && 'Security Alerts'}
                    </h3>
                    <p className="text-sm text-[var(--brill-text-light)]">
                      {key === 'pushNotifications' && 'Receive push notifications on your device'}
                      {key === 'emailNotifications' && 'Receive notifications via email'}
                      {key === 'transactionAlerts' && 'Get notified about transactions'}
                      {key === 'promotionalEmails' && 'Receive promotional offers and updates'}
                      {key === 'securityAlerts' && 'Important security notifications'}
                    </p>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) => handleNotificationChange(key as keyof NotificationSettings, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === "privacy" && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-[var(--brill-text)]">Privacy Controls</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-[var(--brill-text)]">Two-Factor Authentication</h3>
                  <p className="text-sm text-[var(--brill-text-light)]">
                    Add extra security to your account
                  </p>
                </div>
                <Switch
                  checked={privacy.twoFactorAuth}
                  onCheckedChange={(checked) => handlePrivacyChange('twoFactorAuth', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-[var(--brill-text)]">Data Sharing</h3>
                  <p className="text-sm text-[var(--brill-text-light)]">
                    Allow anonymous data sharing for service improvement
                  </p>
                </div>
                <Switch
                  checked={privacy.allowDataSharing}
                  onCheckedChange={(checked) => handlePrivacyChange('allowDataSharing', checked)}
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="mb-3">
                  <h3 className="font-medium text-[var(--brill-text)]">Profile Visibility</h3>
                  <p className="text-sm text-[var(--brill-text-light)]">
                    Control who can see your profile information
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={privacy.profileVisibility === "public" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePrivacyChange('profileVisibility', 'public')}
                    className="rounded-xl"
                  >
                    Public
                  </Button>
                  <Button
                    type="button"
                    variant={privacy.profileVisibility === "private" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePrivacyChange('profileVisibility', 'private')}
                    className="rounded-xl"
                  >
                    Private
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <NotificationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type="success"
        title="Settings Updated!"
        description="Your account settings have been successfully updated."
        actionText="Continue"
        onAction={() => setShowSuccessModal(false)}
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