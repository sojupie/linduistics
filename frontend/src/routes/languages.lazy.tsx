import React from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { LanguageOverview, type LanguageSort } from '../components/languages/LanguageOverview';

export const LanguagesRouteComponent: React.FC = () => {
  const search = useSearch({ strict: false }) as { sort?: LanguageSort };
  const navigate = useNavigate();

  const sort = search.sort;

  const handleSortChange = (newSort: LanguageSort) => {
    navigate({
      to: '/languages',
      search: (prev) => ({ ...prev, sort: newSort }),
    });
  };

  return <LanguageOverview sort={sort} onSortChange={handleSortChange} />;
};

export const RegisterRouteComponent = LanguagesRouteComponent;
