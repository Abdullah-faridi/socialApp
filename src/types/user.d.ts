export interface SafeUser{
  id: string;
  username : string;
  fullName: string;
  email: string;
  profileImageURL: string;
  role: string;
  isBanned : boolean;
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
