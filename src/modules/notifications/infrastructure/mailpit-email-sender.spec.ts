import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MailpitEmailSender } from '@/modules/notifications/infrastructure/mailpit-email-sender.js';

const MESSAGE = {
  to: 'ana@fiaro.dev',
  subject: 'Tu código',
  html: '<p>123456</p>',
  text: '123456',
};

describe('MailpitEmailSender', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('deja el correo en Mailpit con remitente y destinatario separados en nombre y correo', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    new MailpitEmailSender(
      'http://mailpit:8025',
      'Fiaro <no-reply@fiaro.dev>',
    ).send(MESSAGE);

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
    });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('http://mailpit:8025/api/v1/send');
    expect(JSON.parse(init.body as string)).toEqual({
      From: { Name: 'Fiaro', Email: 'no-reply@fiaro.dev' },
      To: [{ Name: '', Email: 'ana@fiaro.dev' }],
      Subject: 'Tu código',
      HTML: '<p>123456</p>',
      Text: '123456',
    });
  });

  it('si Mailpit falla, lo escribe en el log y no lanza', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const logger = { error: vi.fn() };

    new MailpitEmailSender('http://mailpit:8025', 'x@fiaro.dev', logger).send(
      MESSAGE,
    );

    await vi.waitFor(() => {
      expect(logger.error).toHaveBeenCalledOnce();
    });
  });
});
