import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Enrollment } from "@/types/entities";

const h = vi.hoisted(() => ({ downloadFile: vi.fn() }));
vi.mock("@/lib/download", () => ({ downloadFile: h.downloadFile }));

import CertificateDownloadButton from "../components/CertificateDownloadButton";
import { certificateUrl } from "./certificate";

const enrollment = (extra: Record<string, unknown> = {}) =>
  ({ id: 9, certificado_medico_adjunto: "", ...extra }) as unknown as Enrollment;

beforeEach(() => h.downloadFile.mockReset().mockResolvedValue(undefined));

describe("certificateUrl", () => {
  it("uses the authenticated URL field the API returns", () => {
    expect(
      certificateUrl(
        enrollment({
          certificado_medico_url: "/api/v1/enrollments/9/certificado/",
          certificado_medico_adjunto: "certificados/x.pdf",
        }),
      ),
    ).toBe("/api/v1/enrollments/9/certificado/");
    expect(certificateUrl(enrollment({ certificate_url: "https://h.test/c/9" }))).toBe(
      "https://h.test/c/9",
    );
  });

  it("accepts a URL in certificado_medico_adjunto and maps legacy storage paths to /media/", () => {
    expect(certificateUrl(enrollment({ certificado_medico_adjunto: "/api/v1/x/" }))).toBe(
      "/api/v1/x/",
    );
    expect(certificateUrl(enrollment({ certificado_medico_adjunto: "certificados/a.pdf" }))).toBe(
      "/media/certificados/a.pdf",
    );
  });

  it("returns null without a certificate", () => {
    expect(certificateUrl(enrollment())).toBeNull();
    expect(certificateUrl(enrollment({ certificado_medico_url: null }))).toBeNull();
  });
});

describe("CertificateDownloadButton", () => {
  it("downloads through the authenticated helper instead of linking to /media", async () => {
    render(
      <CertificateDownloadButton
        enrollment={enrollment({ certificado_medico_url: "/api/v1/enrollments/9/certificado/" })}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /descargar/i }));
    await waitFor(() =>
      expect(h.downloadFile).toHaveBeenCalledWith(
        "/api/v1/enrollments/9/certificado/",
        "certificado-medico-9",
      ),
    );
  });

  it("renders a dash when there is no certificate", () => {
    render(<CertificateDownloadButton enrollment={enrollment()} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
