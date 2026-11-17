/**
 * Input Sanitization & Validation Helpers for Onboarding, Profile Dossier, and Inquiries
 */

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_CONTACT_METHODS = ['email', 'phone', 'sms', 'whatsapp', 'text'];
const ALLOWED_URGENCY_TIERS = ['immediate', 'this_week', 'exploratory', 'emergency', 'immediate_week', 'planning', 'urgent_24h', 'general'];
const ALLOWED_BUDGET_RANGES = ['under_2k', '2k_5k', '5k_15k', '15k_plus', 'contingency', 'contingency_only', 'pro_bono'];
const ALLOWED_FORMATS = ['zoom', 'phone', 'in_person'];

/**
 * Removes HTML tags and control characters (preserving tabs/newlines when needed).
 */
function sanitizeText(value, maxLen = 1000, preserveNewlines = false) {
  if (value === undefined || value === null) return '';
  let str = String(value);
  // Strip HTML / script tag markers
  str = str.replace(/<[^>]*>?/gm, '');
  if (preserveNewlines) {
    str = str.replace(/[^\S\r\n]+/g, ' ');
    str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    str = str.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ');
  }
  return str.trim().slice(0, maxLen);
}

/**
 * Formats and validates US or international phone numbers safely.
 * Returns { valid: boolean, value: string }
 */
function sanitizePhone(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return { valid: true, value: '' };
  }
  const raw = String(value).trim();
  const digits = raw.replace(/\D/g, '');

  if (digits.length === 10) {
    const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return { valid: true, value: formatted };
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    const local = digits.slice(1);
    const formatted = `+1 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
    return { valid: true, value: formatted };
  }
  if (/^[+()0-9\s.-]{7,25}$/.test(raw) && digits.length >= 7 && digits.length <= 15) {
    return { valid: true, value: sanitizeText(raw, 25) };
  }
  return { valid: false, value: sanitizeText(raw, 25) };
}

/**
 * Validates & sanitizes US Zip / Postal Codes.
 */
function sanitizeZipCode(value) {
  if (!value) return '';
  const cleaned = String(value).trim().replace(/[^A-Za-z0-9\s-]/g, '').toUpperCase().slice(0, 10);
  return cleaned;
}

/**
 * Validates ISO YYYY-MM-DD incident date string.
 */
function sanitizeDate(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return trimmed;
    }
  }
  return '';
}

/**
 * Ensures enum value belongs to an allowed allowlist.
 */
function sanitizeEnum(value, allowedList, fallback) {
  if (!value || typeof value !== 'string') return fallback;
  const clean = value.trim().toLowerCase();
  return allowedList.includes(clean) ? clean : fallback;
}

/**
 * Validates and sanitizes up to 3 PDF or Image attachments (base64 Data URLs).
 */
function sanitizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  const sanitized = [];

  for (const item of attachments.slice(0, 3)) {
    if (!item || typeof item !== 'object') continue;

    const mimeType = typeof item.mimeType === 'string' ? item.mimeType.trim().toLowerCase() : '';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) continue;

    const dataUrl = typeof item.dataUrl === 'string' ? item.dataUrl.trim() : '';
    // Strictly allow base64 data URI for PDF/Image (explicitly blocks SVG/HTML payloads)
    const dataUrlPattern = /^data:(application\/pdf|image\/(?:jpeg|jpg|png|webp|gif));base64,[A-Za-z0-9+/=]+$/;
    if (!dataUrl || !dataUrlPattern.test(dataUrl)) continue;

    // Limit base64 payload size (~3.5MB per attachment max)
    if (dataUrl.length > 3_600_000) continue;

    const safeName = sanitizeText(item.name || 'document', 120).replace(/[^a-zA-Z0-9._\s-]/g, '_') || 'attachment';
    const numericSize = typeof item.size === 'number' && item.size >= 0 ? Math.min(item.size, 3_000_000) : Math.floor((dataUrl.length * 3) / 4);

    sanitized.push({
      name: safeName,
      size: numericSize,
      mimeType,
      dataUrl,
      uploadedAt: item.uploadedAt ? new Date(item.uploadedAt) : new Date()
    });
  }

  return sanitized;
}

/**
 * Normalizes urgency values consistently while remaining backward compatible.
 */
function normalizeUrgency(urgency) {
  const clean = sanitizeEnum(urgency, ALLOWED_URGENCY_TIERS, 'this_week');
  if (clean === 'emergency' || clean === 'urgent_24h') return 'immediate';
  if (clean === 'immediate_week') return 'this_week';
  if (clean === 'general' || clean === 'planning') return 'exploratory';
  return clean;
}

/**
 * Normalizes preferred contact method.
 */
function normalizeContactMethod(method) {
  const clean = sanitizeEnum(method, ALLOWED_CONTACT_METHODS, 'email');
  if (clean === 'text') return 'sms';
  return clean;
}

/**
 * Normalizes budget expectation range.
 */
function normalizeBudgetRange(budget) {
  const clean = sanitizeEnum(budget, ALLOWED_BUDGET_RANGES, 'contingency');
  if (clean === 'contingency_only') return 'contingency';
  return clean;
}

/**
 * Extracts and sanitizes full onboarding / dossier payload from request body.
 */
function sanitizeOnboardingData(body = {}) {
  const phoneResult = sanitizePhone(body.phone);
  if (!phoneResult.valid) {
    return { error: 'Invalid phone number format. Please enter a valid 10-digit phone number.' };
  }

  const city = sanitizeText(body.city || body.caseProfile?.city, 80);
  const state = sanitizeText(body.state || body.caseProfile?.state, 40);
  const zipCode = sanitizeZipCode(body.zipCode || body.caseProfile?.zipCode);
  const formattedLocation = [city, state].filter(Boolean).join(', ') + (zipCode ? ` ${zipCode}` : '');

  const preferredContactMethod = normalizeContactMethod(
    body.preferredContactMethod || body.caseProfile?.preferredContactMethod
  );
  const smsConsent = Boolean(
    body.smsConsent !== undefined
      ? body.smsConsent
      : (body.smsNotifications !== undefined ? body.smsNotifications : body.caseProfile?.smsNotifications)
  );

  const legalCategory = sanitizeText(body.legalCategory || body.issue || body.caseProfile?.legalCategory, 100) || 'General Practice / Civil Litigation';
  const legalSubCategory = sanitizeText(body.legalSubCategory || body.subCategory || body.caseProfile?.legalSubCategory, 120);
  const urgency = normalizeUrgency(body.urgency || body.caseProfile?.urgency);
  const incidentDate = sanitizeDate(body.incidentDate || body.caseProfile?.incidentDate);
  const opposingParty = sanitizeText(body.opposingParty || body.caseProfile?.opposingParty, 150);
  const budgetRange = normalizeBudgetRange(body.budgetRange || body.caseProfile?.budgetRange);
  const preferredFormat = sanitizeEnum(body.preferredFormat || body.caseProfile?.preferredFormat, ALLOWED_FORMATS, 'zoom');
  const notes = sanitizeText(
    body.notes !== undefined ? body.notes : (body.caseSummary !== undefined ? body.caseSummary : (body.description !== undefined ? body.description : body.caseProfile?.notes)),
    2500,
    true
  );
  const attachments = sanitizeAttachments(body.attachments || body.caseProfile?.attachments);

  return {
    error: null,
    contact: {
      phone: phoneResult.value,
      smsConsent,
      city,
      state,
      zipCode,
      location: formattedLocation.trim() || sanitizeText(body.location, 120) || 'United States',
      preferredContactMethod,
    },
    caseProfile: {
      legalCategory,
      legalSubCategory,
      urgency,
      incidentDate,
      opposingParty,
      budgetRange,
      preferredFormat,
      preferredContactMethod,
      smsNotifications: smsConsent,
      city,
      state,
      zipCode,
      notes,
      attachments,
    }
  };
}

module.exports = {
  sanitizeText,
  sanitizePhone,
  sanitizeZipCode,
  sanitizeDate,
  sanitizeEnum,
  sanitizeAttachments,
  sanitizeOnboardingData,
  normalizeUrgency,
  normalizeContactMethod,
  normalizeBudgetRange,
};

