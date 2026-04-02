import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Languages, Globe, Check } from "lucide-react";

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
];

interface LanguageSelectorProps {
  type: "ui" | "response";
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

export function LanguageSelector({ type, selectedLanguage, onLanguageChange }: LanguageSelectorProps) {
  const { t } = useTranslation();
  const selectedLang = languages.find(lang => lang.code === selectedLanguage) || languages[0];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {type === "ui" ? (
            <Globe className="h-4 w-4" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
          <span className="text-xs">{selectedLang.flag}</span>
          <span className="hidden sm:inline text-sm">{selectedLang.nativeName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-popover border-border" align="end">
        <DropdownMenuLabel className="flex items-center gap-2">
          {type === "ui" ? (
            <>
              <Globe className="h-4 w-4" />
              {t('language.interfaceLanguage')}
            </>
          ) : (
            <>
              <Languages className="h-4 w-4" />
              {t('language.responseLanguage')}
            </>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className="flex items-center justify-between cursor-pointer"
            onClick={() => onLanguageChange(language.code)}
          >
            <div className="flex items-center gap-2">
              <span>{language.flag}</span>
              <span>{language.nativeName}</span>
            </div>
            {selectedLanguage === language.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="p-2">
          <Badge variant="secondary" className="text-xs">
            {t('language.autoDetect')}: {type === "response" ? t('language.on') : t('language.off')}
          </Badge>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}