import { useState } from "react";
import { Bell, Lock, ShieldAlert, Trash2, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";

export default function LawyerSettingsTab() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  const handleSavePreferences = () => {
    toast.success("Preferences saved successfully.");
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Password updated successfully.");
  };

  return (
    <div className="p-6 md:p-12 lg:p-16 max-w-4xl mx-auto w-full">
      <div className="mb-10 border-b border-color-border-light pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-black">Settings & Security</h1>
        <p className="mt-2 text-neutral-500">Manage your account preferences, notifications, and security settings.</p>
      </div>

      <div className="space-y-10">
        
        {/* Notifications Section */}
        <section className="bg-white border border-neutral-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-black" />
            <h2 className="text-xl font-bold tracking-tight text-black">Notification Preferences</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-6">
              <div className="flex items-start gap-4">
                <div className="bg-neutral-100 p-2 shrink-0">
                  <Mail className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h4 className="font-bold text-black text-sm">Email Notifications</h4>
                  <p className="text-xs text-neutral-500 mt-1">Receive new client inquiries and consultation requests via email.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={emailNotifications} onChange={() => setEmailNotifications(!emailNotifications)} />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className="bg-neutral-100 p-2 shrink-0">
                  <Smartphone className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h4 className="font-bold text-black text-sm">SMS Alerts</h4>
                  <p className="text-xs text-neutral-500 mt-1">Get immediate text alerts for urgent messages.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={smsNotifications} onChange={() => setSmsNotifications(!smsNotifications)} />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
              </label>
            </div>
            
            <div className="pt-2">
              <button onClick={handleSavePreferences} className="bg-black text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors">
                Save Preferences
              </button>
            </div>
          </div>
        </section>

        {/* Security & Password Section */}
        <section className="bg-white border border-neutral-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-black" />
            <h2 className="text-xl font-bold tracking-tight text-black">Security & Password</h2>
          </div>
          
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md mb-8">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">Current Password</label>
              <input type="password" required className="w-full border border-neutral-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">New Password</label>
              <input type="password" required className="w-full border border-neutral-300 px-4 py-2 text-sm focus:border-black focus:outline-none" />
            </div>
            <div className="pt-2">
              <button type="submit" className="border-2 border-black bg-black text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors">
                Update Password
              </button>
            </div>
          </form>

          <div className="border-t border-neutral-100 pt-6 flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="bg-neutral-100 p-2 shrink-0">
                <ShieldAlert className="w-5 h-5 text-black" />
              </div>
              <div>
                <h4 className="font-bold text-black text-sm">Two-Factor Authentication</h4>
                <p className="text-xs text-neutral-500 mt-1">Add an extra layer of security to your account.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={twoFactor} onChange={() => setTwoFactor(!twoFactor)} />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
            </label>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="border border-red-200 p-8 bg-red-50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-red-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Danger Zone
              </h2>
              <p className="text-sm text-red-700 mt-1">Permanently deactivate your profile and remove it from the directory.</p>
            </div>
            <button 
              onClick={() => toast.error("Account deactivation requires confirming your password and contacting support.")}
              className="whitespace-nowrap bg-red-600 text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors"
            >
              Deactivate Account
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
