import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntakeForm } from "@/components/intake-form";
import { LocaleProvider } from "@/lib/i18n/context";

function renderForm() {
  return render(
    <LocaleProvider>
      <IntakeForm />
    </LocaleProvider>,
  );
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/your name/i), "Jordan Rivera");
  await user.type(screen.getByLabelText(/^email$/i), "jordan@example.com");
  await user.type(
    screen.getByLabelText(/how can we help/i),
    "Looking for help finding a food pantry near me.",
  );
}

describe("IntakeForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // jsdom's document isn't reset between tests in the same file (only the
    // DOM tree is, via RTL's cleanup) — clear any locale cookie a previous
    // test's language switch left behind so each test starts in English.
    document.cookie = "NEXT_LOCALE=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  });

  it("renders the required fields", () => {
    renderForm();
    expect(screen.getByLabelText(/your name/i)).toBeRequired();
    expect(screen.getByLabelText(/how can we help/i)).toBeRequired();
  });

  it("blocks submission until consent is checked, with a clear message", async () => {
    const user = userEvent.setup();
    renderForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/consent/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks submission and shows an inline error when neither email nor phone is given", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/your name/i), "Jordan Rivera");
    await user.type(
      screen.getByLabelText(/how can we help/i),
      "Looking for help finding a food pantry near me.",
    );
    await user.click(screen.getByLabelText(/i consent/i));
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    const emailField = await screen.findByLabelText(/^email$/i);
    expect(emailField).toHaveAttribute("aria-invalid", "true");
    const phoneField = screen.getByLabelText(/^phone$/i);
    expect(phoneField).toHaveAttribute("aria-invalid", "true");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows a field-level error linked to the message field when it's too short", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/your name/i), "Jordan Rivera");
    await user.type(screen.getByLabelText(/how can we help/i), "too short");
    await user.click(screen.getByLabelText(/i consent/i));
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    const messageField = screen.getByLabelText(/how can we help/i);
    expect(messageField).toHaveAttribute("aria-invalid", "true");
    const describedBy = messageField.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const fieldError = document.getElementById(describedBy!);
    expect(fieldError).toHaveTextContent(/tell us a little more/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("switches the form to Spanish and includes the locale in the submission", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ submission: { id: "1" } }),
    } as Response);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Español" }));
    expect(screen.getByText("¿Cómo podemos ayudarte?")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/tu nombre/i), "Jordan Rivera");
    await user.type(screen.getByLabelText(/correo electrónico/i), "jordan@example.com");
    await user.type(
      screen.getByLabelText(/cómo podemos ayudarte/i),
      "Busco ayuda para encontrar un banco de alimentos.",
    );
    await user.click(screen.getByLabelText(/doy mi consentimiento/i));
    await user.click(screen.getByRole("button", { name: /enviar solicitud/i }));

    await screen.findByText(/recibimos tu solicitud/i);
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.locale).toBe("es");
  });

  it("submits successfully and shows the confirmation screen", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ submission: { id: "1" } }),
    } as Response);
    const user = userEvent.setup();
    renderForm();

    await fillRequiredFields(user);
    await user.click(screen.getByLabelText(/i consent/i));
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(await screen.findByText(/we received your request/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/intake", expect.objectContaining({ method: "POST" }));
  });

  it("shows a copyable tracking code and status link after submitting", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ submission: { id: "submission-123" } }),
    } as Response);
    const user = userEvent.setup();
    // userEvent.setup() installs its own clipboard stub on navigator.clipboard,
    // overwriting anything set up beforehand — spy on it only after this call.
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    renderForm();

    await fillRequiredFields(user);
    await user.click(screen.getByLabelText(/i consent/i));
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(await screen.findByText("submission-123")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /check status/i })).toHaveAttribute(
      "href",
      "/status/submission-123",
    );

    await user.click(screen.getByRole("button", { name: /copy code/i }));
    expect(writeText).toHaveBeenCalledWith("submission-123");
    expect(await screen.findByRole("button", { name: /^copied$/i })).toBeInTheDocument();
  });

  it("shows the server's error message when the request fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "We could not process this request." }),
    } as Response);
    const user = userEvent.setup();
    renderForm();

    await fillRequiredFields(user);
    await user.click(screen.getByLabelText(/i consent/i));
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not process/i);
  });

  it("disables the submit button while the request is in flight", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await fillRequiredFields(user);
    await user.click(screen.getByLabelText(/i consent/i));
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();

    resolveFetch({ ok: true, json: async () => ({ submission: { id: "1" } }) } as Response);
    await screen.findByText(/we received your request/i);
  });
});
