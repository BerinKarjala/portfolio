import { KeyboardSensor } from "@dnd-kit/core";

// dnd-kit 6.3.1 defers its keydown listener until a timer runs, even though
// onStart has already exposed an active drag and a valid drop zone. Install it
// before starting so rapid follow-up keys work, and ignore the pickup event
// itself as it continues bubbling to document.
//
// This adapter uses KeyboardSensor's compiled private methods/listener stores.
// Keep its contract tests when upgrading dnd-kit; movement, scrolling, end and
// cancel behavior otherwise remain owned by the upstream sensor.
export default class ReadyKeyboardSensor extends KeyboardSensor {
  attach() {
    this.listeners.add("keydown", this.handleKeyDown);
    this.windowListeners.add("resize", this.handleCancel);
    this.windowListeners.add("visibilitychange", this.handleCancel);
    this.handleStart();
  }

  handleKeyDown(event) {
    if (event === this.props.event) return;
    super.handleKeyDown(event);
  }
}
