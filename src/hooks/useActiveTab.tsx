import { useLocation } from 'react-router-dom';

export const useActiveTab = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return { isActive };
};