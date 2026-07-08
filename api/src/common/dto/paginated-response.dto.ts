export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export function buildPaginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}