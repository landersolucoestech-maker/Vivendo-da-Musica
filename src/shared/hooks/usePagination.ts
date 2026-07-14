import { useCallback, useEffect, useMemo, useState } from "react";

interface UsePaginationOptions<T> {
  items: T[];
  pageSize: number;
  initialPage?: number;
}

interface UsePaginationResult<T> {
  paginatedItems: T[];
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToPage: (page: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

/**
 * Generic pagination over an already-filtered/sorted array. Clamps the
 * current page whenever `items` or `pageSize` shrink it out of range (e.g.
 * a filter reduces the result set while the user is on page 5), so callers
 * never have to guard against an invalid page themselves.
 *
 * `goToPage`/`setCurrentPage` are memoized against `totalPages` (not
 * `currentPage`), so their identity stays stable across page navigation —
 * important if a caller puts `setCurrentPage` in a `useEffect` dependency
 * array (e.g. to reset to page 1 on filter change): without this, a new
 * function reference on every render would re-fire that effect after every
 * click and silently snap the page back to 1.
 */
export function usePagination<T>({
  items,
  pageSize,
  initialPage = 1,
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [requestedPage, setRequestedPage] = useState(initialPage);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  useEffect(() => {
    setRequestedPage((page) => Math.min(Math.max(1, page), totalPages));
  }, [totalPages, pageSize, totalItems]);

  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  const goToPage = useCallback(
    (page: number) => {
      setRequestedPage(Math.min(Math.max(1, page), totalPages));
    },
    [totalPages]
  );

  const goToNextPage = useCallback(() => {
    setRequestedPage((page) => Math.min(page + 1, totalPages));
  }, [totalPages]);

  const goToPreviousPage = useCallback(() => {
    setRequestedPage((page) => Math.max(page - 1, 1));
  }, []);

  return {
    paginatedItems,
    currentPage,
    totalPages,
    setCurrentPage: goToPage,
    goToNextPage,
    goToPreviousPage,
    goToPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    startIndex,
    endIndex,
    totalItems,
  };
}
