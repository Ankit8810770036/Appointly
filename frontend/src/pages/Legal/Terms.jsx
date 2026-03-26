import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button/Button';
import './Legal.css';

const Terms = () => {
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
                    <h1>Terms of Service</h1>
                    <p className="last-updated">Last Updated: March 23, 2026</p>

                    <div className="policy-section">
                        <h2>1. Acceptance of Terms</h2>
                        <p>By accessing and using Appointly ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
                    </div>

                    <div className="policy-section">
                        <h2>2. Description of Service</h2>
                        <p>Appointly provides a marketplace for appointment booking between service providers and clients. We facilitate the connection but are not responsible for the quality of services provided by third-party professionals.</p>
                    </div>

                    <div className="policy-section">
                        <h2>3. User Accounts</h2>
                        <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials.</p>
                    </div>

                    <div className="policy-section">
                        <h2>4. Booking and Cancellations</h2>
                        <p>Bookings are subject to provider availability. Cancellation policies are set by individual providers. Appointly reserves the right to charge service fees for platform usage.</p>
                    </div>

                    <div className="policy-section">
                        <h2>5. Limitation of Liability</h2>
                        <p>Appointly shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use the service.</p>
                    </div>

                    <div className="policy-section">
                        <h2>6. Changes to Terms</h2>
                        <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of the updated terms.</p>
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

export default Terms;
