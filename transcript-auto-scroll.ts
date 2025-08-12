/**
 * Generic auto-scroll utility for transcript components
 * Provides smart scrolling behavior that respects user interaction
 */

export interface AutoScrollOptions {
  /** Threshold in pixels to determine if user is "near bottom" */
  threshold?: number;
  /** Whether to use smooth scrolling for single updates */
  smoothScroll?: boolean;
  /** Delay before scrolling when component becomes visible */
  visibilityDelay?: number;
}

export class TranscriptAutoScroll {
  private options: Required<AutoScrollOptions>;

  constructor(options: AutoScrollOptions = {}) {
    this.options = {
      threshold: 50,
      smoothScroll: true,
      visibilityDelay: 100,
      ...options,
    };
  }

  /**
   * Check if user is already at or near the bottom of the scroll container
   */
  shouldAutoScroll(element: Element): boolean {
    const isNearBottom =
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - this.options.threshold;
    return isNearBottom;
  }

  /**
   * Scroll to bottom with optional smooth behavior
   */
  scrollToBottom(
    element: Element,
    smooth: boolean = this.options.smoothScroll,
  ) {
    if (smooth) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: "smooth",
      });
    } else {
      element.scrollTop = element.scrollHeight;
    }
  }

  /**
   * Handle transcript updates with smart auto-scroll behavior
   * @param element - The scrollable transcript container
   * @param oldLength - Previous transcript length (for rapid update detection)
   * @param newLength - Current transcript length
   */
  handleTranscriptUpdate(
    element: Element,
    oldLength: number,
    newLength: number,
  ) {
    // Always scroll for the first message or if user is already at or near the bottom
    const isFirstMessage = oldLength === 0 && newLength > 0;
    const shouldScroll = isFirstMessage || this.shouldAutoScroll(element);

    if (shouldScroll) {
      // Detect rapid updates (multiple messages at once)
      const isRapidUpdate = newLength - oldLength > 1;

      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        this.scrollToBottom(element, !isRapidUpdate);
      });
    }
  }

  /**
   * Handle component visibility changes
   * @param element - The scrollable transcript container
   * @param isVisible - Whether the component is now visible
   * @param hasContent - Whether there's content to scroll to
   */
  handleVisibilityChange(
    element: Element,
    isVisible: boolean,
    hasContent: boolean,
  ) {
    if (isVisible && hasContent) {
      // When transcript becomes visible, scroll to bottom after a brief delay
      setTimeout(() => {
        this.scrollToBottom(element, false);
      }, this.options.visibilityDelay);
    }
  }
}

/**
 * Default auto-scroll instance for transcript components
 */
export const defaultAutoScroll = new TranscriptAutoScroll();
