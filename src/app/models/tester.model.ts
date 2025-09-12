export interface Tester {
  id: number;
  name: string;
  role: string;
  gender: string;
  experience: number;
  profileImageUrl?: string; // Added optional property for profile image
  createdAt: Date;
  updatedAt: Date;
}