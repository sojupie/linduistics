import React, { useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { CelestialOrbit } from '../components/orbit/CelestialOrbit';
import {
  OrbitToolbar,
  type OrbitRegister,
  type OrbitModality,
} from '../components/orbit/OrbitToolbar';

export const OrbitRouteComponent: React.FC = () => {
  const search = useSearch({ from: '/orbit' });
  const navigate = useNavigate();

  const register: OrbitRegister = search.register ?? 'vernacular';
  const modality: OrbitModality = search.modality ?? 'phonetic';
  const anchor: string = search.anchor ?? 'sv';

  const [isPaused, setIsPaused] = useState(false);

  const handleRegisterChange = (newReg: OrbitRegister) => {
    navigate({
      to: '/orbit',
      search: (prev) => ({ ...prev, register: newReg }),
    });
  };

  const handleModalityChange = (newMod: OrbitModality) => {
    navigate({
      to: '/orbit',
      search: (prev) => ({ ...prev, modality: newMod }),
    });
  };

  const handleAnchorChange = (newAnchor: string) => {
    navigate({
      to: '/orbit',
      search: (prev) => ({ ...prev, anchor: newAnchor }),
    });
  };

  return (
    <div className="flex flex-col">
      <OrbitToolbar
        register={register}
        modality={modality}
        anchor={anchor}
        isPaused={isPaused}
        onRegisterChange={handleRegisterChange}
        onModalityChange={handleModalityChange}
        onAnchorChange={handleAnchorChange}
        onTogglePause={() => setIsPaused(!isPaused)}
      />
      <CelestialOrbit
        register={register}
        modality={modality}
        anchorCode={anchor}
        isPaused={isPaused}
      />
    </div>
  );
};
