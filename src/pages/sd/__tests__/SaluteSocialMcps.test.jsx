process.env.REACT_APP_TURNSTILE_SITE_KEY = 'test-site-key';

import React from 'react';
import userEvent from '@testing-library/user-event';
import { act, screen, waitFor } from '@testing-library/react';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    MemoryRouter: ({ children }) => <>{children}</>,
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

import { renderWithRouter } from '../../../test-utils/renderWithRouter';
import SaluteSocialMcps from '../SaluteSocialMcps';
import { generateTrackingId } from '../tracking';
let turnstileCallback = null;

jest.mock('../../../utils/supabaseClient', () => {
  const { createMockSupabase } = require('../../../test-utils/mockSupabase');
  return {
    supabase: createMockSupabase(),
  };
});

import { supabase } from '../../../utils/supabaseClient';

jest.mock('../tracking', () => ({
  generateTrackingId: jest.fn(),
}));

describe("San Diego McP's RSVP flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
    turnstileCallback = null;

    generateTrackingId
      .mockReset()
      .mockReturnValueOnce('order-test-1')
      .mockReturnValueOnce('attendee-test-1')
      .mockReturnValue('tracking-fallback');

    supabase.from.mockImplementation(() =>
      ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            capacity: 100,
            seats_taken: 10,
            seats_remaining: 90,
            is_full: false,
          },
          error: null,
        }),
      })
    );

    supabase.functions.invoke.mockImplementation(async (...args) => {
      return {
        data: { ok: true },
        error: null,
      };
    });

    window.history.pushState({}, '', '/sd/salute-social-mcps?utm_source=test-source');
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: 'https://example.com/from-test',
    });

    window.turnstile.render.mockImplementation((_selector, options) => {
      turnstileCallback = options.callback;
      return 'widget-1';
    });
    window.turnstile.execute.mockImplementation(() => {
      if (turnstileCallback) {
        turnstileCallback('turnstile-token-123');
      }
      document.dispatchEvent(
        new CustomEvent('cf-turnstile-token', {
          detail: { token: 'turnstile-token-123' },
        })
      );
    });
    window.turnstile.reset.mockImplementation(() => {});
  });

  function renderPage() {
    return renderWithRouter(<SaluteSocialMcps />, {
      route: '/sd/salute-social-mcps?utm_source=test-source',
    });
  }

  async function waitForTurnstileReady() {
    await waitFor(() => {
      expect(window.turnstile.render).toHaveBeenCalled();
    });
  }

  async function primeTurnstileToken() {
    await waitFor(() => {
      expect(turnstileCallback).toEqual(expect.any(Function));
    });

    await act(async () => {
      turnstileCallback('turnstile-token-123');
    });
  }

  async function waitForSubmitIdle() {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit rsvp/i })).toBeEnabled();
    });
  }

  async function fillBaseValidForm(user, { status = 'Provider/Community Partner' } = {}) {
    await user.clear(screen.getByLabelText(/First name\*/i));
    await user.type(screen.getByLabelText(/First name\*/i), 'Alex');
    await user.clear(screen.getByLabelText(/Last name\*/i));
    await user.type(screen.getByLabelText(/Last name\*/i), 'Rivera');
    await user.clear(screen.getByLabelText(/Email\*/i));
    await user.type(screen.getByLabelText(/Email\*/i), 'alex@example.com');
    await user.clear(screen.getByLabelText(/Phone\*/i));
    await user.type(screen.getByLabelText(/Phone\*/i), '3125551212');
    await user.selectOptions(screen.getByLabelText(/Status\*/i), status);
    await user.click(screen.getByLabelText(/I confirm this RSVP is accurate\./i));
  }

  test('renders key McP event content', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /San Diego Salute & Social/i })).toBeInTheDocument();
    expect(screen.getByText(/McP's Irish Pub & Grill/i)).toBeInTheDocument();
    expect(screen.getByText(/Thursday, April 16, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/6-8 PM PT/i)).toBeInTheDocument();
  });

  test('blocks submission and shows validation message when required fields are missing', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /submit rsvp/i }));

    expect(screen.getByText(/Please fix the highlighted fields and try again\./i)).toBeInTheDocument();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  test('requires branch and era for service members but not for non-service statuses', async () => {
    renderPage();
    await waitForTurnstileReady();
    await primeTurnstileToken();

    await fillBaseValidForm(userEvent, { status: 'Veteran' });
    await userEvent.click(screen.getByRole('button', { name: /submit rsvp/i }));

    expect(screen.getByText(/Select at least one branch\./i)).toBeInTheDocument();
    expect(screen.getByText(/Attendee 1: Select at least one era\./i)).toBeInTheDocument();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByLabelText(/Status\*/i), 'Provider/Community Partner');
    await userEvent.click(screen.getByRole('button', { name: /submit rsvp/i }));

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
    });
    await waitForSubmitIdle();
  });

  test('submits a valid RSVP with the expected payload shape', async () => {
    renderPage();
    await waitForTurnstileReady();
    await primeTurnstileToken();

    await fillBaseValidForm(userEvent, { status: 'Provider/Community Partner' });
    await userEvent.click(screen.getByRole('button', { name: /submit rsvp/i }));

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
    });
    await waitForSubmitIdle();

    const [fnName, options] = supabase.functions.invoke.mock.calls[0];
    expect(fnName).toBe('reserve-rsvp');
    expect(options.body).toMatchObject({
      event_id: 'sd26-salute-social-mcps-2026-04-16',
      slot_id: '82d17fba-9a2a-4c10-ad57-a9fac6b263a0',
      order_id: 'order-test-1',
      consent: true,
      page_path: '/sd/salute-social-mcps',
      referrer: 'https://example.com/from-test',
      utm_source: 'test-source',
      cf_turnstile_token: 'turnstile-token-123',
      attendees: [
        expect.objectContaining({
          attendee_id: 'attendee-test-1',
          attendee_index: 0,
          first_name: 'Alex',
          last_name: 'Rivera',
          email: 'alex@example.com',
          phone: '(312) 555-1212',
          status: 'Provider/Community Partner',
          branch_of_service: [],
          era_list: [],
        }),
      ],
    });
  });

  test('shows backend error and resets Turnstile when submission fails', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { ok: false, code: 'DUPLICATE_RSVP', error: 'An RSVP already exists for this attendee.' },
      error: null,
    });

    renderPage();
    await waitForTurnstileReady();
    await primeTurnstileToken();
    await fillBaseValidForm(userEvent, { status: 'Provider/Community Partner' });
    await userEvent.click(screen.getByRole('button', { name: /submit rsvp/i }));

    expect(await screen.findByText(/An RSVP already exists for this attendee\./i)).toBeInTheDocument();
    expect(window.turnstile.reset).toHaveBeenCalled();
    await waitForSubmitIdle();
  });
});
