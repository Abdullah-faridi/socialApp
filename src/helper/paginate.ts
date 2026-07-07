export function paginateFeed<T>(
  feed: T[],
  page: number = 1,
  limit: number = 10
) {
  const skip = (page - 1) * limit
  const paginated = feed.slice(skip, skip + limit)

  return {
    feed: paginated,
    total: feed.length,
    page,
    totalPages: Math.ceil(feed.length / limit),
    hasMore: page * limit < feed.length,
  }
}