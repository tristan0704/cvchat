"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
    dictionaries,
    normalizeLanguage,
    type AppDictionary,
    type AppLanguage,
} from "@/lib/i18n/dictionaries";

type I18nContextValue = {
    language: AppLanguage;
    dictionary: AppDictionary;
};

const I18nContext = createContext<I18nContextValue>({
    language: "de",
    dictionary: dictionaries.de,
});

export function I18nProvider({
    children,
    language,
}: {
    children: ReactNode;
    language: string;
}) {
    const normalizedLanguage = normalizeLanguage(language);

    return (
        <I18nContext.Provider
            value={{
                language: normalizedLanguage,
                dictionary: dictionaries[normalizedLanguage],
            }}
        >
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    return useContext(I18nContext);
}
