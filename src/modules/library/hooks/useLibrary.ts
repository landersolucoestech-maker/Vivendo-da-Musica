import { useQuery } from "@tanstack/react-query";
import { libraryService } from "@/modules/library/services/library.service";

export const useLibraryItems = () => useQuery({ queryKey: ['library-items', 'mock'], queryFn: () => libraryService.listItems() });
export const useLibraryTypes = () => useQuery({ queryKey: ['library-types', 'mock'], queryFn: () => libraryService.listTypes() });
export const useLibraryCategories = () => useQuery({ queryKey: ['library-categories', 'mock'], queryFn: () => libraryService.listCategories() });
