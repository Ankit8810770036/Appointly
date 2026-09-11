import React from 'react';
import Skeleton from '../Skeleton/Skeleton';
import './LoadingFallback.css';

export default function LoadingFallback() {
  return (
    <div className="page-skeleton-fallback" aria-label="Loading page content">
      <div className="page-skeleton-container">
        {/* Top Hero Skeleton Header */}
        <div className="page-skeleton-hero">
          <Skeleton variant="text" width="140px" height="18px" style={{ marginBottom: '12px' }} />
          <Skeleton variant="text" width="60%" height="36px" style={{ marginBottom: '14px' }} />
          <Skeleton variant="text" width="40%" height="16px" style={{ marginBottom: '24px' }} />
          <div className="page-skeleton-chips-row">
            <Skeleton variant="rect" width="110px" height="36px" style={{ borderRadius: '20px' }} />
            <Skeleton variant="rect" width="130px" height="36px" style={{ borderRadius: '20px' }} />
            <Skeleton variant="rect" width="95px" height="36px" style={{ borderRadius: '20px' }} />
            <Skeleton variant="rect" width="120px" height="36px" style={{ borderRadius: '20px' }} />
          </div>
        </div>

        {/* Content Cards Skeleton Grid */}
        <div className="page-skeleton-grid">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="page-skeleton-card">
              <div className="page-skeleton-card-head">
                <Skeleton variant="circle" width="56px" height="56px" />
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" width="55%" height="18px" style={{ marginBottom: '6px' }} />
                  <Skeleton variant="text" width="35%" height="13px" />
                </div>
              </div>
              <Skeleton variant="text" width="100%" height="14px" style={{ marginTop: '16px', marginBottom: '8px' }} />
              <Skeleton variant="text" width="85%" height="14px" style={{ marginBottom: '20px' }} />
              <div className="page-skeleton-card-footer">
                <Skeleton variant="text" width="80px" height="20px" />
                <Skeleton variant="rect" width="100px" height="36px" style={{ borderRadius: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
