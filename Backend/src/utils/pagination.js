/**
 * Parses pagination query parameters.
 * @param {object} query - Express req.query
 * @param {number} defaultLimit - default limit if not specified
 * @returns {object} { cursor: string|undefined, limit: number }
 */
const parsePagination = (query, defaultLimit = 12) => {
  const cursor = query.cursor ? String(query.cursor) : undefined;
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || defaultLimit));
  return { cursor, limit };
};

/**
 * Prepares paginated database results.
 * For cursor-based pagination to work, we fetch limit + 1 items.
 * If we get limit + 1 items, we know hasMore = true and we pop the last item.
 * @param {Array} items - List of items fetched
 * @param {number} limit - Requested limit
 * @param {function} cursorExtractor - function to extract cursor value from item (defaults to returning item.id)
 * @returns {object} { data: Array, pagination: { nextCursor: string|null, hasMore: boolean } }
 */
const paginateResults = (items, limit, cursorExtractor = (item) => item.id) => {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore && data.length > 0 ? cursorExtractor(data[data.length - 1]) : null;

  return {
    data,
    pagination: {
      nextCursor,
      hasMore,
    },
  };
};

module.exports = {
  parsePagination,
  paginateResults,
};
