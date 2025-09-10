import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

/**
 * This is a mock for the live2d-gate component.
 * It defines the custom element tag so that tests rendering
 * the main app component don't fail, but it has no internal logic.
 */
@customElement('live2d-gate')
export class MockLive2dGate extends LitElement {}