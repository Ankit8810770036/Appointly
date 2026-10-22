import React from 'react';
import { Sparkles, Target, Lightbulb, Users, ArrowRight, Github, Twitter, Linkedin, PlayCircle } from 'lucide-react';
import Navbar from '../../components/ui/Navbar/Navbar';
import Button from '../../components/ui/Button/Button';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import VideoGuideModal from '../../components/modals/VideoGuideModal/VideoGuideModal';
import { motion, AnimatePresence } from 'framer-motion';
import './About.css';

const About = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const { t } = useLanguage();
    const [showVideoGuide, setShowVideoGuide] = React.useState(false);
    const navigate = useNavigate();

    const NAV_LINKS = [
        { label: 'Home', to: '/' },
        { label: 'About', to: '/about', active: true },
    ];

    const TEAM_MEMBERS = [
        {
            name: 'Ankit Kumar Singh',
            role: 'Founder & Lead Architect',
            bio: 'Passionate about building dependable software that connects local professionals with clients.',
            initials: 'AK',
            socials: { twitter: '#', linkedin: '#', github: '#' }
        },
        {
            name: 'Priya Verma',
            role: 'Operations Head',
            bio: 'Ensuring seamless service delivery and professional vetting for a trusted community experience.',
            initials: 'PV',
            socials: { linkedin: '#' }
        },
        {
            name: 'Rahul Gupta',
            role: 'Product Designer',
            bio: 'Crafting clean, accessible interfaces that make appointment scheduling straightforward.',
            initials: 'RG',
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
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowVideoGuide(true)}
                                style={{ gap: '6px' }}
                            >
                                <PlayCircle size={15} /> {t('instruction_video')}
                            </Button>
                            <div
                                className="navbar__user-profile"
                                onClick={() => {
                                    const r = user?.role?.toUpperCase();
                                    navigate(r === 'PROVIDER' ? '/dashboard/provider' : r === 'ADMIN' ? '/dashboard/admin' : '/dashboard/client');
                                }}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                            >
                                <div className="sidebar__avatar" style={{ width: '38px', height: '38px', fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--panel-2)', color: 'var(--amber)', fontWeight: '600' }}>
                                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AC'}
                                </div>
                                <span className="text-bold" style={{ fontSize: '0.9rem' }}>{user?.name ? user.name.split(' ')[0] : 'Account'}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => logout()}>Logout</Button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowVideoGuide(true)}
                                style={{ gap: '6px' }}
                            >
                                <PlayCircle size={15} /> {t('instruction_video')}
                            </Button>
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
                                <h3>Reliable Experience</h3>
                                <p>From transparent availability to verified professionals, we prioritize clarity and dependability for both clients and providers.</p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Team Section */}
                <section className="about-section team-section">
                    <div className="about-container">
                        <div className="section-header">
                            <h2 className="section-title">Meet the Team</h2>
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
                                    <div className="member-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.1rem', color: 'var(--amber)', background: 'var(--panel-2)', borderRadius: '50%' }}>{member.initials}</div>
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
                            <h2>Ready to schedule your appointment?</h2>
                            <p>Browse verified providers and schedule your consultation directly online.</p>
                            <div className="cta-actions">
                                <Button variant="primary" size="lg" onClick={() => navigate('/signup')}>Get Started</Button>
                                <Button variant="ghost" size="lg" onClick={() => navigate('/#providers')}>Explore Services <ArrowRight size={18} /></Button>
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

            <AnimatePresence>
                {showVideoGuide && (
                    <VideoGuideModal onClose={() => setShowVideoGuide(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default About;
