import { ArrowLeft, Edit, Shield, Bell, HelpCircle, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import cameraIcon from "../assets/images/camera_icon.png";
import accountCircleIcon from "../assets/images/account_circle.svg";
import editIcon from "../assets/images/edit_icon_white.png";
import dropdownArrowIcon from "../assets/images/dropdown_arrow_icon.png";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const handleSignOut = () => {
    signOut();
    setLocation("/signin");
  };

  const handleSwitchAccountType = () => {
    // Show modal or navigate to account switch page
    // This would typically involve an API call to change account type
    const newRole = user?.role === "CONSUMER" ? "MERCHANT" : "CONSUMER";
    alert(`Request to switch to ${newRole} account submitted. This feature requires approval.`);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pt-12 border-b border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/dashboard")}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--brill-primary)]" />
        </Button>
        <h1 className="text-lg font-bold text-[var(--brill-primary)]">Profile</h1>
        <div className="w-9"></div>
      </div>

      <div className="px-6 py-8">
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden bg-gray-100">
              {user?.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src={accountCircleIcon} 
                  alt="Default Profile" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <Button className="absolute -bottom-1 -right-1 w-8 h-8 bg-[var(--brill-secondary)] rounded-full text-white flex items-center justify-center shadow-lg p-0 hover:bg-[var(--brill-secondary)]/90">
              <img src={cameraIcon} alt="Camera" className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl font-bold text-[var(--brill-text)] mb-1">{user?.fullName || "User"}</h2>
          <p className="text-[var(--brill-text-light)] text-sm">{user?.role || "User"}</p>
        </div>

        {/* Profile Details */}
        <div className="space-y-4 mb-8">
          <div className="bg-gray-50 rounded-brill p-4">
            <label className="text-sm font-bold text-[var(--brill-text)] block mb-2">Email Address</label>
            <p className="text-[var(--brill-text-light)]">{user?.email || "user@example.com"}</p>
          </div>

          <div className="bg-gray-50 rounded-brill p-4">
            <label className="text-sm font-bold text-[var(--brill-text)] block mb-2">Phone Number</label>
            <p className="text-[var(--brill-text-light)]">{user?.phone || "+234 801 234 5678"}</p>
          </div>

          <div className="bg-gray-50 rounded-brill p-4">
            <label className="text-sm font-bold text-[var(--brill-text)] block mb-2">Account Status</label>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${user?.isVerified ? 'bg-[var(--brill-success)]' : 'bg-[var(--brill-warning)]'}`}></div>
              <p className={`text-sm font-medium ${user?.isVerified ? 'text-[var(--brill-success)]' : 'text-[var(--brill-warning)]'}`}>
                {user?.isVerified ? "Verified" : "Pending Verification"}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Actions */}
        <div className="space-y-3 mb-8">
          <Button 
            onClick={() => setLocation("/edit-profile")}
            className="w-full p-4 border border-gray-200 rounded-brill flex items-center justify-between text-left bg-white hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <img src={editIcon} alt="Edit" className="h-5 w-5" />
              <span className="text-[var(--brill-text)] font-medium">Edit Profile</span>
            </div>
            <img src={dropdownArrowIcon} alt="arrow" className="h-4 w-4 opacity-70 -rotate-90" />
          </Button>

          <Button 
            onClick={() => setLocation("/account-settings")}
            className="w-full p-4 border border-gray-200 rounded-brill flex items-center justify-between text-left bg-white hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-[var(--brill-secondary)]" />
              <span className="text-[var(--brill-text)] font-medium">Account Settings</span>
            </div>
            <img src={dropdownArrowIcon} alt="arrow" className="h-4 w-4 opacity-70 -rotate-90" />
          </Button>

          <Button className="w-full p-4 border border-gray-200 rounded-brill flex items-center justify-between text-left bg-white hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <HelpCircle className="h-5 w-5 text-[var(--brill-secondary)]" />
              <span className="text-[var(--brill-text)] font-medium">Help & Support</span>
            </div>
            <img src={dropdownArrowIcon} alt="arrow" className="h-4 w-4 opacity-70 -rotate-90" />
          </Button>

          <Button 
            onClick={handleSwitchAccountType}
            className="w-full p-4 border border-gray-200 rounded-brill flex items-center justify-between text-left bg-white hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-5 w-5 text-[var(--brill-secondary)]" />
              <span className="text-[var(--brill-text)] font-medium">Switch Account Type</span>
            </div>
            <img src={dropdownArrowIcon} alt="arrow" className="h-4 w-4 opacity-70 -rotate-90" />
          </Button>
        </div>

        {/* Sign Out Button */}
        <Button
          onClick={handleSignOut}
          className="w-full h-14 border-2 border-[var(--brill-error)] text-[var(--brill-error)] rounded-brill font-medium btn-scale bg-white hover:bg-red-50"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
