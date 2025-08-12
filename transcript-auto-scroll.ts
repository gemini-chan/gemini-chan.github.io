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

export interface ScrollToBottomState {
  /** Whether the scroll-to-bottom button should be visible */
  showButton: boolean;
  /** Number of new messages since user scrolled away from bottom */
  newMessageCount: number;
}

export class TranscriptAutoScroll {
  private options: Required<AutoScrollOptions>;
  private wasAtBottomBeforeUpdate = new WeakMap<Element, boolean>();

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
    const scrollTop = element.scrollTop;
    const clientHeight = element.clientHeight;
    const scrollHeight = element.scrollHeight;
    const threshold = this.options.threshold;

    const isNearBottom = scrollTop + clientHeight >= scrollHeight - threshold;

    console.log(
      `[AutoScroll] Scroll check: scrollTop=${scrollTop}, clientHeight=${clientHeight}, scrollHeight=${scrollHeight}, threshold=${threshold}, isNearBottom=${isNearBottom}`,
    );

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
   * Handle transcript updates with conservative auto-scroll behavior
   * @param element - The scrollable transcript container
   * @param oldLength - Previous transcript length (for rapid update detection)
   * @param newLength - Current transcript length
   */
  handleTranscriptUpdate(
    element: Element,
    oldLength: number,
    newLength: number,
  ) {
    // Only auto-scroll for the very first message to show initial content
    const isFirstMessage = oldLength === 0 && newLength > 0;

    console.log(
      `[AutoScroll] Update: ${oldLength} -> ${newLength}, isFirstMessage: ${isFirstMessage}`,
    );

    if (isFirstMessage) {
      console.log(
        `[AutoScroll] First message - scrolling to show initial content`,
      );
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        this.scrollToBottom(element, true);
        this.wasAtBottomBeforeUpdate.set(element, true);
      });
      return;
    }

    // For all subsequent messages, do NOT auto-scroll
    // Let the user control scrolling via the scroll-to-bottom button
    console.log(
      `[AutoScroll] Subsequent message - no auto-scroll, user controls via button`,
    );

    // Just update the tracking state for button visibility
    this.wasAtBottomBeforeUpdate.set(element, this.shouldAutoScroll(element));
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

  /**
   * Calculate scroll-to-bottom button state
   * @param element - The scrollable transcript container
   * @param currentMessageCount - Current number of messages
   * @param lastSeenMessageCount - Number of messages when user was last at bottom
   * @returns State object for scroll-to-bottom button
   */
  getScrollToBottomState(
    element: Element,
    currentMessageCount: number,
    lastSeenMessageCount: number,
  ): ScrollToBottomState {
    const isAtBottom = this.shouldAutoScroll(element);
    const newMessageCount = Math.max(
      0,
      currentMessageCount - lastSeenMessageCount,
    );

    return {
      showButton: !isAtBottom && currentMessageCount > 0,
      newMessageCount: isAtBottom ? 0 : newMessageCount,
    };
  }

  /**
   * Handle scroll events to update button visibility
   * @param element - The scrollable transcript container
   * @returns Whether user is currently at or near bottom
   */
  handleScrollEvent(element: Element): boolean {
    return this.shouldAutoScroll(element);
  }
}

/**
 * Default auto-scroll instance for transcript components
 */
export const defaultAutoScroll = new TranscriptAutoScroll();
