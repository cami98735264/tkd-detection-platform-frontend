import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RegistrationStepper from "@/features/registration/components/RegistrationStepper";
import StepOnePersonal from "@/features/registration/pages/StepOnePersonal";
import StepTwoEmergency from "@/features/registration/pages/StepTwoEmergency";
import StepThreeConsent from "@/features/registration/pages/StepThreeConsent";
import { useRegistrationStore } from "@/features/registration/store/registrationStore";
import { http } from "@/lib/http";

export default function RegistrationPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const store = useRegistrationStore();

  // Calculate if minor from birth_date (format: YYYY-MM-DD from date input)
  const isMinor = (() => {
    if (!store.step1.birth_date) return false;
    const birth = new Date(store.step1.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
  })();

  const handleNext = async () => {
    if (step === 0) {
      // Validate step 1
      const { first_name, last_name, documento, birth_date, gender, email } = store.step1;
      if (!first_name || !last_name || !documento || !birth_date || !gender || !email) {
        return;
      }
    }
    if (step === 1 && isMinor) {
      // Validate step 2 if minor
      if (!store.step2?.full_name || !store.step2?.relationship) {
        return;
      }
    }
    if (step < 2) {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      formData.append("first_name", store.step1.first_name);
      formData.append("last_name", store.step1.last_name);
      formData.append("documento", store.step1.documento);
      formData.append("birth_date", store.step1.birth_date);
      formData.append("gender", store.step1.gender);
      formData.append("email", store.step1.email);
      if (store.step1.phone) formData.append("phone", store.step1.phone);
      if (store.step1.blood_type) formData.append("blood_type", store.step1.blood_type);
      if (store.step1.current_weight) formData.append("current_weight", store.step1.current_weight);
      if (store.step1.medical_certificate) {
        formData.append("medical_certificate", store.step1.medical_certificate);
      }
      if (store.step1.current_belt) formData.append("current_belt", String(store.step1.current_belt));

      if (store.step2) {
        formData.append("emergency_contact_full_name", store.step2.full_name);
        formData.append("emergency_contact_relationship", store.step2.relationship);
        if (store.step2.documento) formData.append("emergency_contact_documento", store.step2.documento);
        if (store.step2.email) formData.append("emergency_contact_email", store.step2.email);
        if (store.step2.address) formData.append("emergency_contact_address", store.step2.address);
      }

      formData.append("consent_data_accuracy", String(store.step3.consent_data_accuracy));
      formData.append("consent_data_policy", String(store.step3.consent_data_policy));
      formData.append("consent_terms", String(store.step3.consent_terms));
      formData.append("consent_media_auth", String(store.step3.consent_media_auth));

      await http.post("/registration/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      store.reset();
      navigate("/login");
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-2xl">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-center mb-6">Registro de Deportista</h1>
            <RegistrationStepper currentStep={step} />

            <div className="min-h-[300px]">
              {step === 0 && <StepOnePersonal />}
              {step === 1 && <StepTwoEmergency isMinor={isMinor} />}
              {step === 2 && <StepThreeConsent />}
            </div>

            <div className="flex justify-between mt-6">
              {step > 0 ? (
                <Button variant="outline" onClick={handleBack}>
                  Anterior
                </Button>
              ) : (
                <div />
              )}
              {step < 2 ? (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleNext}
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSubmit}
                >
                  Enviar inscripción
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}