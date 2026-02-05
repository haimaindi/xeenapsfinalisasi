import React from 'react';
import { StandardGridContainer } from './TableComponents';
import { BRAND_ASSETS } from '../../assets';

/**
 * GlobalSyncOverlay
 * Fullscreen lock with backdrop-blur and gold spinner for integrity protocols.
 */
export const GlobalSyncOverlay: React.FC<{ message?: string }> = ({ message = "Synchronizing with Private Cloud..." }) => (
  <div className="fixed inset-0 z-[10000] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
    <div className="w-24 h-24 mb-8 relative">
      <div className="absolute inset-0 border-4 border-[#004A74]/10 rounded-full" />
      <div className="absolute inset-0 border-4 border-[#FED400] border-t-transparent rounded-full animate-spin" />
      <img src={BRAND_ASSETS.LOGO_ICON} className="absolute inset-0 m-auto w-10 h-10 animate-pulse" alt="Syncing" />
    </div>
    <div className="text-center space-y-2">
      <h3 className="text-xl font-black text-[#004A74] uppercase tracking-tighter">{message}</h3>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] animate-pulse">Integrity Protocol Active • Please Wait</p>
    </div>
  </div>
);

/**
 * GlobalAppLoader
 * Mirrors the App.tsx main structure (Sidebar + Header + Content Area)
 */
export const GlobalAppLoader: React.FC = () => (
  <div className="w-full h-full p-1 space-y-8 animate-in fade-in duration-500 overflow-hidden">
    {/* Top bar skeleton (Search & Add) */}
    <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
      <div className="h-12 w-full lg:max-w-md skeleton rounded-2xl" />
      <div className="h-12 w-full lg:w-48 skeleton rounded-2xl" />
    </div>
    
    {/* Filters skeleton */}
    <div className="flex gap-2 overflow-hidden shrink-0">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-9 w-24 skeleton rounded-full shrink-0" />
      ))}
    </div>
    
    {/* Content grid skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-60 w-full skeleton rounded-[2.5rem]" />
      ))}
    </div>
    
    {/* Bottom large area skeleton */}
    <div className="hidden lg:block h-32 w-full skeleton rounded-[2.5rem]" />
  </div>
);

/**
 * TableSkeletonRows
 * Mirroring the exact column distribution of StandardTableWrapper
 * Updated: Using .skeleton class for branded loading consistency.
 */
export const TableSkeletonRows: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <>
    {[...Array(count)].map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td className="px-6 py-4"><div className="h-4 w-4 skeleton rounded mx-auto" /></td>
        <td className="px-6 py-4"><div className="h-4 w-64 skeleton rounded-lg" /></td>
        <td className="px-6 py-4"><div className="h-4 w-32 skeleton rounded-lg mx-auto" /></td>
        <td className="px-6 py-4"><div className="h-4 w-32 skeleton rounded-lg mx-auto" /></td>
        <td className="px-6 py-4"><div className="h-4 w-12 skeleton rounded-lg mx-auto" /></td>
        <td className="px-6 py-4"><div className="h-4 w-24 skeleton rounded-lg mx-auto" /></td>
        <td className="px-6 py-4"><div className="h-4 w-24 skeleton rounded-lg mx-auto" /></td>
        <td className="px-6 py-4"><div className="h-4 w-24 skeleton rounded-lg mx-auto" /></td>
        <td className="px-6 py-4"><div className="h-4 w-32 skeleton rounded-lg mx-auto" /></td>
      </tr>
    ))}
  </>
);

/**
 * CardGridSkeleton
 * Mirroring the structure of StandardItemCard inside StandardGridContainer
 */
export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <StandardGridContainer>
    {[...Array(count)].map((_, i) => (
      <div key={i} className="h-48 w-full skeleton rounded-3xl" />
    ))}
  </StandardGridContainer>
);