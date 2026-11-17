export const UZBEK_PHONE_REGEX = /^\+998(90|91|93|94|95|97|98|99|33|50|55|71|88)\d{7}$/;

export function isValidUzbekPhone(phone: string): boolean {
  return UZBEK_PHONE_REGEX.test(phone);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password === confirm && confirm.length > 0;
}

export function isValidFullName(name: string): boolean {
  return name.trim().length >= 2;
}

export function isValidNamePart(name: string): boolean {
  return name.trim().length >= 2;
}

export type RegistrationFieldKey =
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'password'
  | 'confirmPassword';
export type RegistrationFieldErrorKey =
  | 'fieldRequired'
  | 'nameTooShort'
  | 'invalidPhone'
  | 'invalidEmail'
  | 'passwordTooShort'
  | 'passwordMismatch';

export type RegistrationFieldErrors = Partial<Record<RegistrationFieldKey, RegistrationFieldErrorKey>>;

export interface RegistrationFormInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateRegistrationFields(input: RegistrationFormInput): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {};

  if (!input.firstName.trim()) {
    errors.firstName = 'fieldRequired';
  } else if (!isValidNamePart(input.firstName)) {
    errors.firstName = 'nameTooShort';
  }

  if (!input.lastName.trim()) {
    errors.lastName = 'fieldRequired';
  } else if (!isValidNamePart(input.lastName)) {
    errors.lastName = 'nameTooShort';
  }

  if (!input.phone.trim() || input.phone === '+998') {
    errors.phone = 'fieldRequired';
  } else if (!isValidUzbekPhone(input.phone)) {
    errors.phone = 'invalidPhone';
  }

  if (!input.email.trim()) {
    errors.email = 'fieldRequired';
  } else if (!isValidEmail(input.email)) {
    errors.email = 'invalidEmail';
  }

  if (!input.password) {
    errors.password = 'fieldRequired';
  } else if (!isValidPassword(input.password)) {
    errors.password = 'passwordTooShort';
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = 'fieldRequired';
  } else if (!passwordsMatch(input.password, input.confirmPassword)) {
    errors.confirmPassword = 'passwordMismatch';
  }

  return errors;
}

export function hasRegistrationFieldErrors(errors: RegistrationFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function isRegistrationInputValid(input: RegistrationFormInput): boolean {
  return !hasRegistrationFieldErrors(validateRegistrationFields(input));
}

export function isRegisterUserInputValid(
  input: Pick<RegistrationFormInput, 'firstName' | 'lastName' | 'phone' | 'email' | 'password'>,
): boolean {
  const errors = validateRegistrationFields({
    ...input,
    confirmPassword: input.password,
  });
  return !errors.firstName && !errors.lastName && !errors.phone && !errors.email && !errors.password;
}

export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits.startsWith('998')) {
    if (digits.length === 0) return '+998';
    return `+998${digits.slice(0, 9)}`;
  }
  return `+${digits.slice(0, 12)}`;
}
