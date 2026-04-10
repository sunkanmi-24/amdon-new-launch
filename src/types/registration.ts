export interface StepOneBio {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  occupation: string;
  photoFile?: File | null;
}

export interface StepTwoLocation {
  state: string;
  lga: string;
  fullAddress: string;
  dealershipName: string;
  dealershipCategory: string;
  yearsInOperation: string;
  dealershipDescription: string;
}

export interface StepThreeContact {
  phone1: string;
  phone2: string;
  email: string;
  nokName: string;
  nokPhone: string;
  referralSource: string;
}

export interface RegistrationData extends StepOneBio, StepTwoLocation, StepThreeContact {}

export interface MemberRecord {
  memberId: string;
  registeredAt: string;
  bio: StepOneBio;
  location: StepTwoLocation;
  contact: StepThreeContact;
  photoUrl?: string;
}
