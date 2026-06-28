export interface SafeUser{
  id: string;
  fullName: string;
  email: string;
  profileImageURL: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface publicUserProfile extends SafeUser{
  followers: number;
  following: number;
  posts: number;
} 

export interface UserWithFollowers extends SafeUser {
  followers: SafeUser[];
}

export interface UserWithFollowing extends SafeUser {
  following: SafeUser[];
}
