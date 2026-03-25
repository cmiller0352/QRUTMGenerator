// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

process.env.REACT_APP_TURNSTILE_SITE_KEY =
  process.env.REACT_APP_TURNSTILE_SITE_KEY || 'test-site-key';

window.scrollTo = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();

if (!window.turnstile) {
  window.turnstile = {
    render: jest.fn(() => 'test-turnstile-widget'),
    execute: jest.fn(),
    reset: jest.fn(),
  };
}
