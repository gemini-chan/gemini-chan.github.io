/**
 * Generic auto-scroll utility for transcript components
 * Provides smart scrolling behavior that respects user interaction
 */
import { createComponentLogger } from './src/debug-logger';

const logger = createComponentLogger('transcript-auto-scroll');

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

    logger.debug('Scroll check', {
      scrollTop,
      clientHeight,
      scrollHeight,
      threshold,
      isNearBottom,
    });

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
    // Always scroll for the first message to show initial content
    const isFirstMessage = oldLength === 0 && newLength > 0;

    logger.debug('Update', {
      oldLength,
      newLength,
      isFirstMessage,
    });

    if (isFirstMessage) {
      logger.debug('First message - scrolling to show initial content');
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        this.scrollToBottom(element, true);
        this.wasAtBottomBeforeUpdate.set(element, true);
      });
      return;
    }

    // Check if user was at bottom before this update
    const wasAtBottom =
      this.wasAtBottomBeforeUpdate.get(element) ??
      this.shouldAutoScroll(element);

    logger.debug('Update scroll state', { wasAtBottom });

    // If user was at bottom before the update, continue auto-scrolling
    // If user scrolled up to read past content, don't interrupt them
    if (wasAtBottom) {
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        // Detect rapid updates (multiple messages at once)
        const isRapidUpdate = newLength - oldLength > 1;
        logger.debug('Auto-scrolling', { smooth: !isRapidUpdate });
        this.scrollToBottom(element, !isRapidUpdate);
        // Update the state after scrolling
        this.wasAtBottomBeforeUpdate.set(element, true);
      });
    } else {
      logger.debug(
        'User scrolled up to read past content - not interrupting',
      );
      // Just update the tracking state for button visibility
      this.wasAtBottomBeforeUpdate.set(element, this.shouldAutoScroll(element));
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
   * Handle scroll events to update button visibility and tracking state
   * @param element - The scrollable transcript container
   * @returns Whether user is currently at or near bottom
   */
  handleScrollEvent(element: Element): boolean {
    const isAtBottom = this.shouldAutoScroll(element);

    // Update our tracking state when user manually scrolls
    // This ensures we respect their current scroll position for future auto-scroll decisions
    this.wasAtBottomBeforeUpdate.set(element, isAtBottom);

    logger.debug('User scroll event', { isAtBottom });

    return isAtBottom;
  }
}

/**
 * Default auto-scroll instance for transcript components
 */
export const defaultAutoScroll = new TranscriptAutoScroll();
