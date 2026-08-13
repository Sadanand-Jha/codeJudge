"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  User, IdCard, Trophy, Code2, Shield, Lock, Bell, Palette,
  Link2, AlertTriangle, Save, Trash2, Check,
  ExternalLink, Loader2, Download, Pause, MessageSquareX,
  Globe, Mail, Phone, Calendar, Moon, Sun, Monitor,
  Users, Star, MapPin, BadgeCheck, Camera, AtSign,
  Hash, Clock, Sparkles,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import AvatarSettings from "@/components/settings/AvatarSettings";
import { useCurrentAvatar } from "@/store/avatarStore";
import { useToast } from "@/hooks/useToast";
import {
  Toggle, SettingsCard, SettingsInput, SettingsSelect,
  SettingsSlider, ConfirmDialog, SettingsRow,
} from "@/components/ui/settings";
import { SearchableDropdown } from "@/components/ui";
import { getUserInfo, fetchCountries, fetchStatesByCountry, fetchCollegesByState, updateProfileLocation } from "@/services/user";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/helpers";

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
  rating: 1875,
  followers: 1240,
  problemsSolved: 342,
  memberSince: "March 2024",
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

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India",
  US: "United States",
  UK: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  SG: "Singapore",
  BR: "Brazil",
};

const ROLE_LABELS: Record<string, string> = {
  user: "User",
  admin: "Admin",
};

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
  // Selected ids for the backend-driven country/state/college dropdowns
  const [countryId, setCountryId] = useState<number | null>(null);
  const [stateId, setStateId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
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

  const { theme, setTheme } = useTheme();

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Track unsaved changes
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  // Update a setting
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      
      // Sync theme to ThemeContext when changed
      if (key === "theme") {
        const themeValue = value as string;
        if (themeValue === "system") {
          setTheme("dark");
        } else if (themeValue === "dark" || themeValue === "light") {
          setTheme(themeValue);
        }
      }
      
      return next;
    });
  };

  // Selecting a fresh country resets dependent state + college selections
  const handleCountrySelect = (o: { id: number | string; label: string }) => {
    setCountryId(Number(o.id));
    update("country", o.label);
    setStateId(null);
    setCollegeId(null);
    update("state", "");
    update("college", "");
  };

  // Selecting a fresh state resets the dependent college selection
  const handleStateSelect = (o: { id: number | string; label: string }) => {
    setStateId(Number(o.id));
    update("state", o.label);
    setCollegeId(null);
    update("college", "");
  };

  const handleCollegeSelect = (o: { id: number | string; label: string }) => {
    setCollegeId(Number(o.id));
    update("college", o.label);
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      // Persist the profile location (country/state/college) to the backend
      if (countryId != null || stateId != null || collegeId != null) {
        await updateProfileLocation({
          countryId,
          stateId,
          collegeId,
        });
      }
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
        
        // Format member since date
        const memberSince = data.createdAt 
          ? new Date(data.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
          : "March 2024";
        
        // Map API response to settings
        const mappedSettings: Partial<Settings> = {
          username: data.username,
          email: data.email,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          displayName: data.displayName || `${data.firstName || ""} ${data.lastName || ""}`.trim(),
          bio: data.bio || "",
          mobileNumber: data.mobile || "",
          avatar: data.avatarUrl || null,
          country: data.country || "",
          state: data.state || "",
          college: data.college || "",
          company: data.company || "",
          role: data.role || "user",
          rating: data.rating || 1875,
          memberSince,
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

  const displayName = settings.displayName || `${settings.firstName} ${settings.lastName}`.trim() || "Your Name";
  const countryName = COUNTRY_NAMES[settings.country] || settings.country || "—";
  const roleLabel = ROLE_LABELS[settings.role] || settings.role || "User";

  return (
    <AppLayout>
      <div className="flex min-h-screen bg-background">
        {/* ===== Settings Sidebar ===== */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-border bg-card lg:block">
          <nav className="settings-scroll h-full overflow-y-auto p-4">
            <p className="px-3 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Settings
            </p>
            <div className="space-y-1">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isDanger = section.id === "danger";
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                      isActive
                        ? isDanger
                          ? "bg-danger/10 text-danger"
                          : "bg-accent/10 text-accent"
                        : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isActive ? "text-accent" : "text-text-muted group-hover:text-text-primary"
                      )}
                      strokeWidth={isActive ? 2.2 : 2}
                    />
                    <span className={cn("font-medium", isActive && "font-semibold")}>
                      {section.label}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="activeSettingsIndicator"
                        className={cn(
                          "ml-auto h-1.5 w-1.5 rounded-full",
                          isDanger ? "bg-danger" : "bg-accent"
                        )}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* ===== Main Content ===== */}
        <div className="flex-1 overflow-y-auto">
          {/* ===== Page Header ===== */}
          <div className="sticky top-14 z-20 border-b border-border bg-background/80 px-6 py-5 backdrop-blur-xl lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-text-primary">Settings</h1>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Manage your profile, coding preferences and account.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {hasChanges ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-[10px] font-semibold text-warning"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                    Unsaved Changes
                  </motion.span>
                ) : (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hidden items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-[10px] font-semibold text-success sm:flex"
                  >
                    <Check className="h-3 w-3" />
                    {lastSaved ? `Auto saved ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Auto saved"}
                  </motion.span>
                )}
                <button
                  onClick={handleReset}
                  disabled={!hasChanges || saving}
                  className="h-11 rounded-xl border border-border bg-card px-4 text-xs font-medium text-text-primary transition-all duration-200 hover:border-border-hover hover:bg-card-hover disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-xs font-bold text-white transition-all duration-200 hover:shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:brightness-105 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:brightness-100"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4" /> Save Changes</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ===== Sections ===== */}
          <div className="mx-auto max-w-4xl space-y-10 px-6 py-10 lg:px-8">
            {/* ===== PROFILE SECTION ===== */}
            <div id="profile" ref={(el) => { sectionRefs.current["profile"] = el; }} className="scroll-mt-32 space-y-6">
              <AvatarSettings
                currentAvatarUrl={settings.avatar}
                onAvatarUpdated={handleAvatarUpdated}
              />
              <SettingsCard
                title="Profile"
                description="Manage your public identity"
                icon={<User className="h-5 w-5" />}
              >
                <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
                  {/* ===== Left: Form ===== */}
                  <div className="space-y-6">
                    {/* Username */}
                    <SettingsInput label="Username" value={settings.username} onChange={(v) => update("username", v)} readOnly required />
                    {/* Names */}
                    <div className="grid gap-6 sm:grid-cols-2">
                      <SettingsInput label="First Name" value={settings.firstName} onChange={(v) => update("firstName", v)} required />
                      <SettingsInput label="Last Name" value={settings.lastName} onChange={(v) => update("lastName", v)} required />
                    </div>
                    {/* Display Name */}
                    <SettingsInput label="Display Name" value={settings.displayName} onChange={(v) => update("displayName", v)} placeholder="How your name appears publicly" />
                    {/* Role */}
                    <SettingsSelect label="Role" value={settings.role} onChange={(v) => update("role", v)} options={ROLE_OPTIONS} />
                    {/* Bio with character counter */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-text-primary">Bio</label>
                        <BioCounter count={settings.bio.length} max={300} />
                      </div>
                      <textarea
                        value={settings.bio}
                        onChange={(e) => update("bio", e.target.value)}
                        maxLength={300}
                        rows={4}
                        placeholder="Tell us about yourself..."
                        className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-text-primary placeholder-text-muted outline-none transition-all duration-200 focus:border-accent focus:shadow-[0_0_0_3px_var(--input-focus-ring)]"
                      />
                    </div>
                  </div>

                  {/* ===== Right: Live Profile Preview ===== */}
                  <ProfilePreviewCard
                    avatarUrl={currentAvatar?.url || settings.avatar || undefined}
                    displayName={displayName}
                    username={settings.username}
                    role={roleLabel}
                    bio={settings.bio}
                    country={countryName}
                    rating={settings.rating}
                    followers={settings.followers}
                    problemsSolved={settings.problemsSolved}
                    memberSince={settings.memberSince}
                  />
                </div>
              </SettingsCard>
            </div>

            {/* ===== PERSONAL INFORMATION ===== */}
            <div id="personal" className="scroll-mt-32">
              <SettingsCard title="Personal Information" description="Your personal details and contact information" icon={<IdCard className="h-5 w-5" />}>
                <div className="grid gap-6 sm:grid-cols-2">
                  <SettingsInput label="Email Address" value={settings.email} onChange={(v) => update("email", v)} type="email" icon={<Mail className="h-4 w-4" />} required />
                  <SettingsInput label="Mobile Number" value={settings.mobileNumber} onChange={(v) => update("mobileNumber", v)} icon={<Phone className="h-4 w-4" />} optional />
                  <SearchableDropdown
                    label="Country"
                    placeholder="Search country..."
                    required
                    value={settings.country}
                    selectedId={countryId ?? undefined}
                    onSelect={handleCountrySelect}
                    onClear={() => {
                      setCountryId(null);
                      update("country", "");
                    }}
                    searchFn={fetchCountries}
                    minChars={1}
                  />
                  <SearchableDropdown
                    label="State"
                    placeholder="Search state..."
                    optional
                    disabled={countryId == null}
                    value={settings.state}
                    selectedId={stateId ?? undefined}
                    onSelect={handleStateSelect}
                    onClear={() => {
                      setStateId(null);
                      update("state", "");
                    }}
                    searchFn={(query, signal) => fetchStatesByCountry(countryId ?? 0, query, signal)}
                    minChars={1}
                  />
                  <SearchableDropdown
                    label="College"
                    placeholder="Search college..."
                    optional
                    disabled={stateId == null}
                    value={settings.college}
                    selectedId={collegeId ?? undefined}
                    onSelect={handleCollegeSelect}
                    onClear={() => {
                      setCollegeId(null);
                      update("college", "");
                    }}
                    searchFn={(query, signal) => fetchCollegesByState(stateId ?? 0, query, signal)}
                    minChars={1}
                  />
                  <SettingsSelect label="Company" value={settings.company} onChange={(v) => update("company", v)} options={COMPANIES} searchable placeholder="Search company..." optional />
                  <SettingsInput label="Date of Birth" value={settings.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} type="date" icon={<Calendar className="h-4 w-4" />} />
                  <SettingsSelect label="Gender" value={settings.gender} onChange={(v) => update("gender", v)} options={GENDERS} />
                </div>
              </SettingsCard>
            </div>

            {/* ===== COMPETITIVE PROGRAMMING ===== */}
            <div id="competitive" className="scroll-mt-32">
              <SettingsCard title="Competitive Programming" description="Link your competitive programming profiles" icon={<Trophy className="h-5 w-5" />}>
                <div className="grid gap-6 sm:grid-cols-2">
                  <SettingsInput label="Codeforces Handle" value={settings.codeforcesHandle} onChange={(v) => update("codeforcesHandle", v)} placeholder="your_cf_handle" action={<VerifyButton />} optional />
                  <SettingsInput label="LeetCode Username" value={settings.leetcodeUsername} onChange={(v) => update("leetcodeUsername", v)} placeholder="your_lc_handle" action={<VerifyButton />} optional />
                  <SettingsInput label="CodeChef Username" value={settings.codechefUsername} onChange={(v) => update("codechefUsername", v)} placeholder="your_cc_handle" action={<VerifyButton />} optional />
                  <SettingsInput label="AtCoder Username" value={settings.atcoderUsername} onChange={(v) => update("atcoderUsername", v)} placeholder="your_ac_handle" action={<VerifyButton />} optional />
                  <SettingsInput label="GitHub Username" value={settings.githubUsername} onChange={(v) => update("githubUsername", v)} placeholder="your_github" icon={<Code2 className="h-4 w-4" />} action={<VerifyButton />} optional />
                  <SettingsInput label="LinkedIn Profile" value={settings.linkedinProfile} onChange={(v) => update("linkedinProfile", v)} placeholder="your_linkedin" icon={<Link2 className="h-4 w-4" />} action={<VerifyButton />} optional />
                  <div className="sm:col-span-2">
                    <SettingsInput label="Portfolio Website" value={settings.portfolioWebsite} onChange={(v) => update("portfolioWebsite", v)} placeholder="https://your-portfolio.com" icon={<Globe className="h-4 w-4" />} action={<ExternalLinkButton />} optional />
                  </div>
                </div>
              </SettingsCard>
            </div>

            {/* ===== CODING PREFERENCES ===== */}
            <div id="coding" className="scroll-mt-32">
              <SettingsCard title="Coding Preferences" description="Customize your editor and coding experience" icon={<Code2 className="h-5 w-5" />}>
                <div className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <SettingsSelect label="Preferred Programming Language" value={settings.preferredLanguage} onChange={(v) => update("preferredLanguage", v)} options={LANGUAGES} required />
                    <SettingsSelect label="Editor Theme" value={settings.editorTheme} onChange={(v) => update("editorTheme", v)} options={EDITOR_THEMES} />
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <SettingsSlider label="Editor Font Size" value={settings.editorFontSize} onChange={(v) => update("editorFontSize", v)} min={10} max={24} step={1} unit="px" />
                    <SettingsSelect label="Tab Width" value={settings.tabWidth} onChange={(v) => update("tabWidth", v)} options={TAB_WIDTHS} />
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-5">
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
              <SettingsCard title="Account" description="Manage your account credentials and security" icon={<Shield className="h-5 w-5" />}>
                <div className="space-y-6">
                  <SettingsInput label="Username" value={settings.username} onChange={() => {}} readOnly required />
                  <SettingsInput label="Email" value={settings.email} onChange={(v) => update("email", v)} type="email" required />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary">Password</label>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        type="password"
                        value="••••••••••"
                        readOnly
                        className="h-12 flex-1 rounded-xl border border-input-border bg-input-bg px-4 text-sm text-text-primary outline-none opacity-60"
                      />
                      <button className="h-12 shrink-0 rounded-xl border border-input-border bg-input-bg px-4 text-xs font-medium text-text-primary transition-all duration-200 hover:border-accent/40 hover:bg-accent/5">
                        Change Password
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <SettingsRow label="Two-Factor Authentication" description="Add an extra layer of security to your account">
                      <Toggle checked={settings.twoFactorAuth} onChange={(v) => update("twoFactorAuth", v)} />
                    </SettingsRow>
                  </div>
                </div>
              </SettingsCard>
            </div>

            {/* ===== PRIVACY ===== */}
            <div id="privacy" className="scroll-mt-32">
              <SettingsCard title="Privacy" description="Control what information is visible to others" icon={<Lock className="h-5 w-5" />}>
                <div className="rounded-2xl border border-border bg-card p-5">
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
                <div className="mt-6">
                  <SettingsSelect label="Profile Visibility" value={settings.profileVisibility} onChange={(v) => update("profileVisibility", v)} options={VISIBILITY_OPTIONS} />
                </div>
              </SettingsCard>
            </div>

            {/* ===== NOTIFICATIONS ===== */}
            <div id="notifications" className="scroll-mt-32">
              <SettingsCard title="Notifications" description="Choose what you want to be notified about" icon={<Bell className="h-5 w-5" />}>
                <div className="rounded-2xl border border-border bg-card p-5">
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
              <SettingsCard title="Appearance" description="Customize how ByteClash looks for you" icon={<Palette className="h-5 w-5" />}>
                <div className="space-y-7">
                  {/* Theme */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-text-primary">Theme</label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                            className={cn(
                              "flex h-14 items-center justify-center gap-2.5 rounded-xl border transition-all duration-200",
                              isActive
                                ? "border-accent bg-accent/10 shadow-[0_0_0_3px_var(--input-focus-ring)]"
                                : "border-input-border bg-input-bg hover:border-border-hover"
                            )}
                          >
                            <Icon className={cn("h-4 w-4", isActive ? "text-accent" : "text-text-secondary")} />
                            <span className={cn("text-sm font-medium", isActive ? "text-accent" : "text-text-secondary")}>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Accent Color */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-text-primary">Accent Color</label>
                    <div className="flex items-center gap-3">
                      {ACCENT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => update("accentColor", color.value)}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:scale-110",
                            settings.accentColor === color.value ? "ring-2 ring-offset-2 ring-offset-card" : ""
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        >
                          {settings.accentColor === color.value && <Check className="h-4 w-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Animation Speed */}
                  <SettingsSlider label="Animation Speed" value={settings.animationSpeed} onChange={(v) => update("animationSpeed", v)} min={50} max={200} step={10} unit="%" />
                  {/* Compact Mode */}
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <SettingsRow label="Compact Mode" description="Reduce spacing and padding for a denser layout">
                      <Toggle checked={settings.compactMode} onChange={(v) => update("compactMode", v)} />
                    </SettingsRow>
                  </div>
                </div>
              </SettingsCard>
            </div>

            {/* ===== CONNECTED ACCOUNTS ===== */}
            <div id="connected" className="scroll-mt-32">
              <SettingsCard title="Connected Accounts" description="Manage your linked social accounts" icon={<Link2 className="h-5 w-5" />}>
                <div className="space-y-4">
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
                    color="#6366F1"
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
              <SettingsCard title="Danger Zone" description="Irreversible and destructive actions" icon={<AlertTriangle className="h-5 w-5" />} variant="danger">
                <div className="space-y-4">
                  <DangerAction
                    icon={<Trash2 className="h-5 w-5" />}
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
                    icon={<Download className="h-5 w-5" />}
                    title="Export My Data"
                    description="Download a copy of all your data including submissions, profile, and settings."
                    buttonLabel="Export Data"
                    variant="default"
                    onConfirm={() => {
                      toast.success({ title: "Export Started", description: "Your data export is being prepared. You'll receive an email when it's ready." });
                    }}
                  />
                  <DangerAction
                    icon={<Pause className="h-5 w-5" />}
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
                    icon={<Shield className="h-5 w-5" />}
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
                    icon={<MessageSquareX className="h-5 w-5" />}
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
   Bio Character Counter
   ============================================= */
function BioCounter({ count, max }: { count: number; max: number }) {
  const pct = count / max;
  const color = pct >= 0.9 ? "text-danger" : pct >= 0.75 ? "text-warning" : "text-success";
  return (
    <span className={cn("text-[10px] font-medium tabular-nums", color)}>
      {count} / {max}
    </span>
  );
}

/* =============================================
   Live Profile Preview Card
   ============================================= */
function ProfilePreviewCard({
  avatarUrl,
  displayName,
  username,
  role,
  bio,
  country,
  rating,
  followers,
  problemsSolved,
  memberSince,
}: {
  avatarUrl?: string;
  displayName: string;
  username: string;
  role: string;
  bio: string;
  country: string;
  rating: number;
  followers: number;
  problemsSolved: number;
  memberSince: string;
}) {
  return (
    <div className="flex flex-col">
      <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <Sparkles className="h-3 w-3" /> Live Preview
      </p>

      {/* Profile Card */}
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)] transition-all duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
        {/* Cover gradient */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-accent/15 via-accent-secondary/10 to-transparent" />

        <div className="relative flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative -mt-2">
            <div className="absolute -inset-2 rounded-full bg-accent/20 blur-lg" />
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-[3px] border-card shadow-lg">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-accent/10 text-xl font-bold text-accent">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Name + verified */}
          <div className="mt-3 flex items-center gap-1.5">
            <p className="text-sm font-bold text-text-primary">{displayName}</p>
            <BadgeCheck className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-text-secondary">
            <AtSign className="h-3 w-3" />
            {username}
          </p>

          {/* Role badge */}
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
            {role}
          </span>

          {/* Bio */}
          <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-text-secondary">
            {bio || "No bio yet."}
          </p>

          {/* Country */}
          <div className="mt-3 flex items-center gap-1 text-[11px] text-text-secondary">
            <MapPin className="h-3 w-3 text-text-muted" />
            {country}
          </div>

          {/* Stats */}
          <div className="mt-5 grid w-full grid-cols-3 gap-2 border-t border-border pt-4">
            <StatItem icon={<Star className="h-3.5 w-3.5 text-warning" />} value={rating.toLocaleString()} label="Rating" />
            <StatItem icon={<Users className="h-3.5 w-3.5 text-accent" />} value={followers.toLocaleString()} label="Followers" />
            <StatItem icon={<Hash className="h-3.5 w-3.5 text-success" />} value={problemsSolved.toLocaleString()} label="Solved" />
          </div>

          {/* Member since */}
          <div className="mt-4 flex items-center gap-1 text-[10px] text-text-muted">
            <Clock className="h-3 w-3" />
            Member since {memberSince}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-accent/5 px-2 py-2.5">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-xs font-bold text-text-primary tabular-nums">{value}</span>
      </div>
      <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-text-muted">{label}</span>
    </div>
  );
}

/* =============================================
   Helper Components
   ============================================= */
function VerifyButton() {
  return (
    <button
      onClick={(e) => e.stopPropagation()}
      className="rounded-lg bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent transition-colors duration-200 hover:bg-accent/20"
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
      className="rounded-lg p-1.5 text-text-muted transition-colors duration-200 hover:bg-accent/10 hover:text-accent"
    >
      <ExternalLink className="h-4 w-4" />
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-border-hover">
      <div className="flex items-center gap-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}15` }}>
          {name === "Google" && <Globe className="h-5 w-5" style={{ color }} />}
          {name === "GitHub" && <Code2 className="h-5 w-5" style={{ color }} />}
          {name === "Discord" && <MessageSquareX className="h-5 w-5" style={{ color }} />}
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{name}</p>
          <p className="text-xs text-text-secondary">
            {connected ? `Last synced: ${lastSynced}` : "Not connected"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        {connected ? (
          <>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
              <Check className="h-3.5 w-3.5" /> Connected
            </span>
            <button
              onClick={() => onToggle(false)}
              className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-text-secondary transition-all duration-200 hover:border-danger/40 hover:text-danger"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={() => onToggle(true)}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition-all duration-200 hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] active:scale-[0.98]"
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
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3.5">
        <div className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          isDanger ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"
        )}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{description}</p>
        </div>
      </div>
      <button
        onClick={onConfirm}
        className={cn(
          "shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98]",
          isDanger
            ? "border border-danger/30 text-danger hover:bg-danger hover:text-white"
            : "border border-border bg-card text-text-primary hover:border-border-hover"
        )}
      >
        {buttonLabel}
      </button>
    </div>
  );
}