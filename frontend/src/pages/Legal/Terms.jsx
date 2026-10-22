import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './Legal.css';

export default function Terms() {
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
                    <span className="legal-badge">Legal Agreement</span>
                    <h1>Terms of Service</h1>
                    <p className="last-updated">Effective Date: October 13, 2026</p>
                </div>

                <div className="policy-card">
                    <div className="policy-section">
                        <h2>1. Acceptance of Terms</h2>
                        <p>
                            By creating an account, browsing service listings, or scheduling an appointment on Appointly ("the Platform"), you agree to be legally bound by these Terms of Service. If you do not agree to these terms, you must discontinue platform use immediately.
                        </p>
                    </div>

                    <div className="policy-section">
                        <h2>2. Description of the Platform</h2>
                        <p>
                            Appointly operates an online appointment scheduling and provider discovery marketplace. Appointly enables clients to discover independent professionals, compare verified service offerings, and book confirmed consultation time slots.
                        </p>
                        <div className="policy-highlight-box">
                            <strong>Independent Contractor Relationship:</strong> Service providers listed on Appointly are independent professionals and not employees, agents, or joint venturers of Appointly. Each specialist is solely responsible for delivering their professional services with due care and diligence.
                        </div>
                    </div>

                    <div className="policy-section">
                        <h2>3. User Accounts and Eligibility</h2>
                        <p>
                            Users must be at least 18 years of age or possess legal parental authorization to create an account. You agree to provide accurate, current, and complete registration information and keep your account credentials confidential.
                        </p>
                        <p>
                            Provider accounts undergo verification review prior to public listing activation. Appointly reserves the right to suspend or remove any provider profile that fails verification scrutiny or submits misleading documentation.
                        </p>
                    </div>

                    <div className="policy-section">
                        <h2>4. Booking, Holds, and Scheduling Policy</h2>
                        <p>
                            When a client initiates a checkout flow, selected slots are placed on a temporary 5-minute exclusive hold to prevent concurrent booking conflicts. The slot is permanently committed upon final booking submission.
                        </p>
                        <p>
                            Bookings are restricted to providers located within a 50-kilometer radius of the client's selected location to ensure geographic viability of appointments.
                        </p>
                    </div>

                    <div className="policy-section">
                        <h2>5. Pricing and Fees</h2>
                        <p>
                            All service rates displayed on the platform are set directly by the individual provider and are quoted in Indian Rupees (INR) unless explicitly stated otherwise. Providers agree to honor quoted service rates without unannounced surcharges.
                        </p>
                    </div>

                    <div className="policy-section">
                        <h2>6. Cancellations, Rescheduling, and Disputes</h2>
                        <p>
                            Clients and providers can cancel or reschedule appointments within the timeline permitted by the provider's stated cancellation policy.
                        </p>
                        <p>
                            If a service dispute arises (including provider no-shows, significant delays, or unprofessional conduct), clients can file a formal dispute ticket via their dashboard. Appointly administrators review logged complaints and coordinate resolution between both parties.
                        </p>
                    </div>

                    <div className="policy-section">
                        <h2>7. Acceptable Conduct</h2>
                        <p>You agree not to:</p>
                        <ul>
                            <li>Use the platform for fraudulent, illegal, or abusive purposes.</li>
                            <li>Attempt to scrape, reverse engineer, or compromise the platform's security mechanisms.</li>
                            <li>Post false reviews, abusive messages, or fabricated provider credentials.</li>
                            <li>Harass or mistreat other community members through in-app chat or in person.</li>
                        </ul>
                    </div>

                    <div className="policy-section">
                        <h2>8. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by applicable law, Appointly shall not be liable for indirect, incidental, punitive, or consequential damages resulting from your use of the platform or the services performed by third-party providers.
                        </p>
                    </div>

                    <div className="policy-section">
                        <h2>9. Modifications and Contact</h2>
                        <p>
                            We reserve the right to revise these Terms at any time. Updates become effective upon posting to this page. Continued usage of Appointly constitutes acceptance of revised terms.
                        </p>
                        <p>
                            For inquiries concerning these Terms, contact our legal team at <code>legal@appointly.live</code>.
                        </p>
                    </div>
                </div>
            </main>

            <footer className="legal-footer">
                <div className="container">
                    <span>(c) 2026 Appointly. All rights reserved.</span>
                    <div className="legal-footer-links">
                        <Link to="/privacy">Privacy Policy</Link>
                        <Link to="/contact">Contact Support</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
