"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  User, IdCard, Trophy, Code2, Shield, Lock, Bell, Palette,
  Link2, AlertTriangle, Save, Trash2, Check,
  ExternalLink, Loader2, Download, Pause, MessageSquareX,
  Globe, Mail, Phone, Calendar, Moon, Sun, Monitor,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import AvatarSettings from "@/components/settings/AvatarSettings";
import { useCurrentAvatar } from "@/store/avatarStore";
import { useToast } from "@/hooks/useToast";
import {
  Toggle, SettingsCard, SettingsInput, SettingsSelect,
  SettingsSlider, ConfirmDialog, SettingsRow,
} from "@/components/ui/settings";
import { getUserInfo } from "@/services/user";
import type { UserInfo } from "@/types/user";

/* =============================================
   Navigation Sections
   ============================================= */
const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "personal", label: "Personal Info", icon: IdCard },
  { id: "competitive", label: "Competitive", icon: Trophy },
  { id: "coding", label: "Coding Prefs", icon: Code2 },
  { id: "account", label: "Account", icon: Shield },
  { id: "privacy", label: "Privacy", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "connected", label: "Connected", icon: Link2 },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
] as const;

/* =============================================
   Dropdown Data
   ============================================= */
const COUNTRIES = [
  { label: "India", value: "IN" },
  { label: "United States", value: "US" },
  { label: "United Kingdom", value: "UK" },
  { label: "Canada", value: "CA" },
  { label: "Australia", value: "AU" },
  { label: "Germany", value: "DE" },
  { label: "France", value: "FR" },
  { label: "Japan", value: "JP" },
  { label: "Singapore", value: "SG" },
  { label: "Brazil", value: "BR" },
];

const STATES_BY_COUNTRY: Record<string, { label: string; value: string }[]> = {
  IN: [
    { label: "Maharashtra", value: "MH" },
    { label: "Karnataka", value: "KA" },
    { label: "Tamil Nadu", value: "TN" },
    { label: "Delhi", value: "DL" },
    { label: "West Bengal", value: "WB" },
  ],
  US: [
    { label: "California", value: "CA" },
    { label: "New York", value: "NY" },
    { label: "Texas", value: "TX" },
    { label: "Washington", value: "WA" },
    { label: "Florida", value: "FL" },
  ],
};

const COLLEGES = [
  { label: "IIT Bombay", value: "iitb" },
  { label: "IIT Delhi", value: "iitd" },
  { label: "IIT Madras", value: "iitm" },
  { label: "IIT Kanpur", value: "iitk" },
  { label: "BITS Pilani", value: "bits" },
  { label: "NIT Trichy", value: "nitt" },
  { label: "IIIT Hyderabad", value: "iiith" },
  { label: "VIT Vellore", value: "vit" },
];

const COMPANIES = [
  { label: "Google", value: "google" },
  { label: "Microsoft", value: "microsoft" },
  { label: "Amazon", value: "amazon" },
  { label: "Meta", value: "meta" },
  { label: "Apple", value: "apple" },
  { label: "Netflix", value: "netflix" },
  { label: "Adobe", value: "adobe" },
  { label: "Uber", value: "uber" },
];

const LANGUAGES = [
  { label: "C++", value: "cpp" },
  { label: "Java", value: "java" },
  { label: "Python", value: "python" },
  { label: "JavaScript", value: "javascript" },
  { label: "Go", value: "go" },
  { label: "Rust", value: "rust" },
  { label: "Kotlin", value: "kotlin" },
];

const ROLE_OPTIONS = [
  { label: "User", value: "user" },
  { label: "Admin", value: "admin" },
];

const EDITOR_THEMES = [
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
  { label: "Dracula", value: "dracula" },
  { label: "Monokai", value: "monokai" },
  { label: "One Dark", value: "one-dark" },
];

const TAB_WIDTHS = [
  { label: "2 spaces", value: "2" },
  { label: "4 spaces", value: "4" },
  { label: "8 spaces", value: "8" },
];

const GENDERS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Non-binary", value: "non-binary" },
  { label: "Prefer not to say", value: "prefer-not-say" },
];

const VISIBILITY_OPTIONS = [
  { label: "Public", value: "public" },
  { label: "Friends Only", value: "friends" },
  { label: "Private", value: "private" },
];

const ACCENT_COLORS = [
  { label: "Purple", value: "#7C3AED" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Green", value: "#22C55E" },
  { label: "Orange", value: "#F97316" },
  { label: "Red", value: "#EF4444" },
];

/* =============================================
   Default Settings
   ============================================= */
const DEFAULT_SETTINGS = {
  // Profile
  avatar: null as string | null,
  username: "code_ninja",
  firstName: "Sadanand",
  lastName: "Jha",
  displayName: "Sadanand Jha",
  bio: "Competitive programmer | 5★ on CodeChef | ICPC Regionalist 2024",
  role: "user",
  // Personal Info
  email: "sadanand@example.com",
  mobileNumber: "+91 98765 43210",
  country: "IN",
  state: "MH",
  college: "iitb",
  company: "google",
  dateOfBirth: "2002-08-15",
  gender: "male",
  // Competitive Programming
  codeforcesHandle: "code_ninja",
  leetcodeUsername: "code_ninja",
  codechefUsername: "code_ninja",
  atcoderUsername: "code_ninja",
  githubUsername: "sadanand-jha",
  linkedinProfile: "sadanand-jha",
  portfolioWebsite: "https://sadanand.dev",
  // Coding Preferences
  preferredLanguage: "cpp",
  editorTheme: "dracula",
  editorFontSize: 14,
  tabWidth: "4",
  autoSave: true,
  wordWrap: false,
  vimMode: false,
  emacsKeybindings: false,
  // Account
  password: "",
  twoFactorAuth: false,
  // Privacy
  publicProfile: true,
  showCountry: true,
  showCollege: true,
  showCompany: false,
  showRating: true,
  showRecentActivity: true,
  allowFriendRequests: true,
  allowDirectMessages: true,
  profileVisibility: "public",
  // Notifications
  emailNotifications: true,
  contestReminders: true,
  aiHintNotifications: true,
  discussionReplies: true,
  friendRequests: true,
  achievementUnlocks: true,
  marketingEmails: false,
  // Appearance
  theme: "dark",
  accentColor: "#7C3AED",
  animationSpeed: 100,
  compactMode: false,
  // Connected Accounts
  googleConnected: true,
  githubConnected: true,
  discordConnected: false,
};

type Settings = typeof DEFAULT_SETTINGS;

/* =============================================
   Main Settings Page
   ============================================= */
export default function SettingsPage() {
  const toast = useToast();
  const currentAvatar = useCurrentAvatar();
  const [activeSection, setActiveSection] = useState<string>("profile");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(new Date());
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "default" | "danger";
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirm",
    variant: "default",
    onConfirm: () => {},
  });

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Track unsaved changes
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  // Update a setting
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setOriginalSettings(settings);
      setLastSaved(new Date());
      toast.success({
        title: "Settings Saved",
        description: "Your changes have been saved successfully.",
        timestamp: "Just now",
      });
    } catch {
      toast.error({
        title: "Save Failed",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset handler
  const handleReset = () => {
    setConfirmState({
      open: true,
      title: "Reset Changes?",
      description: "This will discard all unsaved changes and revert to your last saved settings.",
      confirmLabel: "Reset",
      variant: "default",
      onConfirm: () => {
        setSettings(originalSettings);
        setConfirmState((s) => ({ ...s, open: false }));
        toast.info({
          title: "Changes Discarded",
          description: "Your unsaved changes have been reset.",
        });
      },
    });
  };

  // Fetch user info from /auth/me
  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const data = await getUserInfo();
        
        // Map accent color from API format to hex
        const accentColorMap: Record<string, string> = {
          "purple": "#7C3AED",
          "blue": "#3B82F6",
          "green": "#22C55E",
          "orange": "#F97316",
          "red": "#EF4444",
        };
        
        // Map API response to settings
        const mappedSettings: Partial<Settings> = {
          username: data.username,
          email: data.email,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          bio: data.bio || "",
          mobileNumber: data.mobile || "",
          avatar: data.avatarUrl || null,
          country: data.country || "",
          state: data.state || "",
          college: data.college || "",
          company: data.company || "",
          role: data.role || "user",
          preferredLanguage: data.preferences?.preferredLanguage || "cpp",
          editorTheme: data.preferences?.editorTheme || "dracula",
          editorFontSize: data.preferences?.editorFontSize || 14,
          tabWidth: String(data.preferences?.tabWidth || 4),
          autoSave: data.preferences?.autoSave ?? true,
          wordWrap: data.preferences?.wordWrap ?? false,
          vimMode: data.preferences?.vimMode ?? false,
          emacsKeybindings: data.preferences?.emacsMode ?? false,
          theme: data.preferences?.theme === "system" ? "system" : data.preferences?.theme === "light" ? "light" : "dark",
          accentColor: accentColorMap[data.preferences?.accentColor || "blue"] || "#7C3AED",
          animationSpeed: data.preferences?.animationSpeed === 'fast' ? 150 : data.preferences?.animationSpeed === 'slow' ? 75 : 100,
          compactMode: data.preferences?.compactMode ?? false,
        };
        setSettings((prev) => ({ ...prev, ...mappedSettings }));
        setOriginalSettings((prev) => ({ ...prev, ...mappedSettings }));
      } catch (err) {
        console.error("Failed to fetch user info:", err);
      }
    }
    fetchUserInfo();
  }, []);

  // Scroll spy for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Scroll to section
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Avatar update handler - called after successful API update
  const handleAvatarUpdated = (avatarUrl: string) => {
    setSettings((prev) => ({ ...prev, avatar: avatarUrl }));
    setOriginalSettings((prev) => ({ ...prev, avatar: avatarUrl }));
  };

  return (
    <AppLayout>
      <div className="flex min-h-screen">
        {/* ===== Settings Sidebar ===== */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-white/[0.06] bg-[#09090B]/50 backdrop-blur-xl lg:block">
          <nav className="settings-scroll h-full overflow-y-auto p-3">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
              Settings
            </p>
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const isDanger = section.id === "danger";
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSettingsNav"
                      className={`absolute inset-0 rounded-xl ${
                        isDanger
                          ? "bg-[#EF4444]/10 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                          : "bg-[#7C3AED]/15 shadow-[0_0_20px_rgba(124,58,237,0.15)]"
                      }`}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className={`relative z-10 h-4 w-4 transition-colors ${
                    isActive
                      ? isDanger ? "text-[#EF4444]" : "text-white"
                      : "text-[#9CA3AF] group-hover:text-white"
                  }`} />
                  <span className={`relative z-10 transition-colors ${
                    isActive
                      ? isDanger ? "text-[#EF4444]" : "text-white"
                      : "text-[#9CA3AF] hover:text-white"
                  }`}>
                    {section.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ===== Main Content ===== */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-14 z-20 border-b border-white/[0.06] bg-[#09090B]/80 backdrop-blur-xl px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Manage your byteCode profile, security, coding preferences, and account settings.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                {hasChanges && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-1.5 rounded-full bg-[#F59E0B]/10 px-2.5 py-1 text-[10px] font-semibold text-[#F59E0B]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                    Unsaved Changes
                  </motion.span>
                )}
                <button
                  onClick={handleReset}
                  disabled={!hasChanges || saving}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white transition-all hover:border-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="flex items-center gap-1.5 rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-bold text-white transition-all hover:shadow-[0_0_16px_rgba(124,58,237,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  {saving ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-3.5 w-3.5" /> Save Changes</>
                  )}
                </button>
              </div>
            </div>
            {lastSaved && (
              <p className="mt-2 text-[10px] text-[#6B7280]">
                Last updated: {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>

          {/* Sections */}
          <div className="space-y-6 py-10 max-w-4xl">
            {/* ===== PROFILE SECTION ===== */}
            <div id="profile" ref={(el) => { sectionRefs.current["profile"] = el; }} className="scroll-mt-32 space-y-6">
              <AvatarSettings
                currentAvatarUrl={settings.avatar}
                onAvatarUpdated={handleAvatarUpdated}
              />
              <SettingsCard title="Profile" description="Your public profile and identity on byteCode" icon={<User className="h-4 w-4" />}>
                <div className="grid gap-6 md:grid-cols-[1fr_240px]">
                  <div className="space-y-4">
                    {/* Username */}
                    <SettingsInput label="Username" value={settings.username} onChange={(v) => update("username", v)} readOnly />
                    {/* Names */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SettingsInput label="First Name" value={settings.firstName} onChange={(v) => update("firstName", v)} />
                      <SettingsInput label="Last Name" value={settings.lastName} onChange={(v) => update("lastName", v)} />
                    </div>
                    {/* Display Name */}
                    <SettingsInput label="Display Name" value={settings.displayName} onChange={(v) => update("displayName", v)} />
                    {/* Role */}
                    <SettingsSelect label="Role" value={settings.role} onChange={(v) => update("role", v)} options={ROLE_OPTIONS} />
                    {/* Bio */}
                    <SettingsInput
                      label="Bio"
                      value={settings.bio}
                      onChange={(v) => update("bio", v)}
                      maxLength={300}
                      showCounter
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  {/* Live Preview */}
                  <div className="rounded-xl border border-white/[0.06] bg-[#09090B] p-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Preview</p>
                    <div className="flex flex-col items-center text-center">
                      <div className="h-16 w-16 rounded-full overflow-hidden bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-xl font-bold text-white">
                        {currentAvatar ? (
                          <img
                            src={currentAvatar.url}
                            alt={currentAvatar.label}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          settings.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-white">{settings.displayName || "Your Name"}</p>
                      <p className="text-xs text-[#9CA3AF]">@{settings.username}</p>
                      <p className="mt-2 text-[11px] text-[#9CA3AF] leading-relaxed line-clamp-3">
                        {settings.bio || "No bio yet."}
                      </p>
                    </div>
                  </div>
                </div>
              </SettingsCard>
            </div>

            {/* ===== PERSONAL INFORMATION ===== */}
            <div id="personal" className="scroll-mt-32">
              <SettingsCard title="Personal Information" description="Your personal details and contact information" icon={<IdCard className="h-4 w-4" />}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SettingsInput label="Email Address" value={settings.email} onChange={(v) => update("email", v)} type="email" icon={<Mail className="h-3.5 w-3.5" />} />
                  <SettingsInput label="Mobile Number" value={settings.mobileNumber} onChange={(v) => update("mobileNumber", v)} icon={<Phone className="h-3.5 w-3.5" />} />
                  <SettingsSelect label="Country" value={settings.country} onChange={(v) => update("country", v)} options={COUNTRIES} searchable placeholder="Search country..." />
                  <SettingsSelect label="State" value={settings.state} onChange={(v) => update("state", v)} options={STATES_BY_COUNTRY[settings.country] || []} searchable placeholder="Search state..." />
                  <SettingsSelect label="College" value={settings.college} onChange={(v) => update("college", v)} options={COLLEGES} searchable placeholder="Search college..." />
                  <SettingsSelect label="Company" value={settings.company} onChange={(v) => update("company", v)} options={COMPANIES} searchable placeholder="Search company..." />
                  <SettingsInput label="Date of Birth" value={settings.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} type="date" icon={<Calendar className="h-3.5 w-3.5" />} />
                  <SettingsSelect label="Gender" value={settings.gender} onChange={(v) => update("gender", v)} options={GENDERS} />
                </div>
              </SettingsCard>
            </div>

            {/* ===== COMPETITIVE PROGRAMMING ===== */}
            <div id="competitive" className="scroll-mt-32">
              <SettingsCard title="Competitive Programming" description="Link your competitive programming profiles" icon={<Trophy className="h-4 w-4" />}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SettingsInput label="Codeforces Handle" value={settings.codeforcesHandle} onChange={(v) => update("codeforcesHandle", v)} placeholder="your_cf_handle" action={<VerifyButton />} />
                  <SettingsInput label="LeetCode Username" value={settings.leetcodeUsername} onChange={(v) => update("leetcodeUsername", v)} placeholder="your_lc_username" action={<VerifyButton />} />
                  <SettingsInput label="CodeChef Username" value={settings.codechefUsername} onChange={(v) => update("codechefUsername", v)} placeholder="your_cc_username" action={<VerifyButton />} />
                  <SettingsInput label="AtCoder Username" value={settings.atcoderUsername} onChange={(v) => update("atcoderUsername", v)} placeholder="your_ac_username" action={<VerifyButton />} />
                  <SettingsInput label="GitHub Username" value={settings.githubUsername} onChange={(v) => update("githubUsername", v)} placeholder="your_github" icon={<Code2 className="h-3.5 w-3.5" />} action={<VerifyButton />} />
                  <SettingsInput label="LinkedIn Profile" value={settings.linkedinProfile} onChange={(v) => update("linkedinProfile", v)} placeholder="your_linkedin" icon={<Link2 className="h-3.5 w-3.5" />} action={<VerifyButton />} />
                  <div className="sm:col-span-2">
                    <SettingsInput label="Portfolio Website" value={settings.portfolioWebsite} onChange={(v) => update("portfolioWebsite", v)} placeholder="https://your-portfolio.com" icon={<Globe className="h-3.5 w-3.5" />} action={<ExternalLinkButton />} />
                  </div>
                </div>
              </SettingsCard>
            </div>

            {/* ===== CODING PREFERENCES ===== */}
            <div id="coding" className="scroll-mt-32">
              <SettingsCard title="Coding Preferences" description="Customize your editor and coding experience" icon={<Code2 className="h-4 w-4" />}>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SettingsSelect label="Preferred Programming Language" value={settings.preferredLanguage} onChange={(v) => update("preferredLanguage", v)} options={LANGUAGES} />
                    <SettingsSelect label="Editor Theme" value={settings.editorTheme} onChange={(v) => update("editorTheme", v)} options={EDITOR_THEMES} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SettingsSlider label="Editor Font Size" value={settings.editorFontSize} onChange={(v) => update("editorFontSize", v)} min={10} max={24} step={1} unit="px" />
                    <SettingsSelect label="Tab Width" value={settings.tabWidth} onChange={(v) => update("tabWidth", v)} options={TAB_WIDTHS} />
                  </div>
                  <div className="rounded-xl border border-white/[0.04] bg-[#09090B]/50 p-4">
                    <SettingsRow label="Auto Save" description="Automatically save your code as you type">
                      <Toggle checked={settings.autoSave} onChange={(v) => update("autoSave", v)} />
                    </SettingsRow>
                    <SettingsRow label="Word Wrap" description="Wrap long lines in the editor">
                      <Toggle checked={settings.wordWrap} onChange={(v) => update("wordWrap", v)} />
                    </SettingsRow>
                    <SettingsRow label="Enable Vim Mode" description="Use Vim keybindings in the editor">
                      <Toggle checked={settings.vimMode} onChange={(v) => update("vimMode", v)} />
                    </SettingsRow>
                    <SettingsRow label="Enable Emacs Keybindings" description="Use Emacs keybindings in the editor">
                      <Toggle checked={settings.emacsKeybindings} onChange={(v) => update("emacsKeybindings", v)} />
                    </SettingsRow>
                  </div>
                </div>
              </SettingsCard>
            </div>

            {/* ===== ACCOUNT ===== */}
            <div id="account" className="scroll-mt-32">
              <SettingsCard title="Account" description="Manage your account credentials and security" icon={<Shield className="h-4 w-4" />}>
                <div className="space-y-4">
                  <SettingsInput label="Username" value={settings.username} onChange={() => {}} readOnly />
                  <SettingsInput label="Email" value={settings.email} onChange={(v) => update("email", v)} type="email" />
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">Password</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value="••••••••••"
                        readOnly
                        className="flex-1 rounded-xl border border-white/[0.06] bg-[#09090B] py-2.5 pl-3.5 pr-3.5 text-sm text-white outline-none opacity-60"
                      />
                      <button className="shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-xs font-medium text-white transition-colors hover:border-white/[0.12]">
                        Change Password
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.04] bg-[#09090B]/50 p-4">
                    <SettingsRow label="Two-Factor Authentication" description="Add an extra layer of security to your account">
                      <Toggle checked={settings.twoFactorAuth} onChange={(v) => update("twoFactorAuth", v)} />
                    </SettingsRow>
                  </div>
                </div>
              </SettingsCard>
            </div>

            {/* ===== PRIVACY ===== */}
            <div id="privacy" className="scroll-mt-32">
              <SettingsCard title="Privacy" description="Control what information is visible to others" icon={<Lock className="h-4 w-4" />}>
                <div className="rounded-xl border border-white/[0.04] bg-[#09090B]/50 p-4">
                  <SettingsRow label="Public Profile" description="Allow anyone to view your profile">
                    <Toggle checked={settings.publicProfile} onChange={(v) => update("publicProfile", v)} />
                  </SettingsRow>
                  <SettingsRow label="Show Country" description="Display your country on your profile">
                    <Toggle checked={settings.showCountry} onChange={(v) => update("showCountry", v)} />
                  </SettingsRow>
                  <SettingsRow label="Show College" description="Display your college on your profile">
                    <Toggle checked={settings.showCollege} onChange={(v) => update("showCollege", v)} />
                  </SettingsRow>
                  <SettingsRow label="Show Company" description="Display your company on your profile">
                    <Toggle checked={settings.showCompany} onChange={(v) => update("showCompany", v)} />
                  </SettingsRow>
                  <SettingsRow label="Show Rating" description="Display your rating on your profile">
                    <Toggle checked={settings.showRating} onChange={(v) => update("showRating", v)} />
                  </SettingsRow>
                  <SettingsRow label="Show Recent Activity" description="Display your recent activity on your profile">
                    <Toggle checked={settings.showRecentActivity} onChange={(v) => update("showRecentActivity", v)} />
                  </SettingsRow>
                  <SettingsRow label="Allow Friend Requests" description="Allow others to send you friend requests">
                    <Toggle checked={settings.allowFriendRequests} onChange={(v) => update("allowFriendRequests", v)} />
                  </SettingsRow>
                  <SettingsRow label="Allow Direct Messages" description="Allow others to send you direct messages">
                    <Toggle checked={settings.allowDirectMessages} onChange={(v) => update("allowDirectMessages", v)} />
                  </SettingsRow>
                </div>
                <div className="mt-4">
                  <SettingsSelect label="Profile Visibility" value={settings.profileVisibility} onChange={(v) => update("profileVisibility", v)} options={VISIBILITY_OPTIONS} />
                </div>
              </SettingsCard>
            </div>

            {/* ===== NOTIFICATIONS ===== */}
            <div id="notifications" className="scroll-mt-32">
              <SettingsCard title="Notifications" description="Choose what you want to be notified about" icon={<Bell className="h-4 w-4" />}>
                <div className="rounded-xl border border-white/[0.04] bg-[#09090B]/50 p-4">
                  <SettingsRow label="Email Notifications" description="Receive notifications via email">
                    <Toggle checked={settings.emailNotifications} onChange={(v) => update("emailNotifications", v)} />
                  </SettingsRow>
                  <SettingsRow label="Contest Reminders" description="Get reminded before contests start">
                    <Toggle checked={settings.contestReminders} onChange={(v) => update("contestReminders", v)} />
                  </SettingsRow>
                  <SettingsRow label="AI Hint Notifications" description="Get notified when AI hints are ready">
                    <Toggle checked={settings.aiHintNotifications} onChange={(v) => update("aiHintNotifications", v)} />
                  </SettingsRow>
                  <SettingsRow label="Discussion Replies" description="Get notified when someone replies to your discussion">
                    <Toggle checked={settings.discussionReplies} onChange={(v) => update("discussionReplies", v)} />
                  </SettingsRow>
                  <SettingsRow label="Friend Requests" description="Get notified when you receive a friend request">
                    <Toggle checked={settings.friendRequests} onChange={(v) => update("friendRequests", v)} />
                  </SettingsRow>
                  <SettingsRow label="Achievement Unlocks" description="Get notified when you unlock an achievement">
                    <Toggle checked={settings.achievementUnlocks} onChange={(v) => update("achievementUnlocks", v)} />
                  </SettingsRow>
                  <SettingsRow label="Marketing Emails" description="Receive product updates and promotional emails">
                    <Toggle checked={settings.marketingEmails} onChange={(v) => update("marketingEmails", v)} />
                  </SettingsRow>
                </div>
              </SettingsCard>
            </div>

            {/* ===== APPEARANCE ===== */}
            <div id="appearance" className="scroll-mt-32">
              <SettingsCard title="Appearance" description="Customize how byteCode looks for you" icon={<Palette className="h-4 w-4" />}>
                <div className="space-y-5">
                  {/* Theme */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-[#9CA3AF]">Theme</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Dark", value: "dark", icon: Moon },
                        { label: "Light", value: "light", icon: Sun },
                        { label: "System", value: "system", icon: Monitor },
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const isActive = settings.theme === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => update("theme", opt.value)}
                            className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                              isActive
                                ? "border-[#7C3AED]/40 bg-[#7C3AED]/10"
                                : "border-white/[0.06] bg-[#09090B] hover:border-white/[0.1]"
                            }`}
                          >
                            <Icon className={`h-4 w-4 ${isActive ? "text-[#7C3AED]" : "text-[#9CA3AF]"}`} />
                            <span className={`text-xs font-medium ${isActive ? "text-white" : "text-[#9CA3AF]"}`}>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Accent Color */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-[#9CA3AF]">Accent Color</label>
                    <div className="flex items-center gap-3">
                      {ACCENT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => update("accentColor", color.value)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                            settings.accentColor === color.value ? "ring-2 ring-white ring-offset-2 ring-offset-[#09090B]" : ""
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        >
                          {settings.accentColor === color.value && <Check className="h-3.5 w-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Animation Speed */}
                  <SettingsSlider label="Animation Speed" value={settings.animationSpeed} onChange={(v) => update("animationSpeed", v)} min={50} max={200} step={10} unit="%" />
                  {/* Compact Mode */}
                  <div className="rounded-xl border border-white/[0.04] bg-[#09090B]/50 p-4">
                    <SettingsRow label="Compact Mode" description="Reduce spacing and padding for a denser layout">
                      <Toggle checked={settings.compactMode} onChange={(v) => update("compactMode", v)} />
                    </SettingsRow>
                  </div>
                </div>
              </SettingsCard>
            </div>

            {/* ===== CONNECTED ACCOUNTS ===== */}
            <div id="connected" className="scroll-mt-32">
              <SettingsCard title="Connected Accounts" description="Manage your linked social accounts" icon={<Link2 className="h-4 w-4" />}>
                <div className="space-y-3">
                  <ConnectedAccountCard
                    name="Google"
                    connected={settings.googleConnected}
                    onToggle={(v) => update("googleConnected", v)}
                    lastSynced="2 hours ago"
                    color="#EA4335"
                  />
                  <ConnectedAccountCard
                    name="GitHub"
                    connected={settings.githubConnected}
                    onToggle={(v) => update("githubConnected", v)}
                    lastSynced="5 minutes ago"
                    color="#FFFFFF"
                  />
                  <ConnectedAccountCard
                    name="Discord"
                    connected={settings.discordConnected}
                    onToggle={(v) => update("discordConnected", v)}
                    lastSynced={null}
                    color="#5865F2"
                  />
                </div>
              </SettingsCard>
            </div>

            {/* ===== DANGER ZONE ===== */}
            <div id="danger" className="scroll-mt-32">
              <SettingsCard title="Danger Zone" description="Irreversible and destructive actions" icon={<AlertTriangle className="h-4 w-4" />} variant="danger">
                <div className="space-y-2">
                  <DangerAction
                    icon={<Trash2 className="h-4 w-4" />}
                    title="Delete Account"
                    description="Permanently delete your account and all associated data. This action cannot be undone."
                    buttonLabel="Delete Account"
                    onConfirm={() => {
                      setConfirmState({
                        open: true,
                        title: "Delete Account?",
                        description: "This will permanently delete your account, all submissions, and associated data. This action is irreversible.",
                        confirmLabel: "Delete Forever",
                        variant: "danger",
                        onConfirm: () => {
                          setConfirmState((s) => ({ ...s, open: false }));
                          toast.error({ title: "Account Deletion", description: "Account deletion requires email verification." });
                        },
                      });
                    }}
                  />
                  <DangerAction
                    icon={<Download className="h-4 w-4" />}
                    title="Export My Data"
                    description="Download a copy of all your data including submissions, profile, and settings."
                    buttonLabel="Export Data"
                    variant="default"
                    onConfirm={() => {
                      toast.success({ title: "Export Started", description: "Your data export is being prepared. You'll receive an email when it's ready." });
                    }}
                  />
                  <DangerAction
                    icon={<Pause className="h-4 w-4" />}
                    title="Deactivate Account"
                    description="Temporarily deactivate your account. You can reactivate it anytime by logging in."
                    buttonLabel="Deactivate"
                    onConfirm={() => {
                      setConfirmState({
                        open: true,
                        title: "Deactivate Account?",
                        description: "Your profile will be hidden and you won't receive notifications. You can reactivate anytime by logging in.",
                        confirmLabel: "Deactivate",
                        variant: "default",
                        onConfirm: () => {
                          setConfirmState((s) => ({ ...s, open: false }));
                          toast.warning({ title: "Account Deactivated", description: "Your account has been temporarily deactivated." });
                        },
                      });
                    }}
                  />
                  <DangerAction
                    icon={<Shield className="h-4 w-4" />}
                    title="Clear Saved Sessions"
                    description="Sign out from all devices and clear all active sessions."
                    buttonLabel="Clear Sessions"
                    onConfirm={() => {
                      setConfirmState({
                        open: true,
                        title: "Clear All Sessions?",
                        description: "You will be signed out from all devices including this one.",
                        confirmLabel: "Clear All",
                        variant: "danger",
                        onConfirm: () => {
                          setConfirmState((s) => ({ ...s, open: false }));
                          toast.success({ title: "Sessions Cleared", description: "All active sessions have been terminated." });
                        },
                      });
                    }}
                  />
                  <DangerAction
                    icon={<MessageSquareX className="h-4 w-4" />}
                    title="Delete All AI Conversations"
                    description="Permanently delete all your AI chat history and conversations."
                    buttonLabel="Delete Conversations"
                    onConfirm={() => {
                      setConfirmState({
                        open: true,
                        title: "Delete All AI Conversations?",
                        description: "This will permanently delete all your AI chat history. This action cannot be undone.",
                        confirmLabel: "Delete All",
                        variant: "danger",
                        onConfirm: () => {
                          setConfirmState((s) => ({ ...s, open: false }));
                          toast.success({ title: "Conversations Deleted", description: "All AI conversations have been permanently deleted." });
                        },
                      });
                    }}
                  />
                </div>
              </SettingsCard>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
      />
    </AppLayout>
  );
}

/* =============================================
   Helper Components
   ============================================= */
function VerifyButton() {
  return (
    <button
      onClick={(e) => e.stopPropagation()}
      className="rounded-md bg-[#7C3AED]/15 px-2 py-1 text-[10px] font-semibold text-[#7C3AED] transition-colors hover:bg-[#7C3AED]/25"
    >
      Verify
    </button>
  );
}

function ExternalLinkButton() {
  return (
    <a
      href="#"
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="rounded-md p-1.5 text-[#6B7280] transition-colors hover:text-white"
    >
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function ConnectedAccountCard({
  name,
  connected,
  onToggle,
  lastSynced,
  color,
}: {
  name: string;
  connected: boolean;
  onToggle: (v: boolean) => void;
  lastSynced: string | null;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-[#09090B]/50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}15` }}>
          {name === "Google" && <Globe className="h-4 w-4" style={{ color }} />}
          {name === "GitHub" && <Code2 className="h-4 w-4" style={{ color }} />}
          {name === "Discord" && <MessageSquareX className="h-4 w-4" style={{ color }} />}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-[#9CA3AF]">
            {connected ? `Last synced: ${lastSynced}` : "Not connected"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#22C55E]">
              <Check className="h-3 w-3" /> Connected
            </span>
            <button
              onClick={() => onToggle(false)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:border-[#EF4444]/30 hover:text-[#EF4444]"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={() => onToggle(true)}
            className="rounded-lg bg-[#7C3AED] px-3 py-1.5 text-xs font-bold text-white transition-all hover:shadow-[0_0_12px_rgba(124,58,237,0.3)]"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

function DangerAction({
  icon,
  title,
  description,
  buttonLabel,
  variant = "danger",
  onConfirm,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
}) {
  const isDanger = variant === "danger";
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.04] bg-[#09090B]/30 p-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isDanger ? "bg-[#EF4444]/10 text-[#EF4444]" : "bg-[#7C3AED]/10 text-[#7C3AED]"
        }`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        onClick={onConfirm}
        className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
          isDanger
            ? "border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
            : "border border-white/[0.08] bg-white/[0.04] text-white hover:border-white/[0.12]"
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}