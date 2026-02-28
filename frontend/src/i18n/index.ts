import zhCN from "./zh-CN";
import enUS from "./en-US";
import { create } from "zustand";

const locales: Record<string, any> = { "zh-CN": zhCN, "en-US": enUS };

interface I18nState {
  locale: string;
  setLocale: (l: string) => void;
  t: (key: string) => string;
}

export const useI18n = create<I18nState>((set, get) => ({
  locale: localStorage.getItem("locale") || "en-US",
  setLocale: (l) => { localStorage.setItem("locale", l); set({ locale: l }); },
  t: (key: string) => {
    const parts = key.split(".");
    let obj = locales[get().locale] || locales["zh-CN"];
    for (const p of parts) { obj = obj?.[p]; }
    return typeof obj === "string" ? obj : key;
  },
}));
