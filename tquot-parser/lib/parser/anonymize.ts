const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const DOC_REGEX = /\b(?:(?:DNI|NIF|NIE)\s*[:#-]?\s*)?(?:[XYZ]\d{7,8}[A-Z]|\d{8}[A-Z])\b/gi;
const CARD_CANDIDATE_REGEX = /\b(?:\d[ -]?){13,19}\b/g;
const PHONE_CANDIDATE_REGEX =
  /(?:\+?(?:34|52|54)[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{2,4}/g;

function digitCount(value: string) {
  return value.replace(/\D/g, "").length;
}

function anonymizeCards(text: string) {
  return text.replace(CARD_CANDIDATE_REGEX, (match) => {
    const digits = digitCount(match);
    return digits >= 13 && digits <= 19 ? "[TARJETA]" : match;
  });
}

function anonymizePhones(text: string) {
  return text.replace(PHONE_CANDIDATE_REGEX, (match) => {
    const digits = digitCount(match);
    return digits >= 9 && digits <= 13 ? "[TELEFONO]" : match;
  });
}

export function anonymizeForClaude(rawInput: string) {
  return anonymizePhones(
    anonymizeCards(rawInput.replace(EMAIL_REGEX, "[EMAIL]").replace(DOC_REGEX, "[DOC]")),
  );
}
