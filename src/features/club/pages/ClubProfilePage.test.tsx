import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ClubProfile } from "@/types/entities";

const h = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  uploadSignature: vi.fn(),
  removeSignature: vi.fn(),
  fetchSignature: vi.fn(),
}));
vi.mock("../api/clubProfileApi", () => ({ clubProfileApi: h }));

import { FeedbackProvider } from "@/feedback/FeedbackProvider";

import ClubProfilePage from "./ClubProfilePage";

const profile: ClubProfile = {
  name: "Club Deportivo Warriors TKD Espinal",
  short_name: "Club Warriors TKD Espinal",
  recognition: "Reconocimiento Deportivo N° 049 noviembre 10 de 2022",
  resolution: "Resolución No. 007 septiembre 10 de 2021",
  league: "Afiliado a la Liga Tolimense de Taekwondo",
  city: "Espinal, Tolima",
  legal_rep_name: "Jonathan De La Rosa Moreno",
  legal_rep_title_prefix: "Lic.",
  legal_rep_role: "Representante legal del Club Warriors TKD Espinal",
  phone: "3209575357",
  email: "warriostkdespinal@gmail.com",
  include_signature: true,
  default_training_days: ["martes", "jueves", "sábado"],
  default_session_hours: "2",
  has_signature: true,
  signature_url: "/api/v1/club-profile/signature/",
  updated_at: "2026-11-01T10:00:00Z",
};

function renderPage() {
  return render(
    <FeedbackProvider>
      <ClubProfilePage />
    </FeedbackProvider>,
  );
}

beforeAll(() => {
  const g = globalThis as Record<string, unknown>;
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  g.ResizeObserver ??= NoopObserver;
});

beforeEach(() => {
  vi.clearAllMocks();
  h.get.mockResolvedValue(profile);
  h.fetchSignature.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  URL.createObjectURL = vi.fn(() => "blob:firma");
  URL.revokeObjectURL = vi.fn();
});

describe("ClubProfilePage", () => {
  it("loads the profile and previews the signature via an authenticated blob", async () => {
    renderPage();
    expect(await screen.findByDisplayValue(profile.name)).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre del representante *")).toHaveValue(profile.legal_rep_name);
    const img = await screen.findByRole("img", { name: "Firma del representante legal" });
    expect(img).toHaveAttribute("src", "blob:firma");
    expect(h.fetchSignature).toHaveBeenCalledWith(profile.signature_url);
    expect(screen.getByLabelText("Martes")).toBeChecked();
    expect(screen.getByLabelText("Lunes")).not.toBeChecked();
    // Nothing changed yet → save disabled.
    expect(screen.getByRole("button", { name: /Guardar cambios/ })).toBeDisabled();
  });

  it("saves edited fields, days and the include_signature switch", async () => {
    h.update.mockResolvedValue({ ...profile, city: "Ibagué", include_signature: false });
    renderPage();
    const city = await screen.findByLabelText("Ciudad");
    fireEvent.change(city, { target: { value: "Ibagué" } });
    fireEvent.click(screen.getByLabelText("Lunes"));
    fireEvent.click(screen.getByRole("switch", { name: /Incluir la firma/ }));
    fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/ }));
    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    expect(h.update.mock.calls[0][0]).toMatchObject({
      city: "Ibagué",
      include_signature: false,
      default_training_days: ["lunes", "martes", "jueves", "sábado"],
      default_session_hours: 2,
    });
    expect(await screen.findByText("Datos del club actualizados")).toBeInTheDocument();
  });

  it("does not save an invalid form", async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText("Nombre del club *"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Guardar cambios/ }));
    expect(await screen.findByText("El nombre del club es obligatorio.")).toBeInTheDocument();
    expect(h.update).not.toHaveBeenCalled();
  });

  it("rejects a non-image signature and uploads a valid one", async () => {
    h.uploadSignature.mockResolvedValue({ ...profile, updated_at: "2026-11-02T10:00:00Z" });
    renderPage();
    await screen.findByDisplayValue(profile.name);
    const input = screen.getByTestId("signature-input");
    const pdf = new File(["%PDF"], "firma.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [pdf] } });
    expect(await screen.findByText(/Sube una imagen PNG o JPG/)).toBeInTheDocument();
    expect(h.uploadSignature).not.toHaveBeenCalled();

    const png = new File(["png"], "firma.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [png] } });
    await waitFor(() => expect(h.uploadSignature).toHaveBeenCalledWith(png));
    expect(await screen.findByText("Firma actualizada")).toBeInTheDocument();
    // The preview is refetched for the new image.
    await waitFor(() => expect(h.fetchSignature).toHaveBeenCalledTimes(2));
  });

  it("removes the signature after confirmation", async () => {
    h.removeSignature.mockResolvedValue({ ...profile, has_signature: false, signature_url: null });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Quitar firma/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(h.removeSignature).toHaveBeenCalled());
    expect(await screen.findByText("Sin firma cargada.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Subir firma/ })).toBeInTheDocument();
  });

  it("shows an empty preview when there is no signature", async () => {
    h.get.mockResolvedValue({ ...profile, has_signature: false, signature_url: null });
    renderPage();
    expect(await screen.findByText("Sin firma cargada.")).toBeInTheDocument();
    expect(h.fetchSignature).not.toHaveBeenCalled();
  });
});
