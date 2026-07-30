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