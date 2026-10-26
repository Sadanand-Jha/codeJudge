"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  Code2,
  IdCard,
  Link2,
  Lock,
  Monitor,
  Moon,
  Palette,
  Save,
  Shield,
  Sun,
  Trophy,
  User,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import AvatarSettings from "@/components/settings/AvatarSettings";
import SettingsSidebar, {
  SETTINGS_NAV_GROUPS,
  SettingsMobileNav,
} from "@/components/settings/SettingsSidebar";
import SettingsPanel, {
  SettingsComingSoonBadge,
  SettingsComingSoonBody,
  SettingsTextField,
} from "@/components/settings/SettingsPanel";
import { useCurrentAvatar } from "@/store/avatarStore";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/apiError";
import { updateProfile } from "@/services/user";
import { cn } from "@/lib/helpers";

const SECTIONS = SETTINGS_NAV_GROUPS.flatMap((group) => group.items);

const THEME_OPTIONS = [
  { label: "Dark", value: "dark" as const, icon: Moon },
  { label: "Light", value: "light" as const, icon: Sun },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [navOpen, setNavOpen] = useState(false);
  const currentAvatar = useCurrentAvatar();
  const user = useAuthStore((state) => state.user);
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const [displayName, setDisplayName] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const initializedProfile = useRef(false);

  useEffect(() => {
    if (!user || initializedProfile.current) return;
    initializedProfile.current = true;
    setDisplayName(user.displayName ?? "");
  }, [user]);

  const normalizedDisplayName = displayName.trim();
  const currentDisplayName = (user?.displayName ?? "").trim();
  const hasProfileChanges = normalizedDisplayName !== currentDisplayName;

  const handleProfileSave = async () => {
    if (!hasProfileChanges || profileSaving) return;

    if (normalizedDisplayName.length > 80) {
      setProfileErrors({ displayName: "Display name must be at most 80 characters." });
      return;
    }

    setProfileSaving(true);
    setProfileErrors({});
    try {
      const result = await updateProfile({ displayName: normalizedDisplayName });
      useAuthStore.getState().setUser({ displayName: result.displayName });
      setDisplayName(result.displayName ?? "");
      toast.success({
        title: "Profile updated",
        description: "Your display name has been saved.",
        timestamp: "Just now",
      });
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Could not update your display name. Please try again."
      );
      setProfileErrors({ form: message });
      toast.error({
        title: "Update failed",
        description: message,
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const activeSectionLabel =
    SECTIONS.find((section) => section.id === activeSection)?.label ?? "Settings";

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AppLayout>
      <div className="qs-ui profile-theme relative flex min-h-[calc(100dvh-3.5rem)] overflow-x-clip bg-[var(--qs-bg)]">
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <div
            className="absolute inset-0 opacity-[0.32]"
            style={{
              backgroundImage:
                "linear-gradient(var(--qs-line) 1px, transparent 1px), linear-gradient(90deg, var(--qs-line) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-[var(--qs-brand)]/10 blur-3xl" />
          <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[var(--qs-sun)]/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[var(--qs-brand)]/[0.07] blur-3xl" />
        </div>

        <SettingsSidebar activeSection={activeSection} onSelect={scrollToSection} />

        <div className="relative z-10 min-w-0 flex-1 overflow-x-clip">
          <div className="sticky top-14 z-30 flex items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)]/95 px-4 py-2.5 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="flex items-center gap-2 rounded-[11px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-sm font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
            >
              <span className="grid h-6 w-6 place-items-center rounded-[7px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                <User className="h-3 w-3" strokeWidth={2.4} />
              </span>
              {activeSectionLabel}
              <ChevronDown className="h-3.5 w-3.5 text-[var(--qs-muted)]" />
            </button>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--qs-muted)]">
              Settings
            </span>
          </div>

          <header className="sticky top-28 z-20 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)]/90 px-5 py-4 backdrop-blur lg:top-14 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="qs-display text-2xl font-extrabold tracking-tight text-[var(--qs-ink)]">
                  Settings
                </h1>
                <p className="mt-0.5 text-xs text-[var(--qs-muted)]">
                  Manage your profile, appearance and account preferences.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-okbg)] px-3 py-1.5 text-[10px] font-extrabold text-[var(--qs-ok)]">
                  <Check className="h-3 w-3" />
                  Avatar &amp; theme auto-save
                </span>
                <Link
                  href="/profile"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-[11px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Profile
                </Link>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:py-8">
            <div id="profile" className="scroll-mt-32 space-y-5">
              <AvatarSettings currentAvatarUrl={currentAvatar?.url} />

              <SettingsPanel
                title="Profile details"
                description="Change the public display name shown on your account."
                icon={User}
                badge={
                  <span className="shrink-0 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-okbg)] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ok)]">
                    Editable
                  </span>
                }
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <SettingsTextField
                    label="Display name"
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="Your name"
                    maxLength={80}
                    autoComplete="name"
                    error={profileErrors.displayName}
                  />
                  <SettingsTextField
                    label="Username"
                    value={user?.username ?? ""}
                    onChange={() => undefined}
                    placeholder="username"
                    maxLength={20}
                    autoComplete="username"
                    hint="Username cannot be changed."
                    disabled
                    required
                  />
                  <SettingsTextField
                    label="Email"
                    value={user?.email ?? ""}
                    onChange={() => undefined}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    hint="Email cannot be changed."
                    disabled
                    required
                  />
                </div>
                {profileErrors.form ? (
                  <p className="mt-3 rounded-[10px] border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] px-3 py-2 text-xs font-semibold text-[var(--qs-bad)]">
                    {profileErrors.form}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs leading-relaxed text-[var(--qs-muted)]">
                    Only your display name can be changed. Username and email stay fixed.
                  </p>
                  <button
                    type="button"
                    onClick={handleProfileSave}
                    disabled={!hasProfileChanges || profileSaving}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[11px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-all hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--qs-sun)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                  >
                    <Save className="h-4 w-4" />
                    {profileSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </SettingsPanel>
            </div>

            <div id="personal" className="scroll-mt-32">
              <SettingsPanel
                title="Personal information"
                description="Your contact details and location."
                icon={IdCard}
                badge={<SettingsComingSoonBadge />}
              >
                <SettingsComingSoonBody message="Email, mobile number, location, college and other personal details will be editable here once profile updates are connected." />
              </SettingsPanel>
            </div>

            <div id="competitive" className="scroll-mt-32">
              <SettingsPanel
                title="Competitive programming"
                description="Linked platform profiles and coding stats."
                icon={Trophy}
                badge={<SettingsComingSoonBadge />}
              >
                <SettingsComingSoonBody message="Linked coding profiles, ratings and platform sync will appear here once competitive data is connected." />
              </SettingsPanel>
            </div>

            <div id="coding" className="scroll-mt-32">
              <SettingsPanel
                title="Coding preferences"
                description="Customize your editor and coding experience."
                icon={Code2}
                badge={<SettingsComingSoonBadge />}
              >
                <SettingsComingSoonBody message="Preferred language, editor theme, font size, tab width and keybindings will be configurable here soon." />
              </SettingsPanel>
            </div>

            <div id="account" className="scroll-mt-32">
              <SettingsPanel
                title="Account"
                description="Credentials and account security."
                icon={Shield}
                badge={<SettingsComingSoonBadge />}
              >
                <SettingsComingSoonBody message="Password changes, email updates and two-factor authentication will be available here once account security is connected." />
              </SettingsPanel>
            </div>

            <div id="privacy" className="scroll-mt-32">
              <SettingsPanel
                title="Privacy"
                description="Control what others can see and send."
                icon={Lock}
                badge={<SettingsComingSoonBadge />}
              >
                <SettingsComingSoonBody message="Profile visibility, activity sharing, friend requests and direct messages will be configurable here soon." />
              </SettingsPanel>
            </div>

            <div id="notifications" className="scroll-mt-32">
              <SettingsPanel
                title="Notifications"
                description="Choose what you want to be notified about."
                icon={Bell}
                badge={<SettingsComingSoonBadge />}
              >
                <SettingsComingSoonBody message="Email, contest, discussion and achievement notifications will be configurable here soon." />
              </SettingsPanel>
            </div>

            <div id="appearance" className="scroll-mt-32">
              <SettingsPanel
                title="Appearance"
                description="Choose how QuizSupport looks for you."
                icon={Palette}
              >
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
                    Theme
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    {THEME_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isActive = theme === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setTheme(option.value)}
                          className={cn(
                            "flex min-h-12 items-center justify-center gap-2 rounded-[12px] border-2 px-4 text-sm font-extrabold transition-all",
                            isActive
                              ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)]"
                              : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {option.label}
                          {isActive ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled
                      className="flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 text-sm font-extrabold text-[var(--qs-muted)] opacity-60"
                    >
                      <Monitor className="h-4 w-4" />
                      System
                      <span className="rounded-full border border-[var(--qs-line)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.04em]">
                        Soon
                      </span>
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--qs-muted)]">
                    Your theme is saved automatically across devices.
                  </p>
                </div>

                <div className="mt-5 rounded-[16px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-[var(--qs-ink)]">
                      More appearance options
                    </p>
                    <SettingsComingSoonBadge />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--qs-muted)]">
                    Accent colors, animation speed and compact mode are coming soon.
                  </p>
                </div>
              </SettingsPanel>
            </div>

            <div id="connected" className="scroll-mt-32">
              <SettingsPanel
                title="Connected accounts"
                description="Manage your linked social accounts."
                icon={Link2}
                badge={<SettingsComingSoonBadge />}
              >
                <SettingsComingSoonBody message="Google, GitHub and Discord connections will be available here once account linking is connected." />
              </SettingsPanel>
            </div>

            <div id="danger" className="scroll-mt-32">
              <SettingsPanel
                title="Danger zone"
                description="Irreversible and destructive actions."
                icon={AlertTriangle}
                danger
                badge={<SettingsComingSoonBadge />}
              >
                <SettingsComingSoonBody message="Account deletion, data export, deactivation and session controls will be available here once account actions are connected." />
              </SettingsPanel>
            </div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {navOpen ? (
          <SettingsMobileNav
            onClose={() => setNavOpen(false)}
            activeSection={activeSection}
            onSelect={scrollToSection}
          />
        ) : null}
      </AnimatePresence>
    </AppLayout>
  );
}
