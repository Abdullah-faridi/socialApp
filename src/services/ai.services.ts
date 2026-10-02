import { ai } from "../config/google";
import { PostModel } from "../models/post";
import { recursiveChunkText } from "../utils/chunking";
import { findRelevantChunk } from "../utils/findRelevantChunks";
import { fetchImageAsBase64 } from "../utils/fetchImage";
import { prisma } from "../config/db";

export async function answerTopicQuestion(question: string) {
  const [keywordPosts, semanticPosts] = await Promise.all([
    PostModel.search(question),
    PostModel.semanticSearch(question),
  ]);
  const uniquePosts = Array.from(
    new Map([...keywordPosts, ...semanticPosts].map((p) => [p.id, p])).values(),
  ).slice(0, 5);
  if (uniquePosts.length === 0) {
    return {
      answer: "I couldn't find any posts related to your question.",
      relatedPosts: [],
    };
  }
  const allChunks: string[] = [];
  for (const post of uniquePosts) {
    const text = `Title:${post.title}\n${post.content ?? ""}`;
    if (text.length > 1000) {
      const chunks = recursiveChunkText(text);
      const relevant = await findRelevantChunk(question, chunks, 2);
      allChunks.push(...relevant);
    } else {
      allChunks.push(text);
    }
  }
  const imageParts: { inlineData: { data: string; mimeType: string } }[] = [];

  for (const post of uniquePosts) {
    if (!post.media?.length) continue;
    const images = post.media
      .filter((media) => media.mediaType === "IMAGE")
      .slice(0, 2);
    for (const media of images) {
      const image = await fetchImageAsBase64(media.url);

      if (!image) continue;

      imageParts.push({
        inlineData: {
          data: image.base64,
          mimeType: image.mimeType,
        },
      });
    }
  }
  const context = allChunks
    .map((chunk, i) => `[${i + 1}] ${chunk}`)
    .join("\n\n");

  const prompt: any[] = [
    {
      text: `You are a helpful assistant for a social learning platform.
            Answer the user's question using the provided posts and images as context.
            If the answer isn't in the context, say so honestly. Be concise.
            Posts Context:
      ${context}
      ${imageParts.length > 0 ? `The following ${imageParts.length} image(s) are from the related posts. Analyze them as part of your answer if relevant.` : ""}
      Question: ${question}`,
    },
    ...imageParts,
  ];
  const result = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  });
  const answer = result.text;

  return {
    answer,
    relatedPosts: uniquePosts,
  };
}

export async function summarizePost(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: { id: true, fullName: true, profileImageURL: true },
      },
      media: true,
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });
  if (!post) throw new Error("Post not found");
  const contentText = `Title: ${post.title}\n${post.content ?? ""}`;
  const chunks =
    contentText.length > 1000 ? recursiveChunkText(contentText) : [contentText];

  const allImageUrls = [
    ...(post.media ?? [])
      .filter((m) => m.mediaType === "IMAGE")
      .map((m) => m.url),
  ];
  const imageParts: { inlineData: { data: string; mimeType: string } }[] = [];

  for (const imageUrl of allImageUrls) {
    const image = await fetchImageAsBase64(imageUrl);
    if (image) {
      imageParts.push({
        inlineData: {
          data: image.base64,
          mimeType: image.mimeType,
        },
      });
    }
  }

  const promptParts: any[] = [
    {
      text: `You are a helpful assistant. Summarize the following post.

    Instructions:
    - Summarize the text content in 3-4 sentences
    - If images are provided, describe what they show and how they relate to the post
    - Highlight the key takeaway
    - Skip any videos (not provided)
    - Be concise and informative

        Post Content:
        ${chunks.join("\n\n")}

        ${
          imageParts.length > 0
            ? `${imageParts.length} image(s) are attached. Include them in your summary.`
            : "No images in this post."
        }`,
    },
    ...imageParts,
  ];
  const result = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: promptParts,
  });

  return {
    summary: result.text,
    post,
    imageCount: imageParts.length,
  };
}
