
export type CreatePostInput = {
  title: string
  altText?: string
  type: PostType
  tags: string[]
  imageUrls?: string[]
}