import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './Legal.css';

export default function Privacy() {
    const navigate = useNavigate();

    return (
        <div className="legal-page">
            <header className="legal-header">
                <div className="container">
                    <div className="legal-logo" onClick={() => navigate('/')}>
                        <span className="logo-mark"></span>
                        <span>Appointly</span>
                    </div>
                    <button className="legal-back-btn" onClick={() => navigate('/')}>
                        <ArrowLeft size={14} /> Back to Home
                    </button>
                </div>
            </header>

            <main className="legal-content">
                <div className="legal-title-wrap">
                    <span className="legal-badge">Legal Documentation</span>
                    <h1>Privacy Policy</h1>
                    <p className="last-updated">Effective Date: October 13, 2026</p>
                </div>

                <div className="policy-card">
                    <div className="policy-section">
                        <h2>1. Introduction</h2>
                        <p>
                            Appointly ("we", "our", or "us") provides a software platform connecting clients seeking services with independent, verified service providers. We respect your personal privacy and are committed to protecting the information you share with us.
                        </p>
                        <p>
                            This Privacy Policy explains what information we collect, how it is used, how it is secured, and your rights regarding your personal data when using our website and services.
                        </p>
                    </div>

                    <div className="policy-section">
                        <h2>2. Information We Collect</h2>
                        <p>We collect information in the following categories:</p>
                        <ul>
                            <li>
                                <strong>Account Registration Information:</strong> Your full name, email address, phone number, role (client or provider), and securely hashed authentication credentials.
                            </li>
                            <li>
                                <strong>Provider Profile &amp; Verification Data:</strong> Government ID, professional certificates, licensing numbers, business address, specialty classifications, and pricing schedules provided during professional onboarding.
                            </li>
                            <li>
                                <strong>Geolocation Data:</strong> Coordinates and postal area info used solely to calculate accurate distance and enforce the 50-kilometer service availability radius.
                            </li>
                            <li>
                                <strong>Appointment &amp; Communication Records:</strong> Appointment timestamps, service selections, notes provided during booking, client reviews, and direct in-app messaging history between clients and providers.
                            </li>
                        </ul>
                    </div>

                    <div className="policy-section">
                        <h2>3. How We Use Your Information</h2>
                        <p>We process your data for clear, legitimate operational purposes:</p>
                        <ul>
                            <li>Facilitating instant appointment scheduling and calendar lockouts.</li>
                            <li>Verifying professional qualifications to maintain community safety.</li>
                            <li>Providing distance-based provider discovery within your local area.</li>
                            <li>Delivering booking confirmation notifications via SMS and email.</li>
                            <li>Investigating complaints, support requests, and service disputes.</li>
                        </ul>
                        <div className="policy-highlight-box">
                            <strong>Data Sale Disclaimer:</strong> Appointly never sells, rents, or monetizes personal customer data to data brokers or third-party advertising networks.
                        </div>
                    </div>

                    <div className="policy-section">
                        <h2>4. Information Sharing &amp; Disclosures</h2>
                        <p>
                            When you schedule an appointment, relevant details (your name, selected service, time slot, and general location) are shared strictly with the assigned provider to enable consultation fulfillment.
                        </p>
                        <p>
                            We only share information with third-party service providers (such as transactional email dispatchers and hosting providers) that adhere to strict contractual confidentiality and data security obligations.
                        </p>
                    </div>

                    <div className="policy-section">
                        <h2>5. Data Security &amp; Retention</h2>
                        <p>
                            We enforce robust technical controls including encryption in transit (HTTPS/TLS 1.3), hashed passwords, role-based database access, and magic-byte file validation for all uploaded verification documents.
                        </p>
                        <p>
                            We retain account records for as long as your account remains active or as required by law for accounting and dispute resolution.
                        </p>
                    </div>

                    <div className="policy-section">
                        <h2>6. Your Privacy Rights</h2>
                        <p>
                            Subject to applicable local regulations, you have the right to inspect, update, or request the deletion of your personal data stored on Appointly.
                        </p>
                        <p>
                            To submit a data access or deletion request, contact support directly through our in-app disputes center or email <code>privacy@appointly.live</code>.
                        </p>
                    </div>

                    <div className="policy-section">
                        <h2>7. Updates to this Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time to reflect operational or regulatory changes. Material updates will be highlighted via notice on our website prior to taking effect.
                        </p>
                    </div>
                </div>
            </main>

            <footer className="legal-footer">
                <div className="container">
                    <span>(c) 2026 Appointly. All rights reserved.</span>
                    <div className="legal-footer-links">
                        <Link to="/terms">Terms of Service</Link>
                        <Link to="/contact">Contact Support</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
