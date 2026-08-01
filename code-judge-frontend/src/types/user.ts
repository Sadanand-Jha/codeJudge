export interface UserInfo {
  id: string;
  adminId: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  mobile: string | null;
  avatarUrl: string | null;
  bio: string | null;
  country: any | null;
  state: any | null;
  college: any | null;
  company: any | null;
  rating: number;
  maxRating: number;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  preferences: {
    theme: string;
    accentColor: string;
    compactMode: boolean;
    animationSpeed: string;
    preferredLanguage: string;
    editorTheme: string;
    editorFontSize: number;
    tabWidth: number;
    wordWrap: boolean;
    autoSave: boolean;
    vimMode: boolean;
    emacsMode: boolean;
  };
}

export interface UserProfile {
  id: string;
  adminid: string;
  username: string;
  email: string;
  role: string;
  createdat: string;
  updatedat: string;
}

export interface ProfileResponse {
  success: boolean;
  data: UserProfile;
}

export interface InfoResponse {
  success: boolean;
  data: UserInfo;
}
