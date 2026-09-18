import React from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { KinshipRegister, type RegisterSort } from '../components/register/KinshipRegister';

export const RegisterRouteComponent: React.FC = () => {
  const search = useSearch({ from: '/register' });
  const navigate = useNavigate();

  const sort = search.sort;

  const handleSortChange = (newSort: RegisterSort) => {
    navigate({
      to: '/register',
      search: (prev) => ({ ...prev, sort: newSort }),
    });
  };

  return <KinshipRegister sort={sort} onSortChange={handleSortChange} />;
};
