export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationLinks {
  self: string;
  first: string;
  last: string;
  next?: string;
  prev?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export function buildPaginationMeta(total: number, page: number, pageSize: number): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize);
  return {
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function buildPaginationLinks(
  baseUrl: string,
  page: number,
  pageSize: number,
  totalPages: number,
): PaginationLinks {
  const buildUrl = (p: number) => `${baseUrl}?page=${p}&pageSize=${pageSize}`;

  const links: PaginationLinks = {
    self: buildUrl(page),
    first: buildUrl(1),
    last: buildUrl(totalPages || 1),
  };

  if (page < totalPages) {
    links.next = buildUrl(page + 1);
  }

  if (page > 1) {
    links.prev = buildUrl(page - 1);
  }

  return links;
}
