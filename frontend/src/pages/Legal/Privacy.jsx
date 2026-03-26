import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button/Button';
import './Legal.css';

const Privacy = () => {
    const navigate = useNavigate();

    return (
        <div className="legal-page">
            <header className="legal-header">
                <div className="container">
                    <span className="home-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Appointly</span>
                    <Button variant="ghost" onClick={() => navigate('/')}>Back to Home</Button>
                </div>
            </header>

            <main className="legal-content container">
                <section className="animate-fade-in">
                    <h1>Privacy Policy</h1>
                    <p className="last-updated">Last Updated: March 23, 2026</p>

                    <div className="policy-section">
                        <h2>1. Information We Collect</h2>
                        <p>We collect personal information that you provide to us, including your name, email address, phone number, and location. We also collect usage data when you interact with our platform.</p>
                    </div>

                    <div className="policy-section">
                        <h2>2. How We Use Your Information</h2>
                        <p>We use your information to facilitate bookings, communicate with you about your appointments, and improve our services. We do not sell your personal data to third parties.</p>
                    </div>

                    <div className="policy-section">
                        <h2>3. Data Protection</h2>
                        <p>We implement industry-standard security measures to protect your personal data from unauthorized access, disclosure, or alteration.</p>
                    </div>

                    <div className="policy-section">
                        <h2>4. Cookies and Tracking</h2>
                        <p>We use cookies to enhance your experience and analyze how our service is used. You can manage your cookie preferences through your browser settings.</p>
                    </div>

                    <div className="policy-section">
                        <h2>5. Your Rights</h2>
                        <p>You have the right to access, correct, or delete your personal information. Please contact our support team for any privacy-related requests.</p>
                    </div>

                    <div className="policy-section">
                        <h2>6. Third-Party Services</h2>
                        <p>Our service may contain links to third-party websites. We are not responsible for the privacy practices of external sites.</p>
                    </div>
                </section>
            </main>

            <footer className="legal-footer">
                <div className="container">
                    <p>© 2026 Appointly. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Privacy;
