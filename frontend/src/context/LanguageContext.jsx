import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(localStorage.getItem('appointly_lang') || 'en');

    useEffect(() => {
        localStorage.setItem('appointly_lang', lang);
        document.documentElement.lang = lang;
    }, [lang]);

    const t = (key, variables = {}) => {
        let text = translations[lang][key] || translations['en'][key] || key;

        // Replace variables like {cities}
        Object.keys(variables).forEach(v => {
            text = text.replace(`{${v}}`, variables[v]);
        });

        return text;
    };

    const switchLanguage = (newLang) => {
        if (translations[newLang]) {
            setLang(newLang);
        }
    };

    return (
        <LanguageContext.Provider value={{ lang, t, switchLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
