import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target, Lightbulb, Users, ArrowRight, Github, Twitter, Linkedin } from 'lucide-react';
import Navbar from '../../components/ui/Navbar/Navbar';
import Button from '../../components/ui/Button/Button';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './About.css';

const About = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    const NAV_LINKS = [
        { label: 'Home', to: '/' },
        { label: 'About', to: '/about', active: true },
        { label: 'Explore', href: '/#providers-list' },
    ];

    const TEAM_MEMBERS = [
        {
            name: 'Ankit Kumar Singh',
            role: 'Founder & Lead Architect',
            bio: 'A visionary developer passionate about building tools that bridge the gap between local professionals and digital convenience.',
            avatar: '🧑‍💻',
            socials: { twitter: '#', linkedin: '#', github: '#' }
        },
        {
            name: 'Priya Verma',
            role: 'Operations Head',
            bio: 'Ensuring seamless service delivery and professional vetting for a trusted community experience.',
            avatar: '👩🏽‍💼',
            socials: { linkedin: '#' }
        },
        {
            name: 'Rahul Gupta',
            role: 'Product Designer',
            bio: 'Crafting the premium, intuitive interfaces that make Appointly a joy to use.',
            avatar: '🎨',
            socials: { github: '#' }
        }
    ];

    return (
        <div className="about-page">
            <Navbar
                logo={<span className="home-logo">Appointly</span>}
                links={NAV_LINKS}
                actions={
                    isAuthenticated ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <ThemeToggle />
                            <div className="navbar__user-profile" onClick={() => navigate(user.role === 'provider' ? '/dashboard/provider' : '/dashboard/client')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="sidebar__avatar" style={{ width: '38px', height: '38px', fontSize: '1.2rem', margin: 0 }}>
                                    {user.role === 'provider' ? '🧑‍💼' : '🙋'}
                                </div>
                                <span className="text-bold" style={{ fontSize: '0.9rem' }}>{user.name.split(' ')[0]}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => logout()}>Logout</Button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <ThemeToggle />
                            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Log in</Button>
                            <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>Sign up free</Button>
                        </div>
                    )
                }
            />

            <main className="about-content">
                {/* Hero / The Idea */}
                <section className="about-hero">
                    <div className="hero-mesh"></div>
                    <motion.div
                        className="about-container"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="about-badge">
                            <Lightbulb size={14} /> <span>The Vision</span>
                        </div>
                        <h1 className="about-title">Revolutionizing how you <span className="text-gradient">connect</span> with services.</h1>
                        <p className="about-subtitle">
                            Appointly was born from a simple observation: finding and booking local professionals should be as seamless as ordering a ride or a meal. We're here to eliminate the friction from your schedule.
                        </p>
                    </motion.div>
                </section>

                {/* The Aim */}
                <section className="about-section">
                    <div className="about-container">
                        <div className="about-grid">
                            <motion.div
                                className="about-card glass"
                                whileHover={{ y: -5 }}
                            >
                                <div className="card-icon"><Target className="text-primary" /></div>
                                <h3>Our Aim</h3>
                                <p>To empower small businesses and independent professionals by providing them with enterprise-grade scheduling tools that are accessible to everyone.</p>
                            </motion.div>
                            <motion.div
                                className="about-card glass"
                                whileHover={{ y: -5 }}
                            >
                                <div className="card-icon"><Users className="text-primary" /></div>
                                <h3>Community Focused</h3>
                                <p>We believe in the power of local connection. Our platform is designed to strengthen local economies by making it easier to support neighborhood talent.</p>
                            </motion.div>
                            <motion.div
                                className="about-card glass"
                                whileHover={{ y: -5 }}
                            >
                                <div className="card-icon"><Sparkles className="text-primary" /></div>
                                <h3>Premium Experience</h3>
                                <p>From glassmorphic interfaces to lightning-fast bookings, we never compromise on the quality of the user experience for both clients and providers.</p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Team Section */}
                <section className="about-section team-section">
                    <div className="about-container">
                        <div className="section-header">
                            <h2 className="section-title">Meet the <span className="text-gradient">Team</span></h2>
                            <p className="section-sub">Bringing together expertise in design, engineering, and operations.</p>
                        </div>

                        <div className="team-grid">
                            {TEAM_MEMBERS.map((member, idx) => (
                                <motion.div
                                    key={member.name}
                                    className="team-card glass"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <div className="member-avatar">{member.avatar}</div>
                                    <h4 className="member-name">{member.name}</h4>
                                    <p className="member-role">{member.role}</p>
                                    <p className="member-bio">{member.bio}</p>
                                    <div className="member-socials">
                                        {member.socials.twitter && <Twitter size={16} />}
                                        {member.socials.linkedin && <Linkedin size={16} />}
                                        {member.socials.github && <Github size={16} />}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="about-cta">
                    <div className="about-container">
                        <div className="cta-card glass">
                            <h2>Ready to experience the future of <span className="text-gradient">booking</span>?</h2>
                            <p>Join thousands of users who have simplified their professional lives.</p>
                            <div className="cta-actions">
                                <Button variant="primary" size="lg" onClick={() => navigate('/signup')}>Get Started Free</Button>
                                <Button variant="ghost" size="lg" onClick={() => navigate('/#providers-list')}>Explore Services <ArrowRight size={18} /></Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="simple-footer">
                <div className="about-container">
                    <p>&copy; 2026 Appointly. Dedicated to professional excellence.</p>
                </div>
            </footer>
        </div>
    );
};

export default About;
