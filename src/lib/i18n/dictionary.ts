export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Flat key-value dictionary for the public intake form — the one page a
 * requester (not staff) interacts with directly. Kept intentionally simple
 * (no ICU/plural rules) since it covers a single form, not the whole app.
 */
export interface Dictionary {
  languageLabel: string;
  languageEnglish: string;
  languageSpanish: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailOptional: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phoneOptional: string;
  phonePlaceholder: string;
  preferredContactLabel: string;
  preferredContactEither: string;
  preferredContactEmail: string;
  preferredContactPhone: string;
  zipLabel: string;
  zipOptional: string;
  zipPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  messageHint: string;
  consentLabel: string;
  emergencyNotice: string;
  submitButton: string;
  submittingButton: string;
  successTitle: string;
  successBody: string;
  submitAnother: string;
  staffLinkPrefix: string;
  staffLinkCta: string;
  genericError: string;
  zodNameRequired: string;
  zodEmailInvalid: string;
  zodMessageTooShort: string;
  zodConsentRequired: string;
}

export const DICTIONARIES: Record<Locale, Dictionary> = {
  en: {
    languageLabel: "Language",
    languageEnglish: "English",
    languageSpanish: "Español",
    nameLabel: "Your name",
    namePlaceholder: "How should we address you?",
    emailLabel: "Email",
    emailOptional: "(optional)",
    emailPlaceholder: "you@example.com",
    phoneLabel: "Phone",
    phoneOptional: "(optional)",
    phonePlaceholder: "(555) 555-5555",
    preferredContactLabel: "Preferred contact",
    preferredContactEither: "Either is fine",
    preferredContactEmail: "Email",
    preferredContactPhone: "Phone",
    zipLabel: "ZIP code",
    zipOptional: "(optional)",
    zipPlaceholder: "Helps us find local resources",
    messageLabel: "How can we help?",
    messagePlaceholder:
      "Tell us what you need in your own words. Please avoid sharing more sensitive details than necessary.",
    messageHint: "Please don't include sensitive information like full financial account numbers.",
    consentLabel:
      "I consent to a staff member reviewing this request to help me. I understand this is not an emergency service and does not provide legal or medical advice.",
    emergencyNotice: "In an emergency, call 911 instead of using this form.",
    submitButton: "Submit request",
    submittingButton: "Submitting…",
    successTitle: "We received your request",
    successBody:
      "A member of our team will review your request and follow up with you. If your situation is an emergency, please call 911 or your local emergency line now.",
    submitAnother: "Submit another request",
    staffLinkPrefix: "Are you staff?",
    staffLinkCta: "Go to the dashboard",
    genericError: "Something went wrong. Please try again.",
    zodNameRequired: "Please share a name we can use.",
    zodEmailInvalid: "Enter a valid email.",
    zodMessageTooShort: "Tell us a little more so we can route your request.",
    zodConsentRequired: "We need your consent to have a staff member review this request.",
  },
  es: {
    languageLabel: "Idioma",
    languageEnglish: "English",
    languageSpanish: "Español",
    nameLabel: "Tu nombre",
    namePlaceholder: "¿Cómo debemos llamarte?",
    emailLabel: "Correo electrónico",
    emailOptional: "(opcional)",
    emailPlaceholder: "tucorreo@ejemplo.com",
    phoneLabel: "Teléfono",
    phoneOptional: "(opcional)",
    phonePlaceholder: "(555) 555-5555",
    preferredContactLabel: "Forma de contacto preferida",
    preferredContactEither: "Cualquiera está bien",
    preferredContactEmail: "Correo electrónico",
    preferredContactPhone: "Teléfono",
    zipLabel: "Código postal",
    zipOptional: "(opcional)",
    zipPlaceholder: "Nos ayuda a encontrar recursos locales",
    messageLabel: "¿Cómo podemos ayudarte?",
    messagePlaceholder:
      "Cuéntanos qué necesitas con tus propias palabras. Evita compartir más datos sensibles de los necesarios.",
    messageHint: "Por favor no incluyas información sensible como números de cuenta completos.",
    consentLabel:
      "Doy mi consentimiento para que un miembro del personal revise esta solicitud y me ayude. Entiendo que esto no es un servicio de emergencia y no ofrece asesoría legal ni médica.",
    emergencyNotice: "En caso de emergencia, llama al 911 en lugar de usar este formulario.",
    submitButton: "Enviar solicitud",
    submittingButton: "Enviando…",
    successTitle: "Recibimos tu solicitud",
    successBody:
      "Un miembro de nuestro equipo revisará tu solicitud y se pondrá en contacto contigo. Si tu situación es una emergencia, llama al 911 o a tu línea de emergencia local ahora mismo.",
    submitAnother: "Enviar otra solicitud",
    staffLinkPrefix: "¿Eres parte del personal?",
    staffLinkCta: "Ir al panel",
    genericError: "Algo salió mal. Inténtalo de nuevo.",
    zodNameRequired: "Cuéntanos un nombre que podamos usar.",
    zodEmailInvalid: "Ingresa un correo electrónico válido.",
    zodMessageTooShort: "Cuéntanos un poco más para poder atender tu solicitud.",
    zodConsentRequired: "Necesitamos tu consentimiento para que el personal revise esta solicitud.",
  },
};
