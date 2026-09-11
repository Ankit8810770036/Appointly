import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, Globe } from 'lucide-react';
import Navbar from '../../components/ui/Navbar/Navbar';
import Button from '../../components/ui/Button/Button';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../utils/toast';
import './Contact.css';

const Contact = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [formState, setFormState] = useState({
        name: user?.name || '',
        email: user?.email || '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        toast.success("Message sent successfully! We'll get back to you soon.");
        setFormState({ ...formState, subject: '', message: '' });
        setIsSubmitting(false);
    };

    const NAV_LINKS = [
        { label: 'Home', to: '/' },
        { label: 'About', to: '/about' },
    ];

    const contactInfo = [
        {
            icon: <Mail className="contact-icon" />,
            title: "Email Us",
            value: "support@appointly.com",
            sub: "Online 24/7"
        },
        {
            icon: <Phone className="contact-icon" />,
            title: "Call Us",
            value: "+91 88107 70036",
            sub: "Mon - Fri, 9am - 6pm"
        },
        {
            icon: <MapPin className="contact-icon" />,
            title: "Visit Us",
            value: "123 Business Hub, New Delhi",
            sub: "India"
        }
    ];

    return (
        <div className="contact-page">
            <Navbar
                logo={<span className="home-logo">Appointly</span>}
                links={NAV_LINKS}
                actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {isAuthenticated ? (
                            <div className="navbar__user-profile" onClick={() => navigate(user?.role?.toLowerCase() === 'provider' ? '/dashboard/provider' : '/dashboard/client')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="sidebar__avatar" style={{ width: '38px', height: '38px', fontSize: '1.2rem', margin: 0 }}>
                                    {user?.role?.toLowerCase() === 'provider' ? '🧑‍💼' : '🙋'}
                                </div>
                                <span className="text-bold" style={{ fontSize: '0.9rem' }}>{user?.name ? user.name.split(' ')[0] : 'Account'}</span>
                            </div>
                        ) : (
                            <>
                                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Log in</Button>
                                <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>Sign up</Button>
                            </>
                        )}
                    </div>
                }
            />

            <main className="contact-content">
                <section className="contact-hero">
                    <div className="contact-mesh"></div>
                    <div className="contact-container">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="contact-header"
                        >
                            <span className="contact-badge">GET IN TOUCH</span>
                            <h1>How can we <span className="text-gradient">help</span> you?</h1>
                            <p>Have a question or feedback? We'd love to hear from you. Our team is typically very responsive.</p>
                        </motion.div>
                    </div>
                </section>

                <section className="contact-section">
                    <div className="contact-container">
                        <div className="contact-grid">
                            {/* Contact Form */}
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="contact-form-card glass"
                            >
                                <div className="card-header">
                                    <MessageSquare size={20} className="text-primary" />
                                    <h2>Send us a Message</h2>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="John Doe"
                                                value={formState.name}
                                                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                placeholder="john@example.com"
                                                value={formState.email}
                                                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Subject</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="How can we help?"
                                            value={formState.subject}
                                            onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Message</label>
                                        <textarea
                                            rows="5"
                                            required
                                            placeholder="Write your message here..."
                                            value={formState.message}
                                            onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                                        ></textarea>
                                    </div>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="lg"
                                        style={{ width: '100%', marginTop: '1rem' }}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            "Sending..."
                                        ) : (
                                            <>
                                                Send Message <Send size={18} style={{ marginLeft: '8px' }} />
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </motion.div>

                            {/* Contact Details */}
                            <div className="contact-details">
                                <motion.div
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="info-grid"
                                >
                                    {contactInfo.map((info, idx) => (
                                        <div key={idx} className="info-card glass">
                                            <div className="info-icon-box">{info.icon}</div>
                                            <div className="info-content">
                                                <h4>{info.title}</h4>
                                                <p className="info-value">{info.value}</p>
                                                <p className="info-sub">{info.sub}</p>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="support-card glass"
                                >
                                    <div className="support-header">
                                        <Clock size={20} className="text-primary" />
                                        <h4>Support Hours</h4>
                                    </div>
                                    <div className="support-hours">
                                        <div className="hour-item"><span>Monday - Friday</span> <span>9:00 AM - 6:00 PM</span></div>
                                        <div className="hour-item"><span>Saturday</span> <span>10:00 AM - 2:00 PM</span></div>
                                        <div className="hour-item"><span>Sunday</span> <span className="text-dim">Closed</span></div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="contact-footer">
                <div className="contact-container">
                    <div className="footer-flex">
                        <span className="home-logo">Appointly</span>
                        <p>© 2026 Appointly. All rights reserved.</p>
                        <div className="footer-links">
                            <a href="/terms">Terms</a>
                            <a href="/privacy">Privacy</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Contact;
