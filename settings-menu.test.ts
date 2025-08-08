import { html } from 'lit';
import { fixture } from '@open-wc/testing';
import { expect } from 'chai';
import './settings-menu';
import { SettingsMenu } from './settings-menu';

describe('SettingsMenu', () => {
  it('should render the API key input field and all buttons correctly', async () => {
    const el = await fixture<SettingsMenu>(html`<settings-menu></settings-menu>`);
    const input = el.shadowRoot!.querySelector('input');
    const buttons = el.shadowRoot!.querySelectorAll('button');
    expect(input).to.exist;
    expect(buttons.length).to.equal(3);
  });

  it('should display an error message if the "Save" button is clicked with an empty API key', async () => {
    const el = await fixture<SettingsMenu>(html`<settings-menu></settings-menu>`);
    const saveButton = el.shadowRoot!.querySelectorAll('button')[2];
    saveButton.click();
    await el.updateComplete;
    const error = el.shadowRoot!.querySelector('.error');
    expect(error).to.exist;
    expect(error!.textContent).to.equal('API key cannot be empty.');
  });

  it('should display an error message if the API key has an invalid format', async () => {
    const el = await fixture<SettingsMenu>(html`<settings-menu></settings-menu>`);
    el.apiKey = 'invalid-key';
    const saveButton = el.shadowRoot!.querySelectorAll('button')[2];
    saveButton.click();
    await el.updateComplete;
    const error = el.shadowRoot!.querySelector('.error');
    expect(error).to.exist;
    expect(error!.textContent).to.equal('Invalid API key format.');
  });

  it('should clear the error message when the user starts typing in the input field', async () => {
    const el = await fixture<SettingsMenu>(html`<settings-menu></settings-menu>`);
    const saveButton = el.shadowRoot!.querySelectorAll('button')[2];
    saveButton.click();
    await el.updateComplete;
    const error = el.shadowRoot!.querySelector('.error');
    expect(error).to.exist;

    const input = el.shadowRoot!.querySelector('input')!;
    input.value = 'A';
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;
    const errorAfterInput = el.shadowRoot!.querySelector('.error');
    expect(errorAfterInput).to.not.exist;
  });

  it('should correctly save a valid API key to localStorage and dispatch the "api-key-saved" event', async () => {
    const el = await fixture<SettingsMenu>(html`<settings-menu></settings-menu>`);
    let eventDispatched = false;
    el.addEventListener('api-key-saved', () => {
      eventDispatched = true;
    });

    el.apiKey = 'AIzaSy' + 'a'.repeat(33);
    const saveButton = el.shadowRoot!.querySelectorAll('button')[2];
    saveButton.click();
    await el.updateComplete;

    expect(localStorage.getItem('gemini-api-key')).to.equal(el.apiKey);
    expect(eventDispatched).to.be.true;
  });
});