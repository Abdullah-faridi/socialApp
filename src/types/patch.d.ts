import { CreatePostInput } from "./postCreate";
export interface PatchUser {
  fullName?: string;
  email?: string;
  password?: string;
  profileImageURL?: string;
}

export interface updatePost extends Partial<CreatePostInput>{}