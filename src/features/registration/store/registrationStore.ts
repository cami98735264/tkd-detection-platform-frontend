import { create } from "zustand";

export interface EmergencyContactData {
  full_name: string;
  relationship: string;
  documento: string;
  email: string;
  address: string;
}

export interface Step1Data {
  first_name: string;
  last_name: string;
  documento: string;
  birth_date: string;
  gender: string;
  email: string;
  phone: string;
  blood_type: string;
  medical_certificate: File | null;
  current_weight: string;
  current_belt: number | null;
}

export interface Step3Data {
  consent_data_accuracy: boolean;
  consent_data_policy: boolean;
  consent_terms: boolean;
  consent_media_auth: boolean;
  submitted_at: string | null;
}

interface RegistrationState {
  step1: Step1Data;
  step2: EmergencyContactData | null;
  step3: Step3Data;
  setStep1: (data: Partial<Step1Data>) => void;
  setStep2: (data: EmergencyContactData) => void;
  setStep3: (data: Partial<Step3Data>) => void;
  reset: () => void;
}

const initial: RegistrationState = {
  step1: {
    first_name: "",
    last_name: "",
    documento: "",
    birth_date: "",
    gender: "",
    email: "",
    phone: "",
    blood_type: "",
    medical_certificate: null,
    current_weight: "",
    current_belt: null,
  },
  step2: null,
  step3: {
    consent_data_accuracy: false,
    consent_data_policy: false,
    consent_terms: false,
    consent_media_auth: false,
    submitted_at: null,
  },
};

export const useRegistrationStore = create<RegistrationState>()((set) => ({
  ...initial,
  setStep1: (data) =>
    set((s) => ({ step1: { ...s.step1, ...data } })),
  setStep2: (data) => set({ step2: data }),
  setStep3: (data) =>
    set((s) => ({ step3: { ...s.step3, ...data } })),
  reset: () => set(initial),
}));