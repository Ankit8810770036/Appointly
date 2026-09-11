import { useLanguage } from '../../../context/LanguageContext';
import { Languages } from 'lucide-react';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
    const { lang, switchLanguage, t } = useLanguage();

    const toggleLanguage = () => {
        const nextLang = lang === 'en' ? 'hi' : 'en';
        switchLanguage(nextLang);
    };

    return (
        <button
            className="lang-switcher glass"
            onClick={toggleLanguage}
            title={t('select_language')}
            aria-label={t('select_language')}
        >
            <Languages size={18} />
            <span className="lang-switcher__label">
                {lang === 'en' ? 'EN' : 'HI'}
            </span>
        </button>
    );
};

export default LanguageSwitcher;
