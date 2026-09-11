import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import Navbar from '../../components/ui/Navbar/Navbar';
import Button from '../../components/ui/Button/Button';
import './NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <Navbar
        logo={<span className="home-logo">Appointly</span>}
        links={[
          { label: 'Home', to: '/' },
          { label: 'About', to: '/about' },
          { label: 'Contact', to: '/contact' },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={() => navigate('/')}>
            Explore Providers
          </Button>
        }
      />

      <main className="not-found-container">
        <motion.div
          className="not-found-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <span className="not-found-badge">Page Not Found</span>
          <div className="not-found-code">404</div>
          <h1 className="not-found-title">Oops! You seem a bit lost</h1>
          <p className="not-found-desc">
            The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
          </p>

          <div className="not-found-actions">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate(-1)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <ArrowLeft size={16} /> Go Back
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Home size={16} /> Return to Home
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
