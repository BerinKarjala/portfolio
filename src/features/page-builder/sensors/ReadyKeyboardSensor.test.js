/* @vitest-environment jsdom */
import { KeyboardSensor } from "@dnd-kit/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReadyKeyboardSensor from "./ReadyKeyboardSensor";

const keys = {
  Space: " ",
  Enter: "Enter",
  ArrowDown: "ArrowDown",
  Escape: "Escape",
};
const sessions = [];

function key(target, code) {
  const event = new KeyboardEvent("keydown", {
    key: keys[code],
    code,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

function pickup(Sensor, code = "Space") {
  const handle = document.createElement("button");
  handle.textContent = "Drag Heading";
  document.body.append(handle);
  const callbacks = {
    onStart: vi.fn(),
    onMove: vi.fn(),
    onEnd: vi.fn(),
    onCancel: vi.fn(),
  };
  const coordinateGetter = vi.fn(() => ({ x: 30, y: 40 }));
  let sensor;
  handle.addEventListener("keydown", (event) => {
    if (sensor) return;
    const active = { activatorNode: { current: handle } };
    const activated = Sensor.activators[0].handler(
      {
        nativeEvent: event,
        target: event.target,
        preventDefault: () => event.preventDefault(),
      },
      {},
      { active },
    );
    if (!activated) return;
    sensor = new Sensor({
      active: "palette:heading",
      activeNode: { node: { current: handle } },
      event,
      context: {
        current: {
          collisionRect: { left: 10, top: 20, width: 40, height: 10 },
          scrollableAncestors: [],
        },
      },
      options: { coordinateGetter },
      ...callbacks,
    });
  });
  handle.focus();
  const pendingBeforePickup = vi.getTimerCount();
  key(handle, code);
  const session = {
    handle,
    sensor,
    coordinateGetter,
    pendingBeforePickup,
    ...callbacks,
  };
  sessions.push(session);
  return session;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  // Flush stock-sensor setup before detaching so a failed assertion cannot
  // leave a delayed document listener behind for the following test.
  vi.runOnlyPendingTimers();
  for (const session of sessions.splice(0)) session.sensor?.detach();
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe("keyboard sensor readiness", () => {
  it("reproduces stock dnd-kit's lost follow-up keys with focus preserved", () => {
    const session = pickup(KeyboardSensor);
    expect(session.onStart).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(session.handle);

    key(session.handle, "ArrowDown");
    key(session.handle, "Space");
    expect(session.onMove).not.toHaveBeenCalled();
    expect(session.onEnd).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(session.handle);

    // Advancing only the deferred attachment changes the outcome; focus and
    // the supplied drag context remain the same.
    vi.runOnlyPendingTimers();
    key(session.handle, "ArrowDown");
    expect(session.onMove).toHaveBeenCalledWith({ x: 20, y: 20 });
    key(session.handle, "Space");
    expect(session.onEnd).toHaveBeenCalledOnce();
  });

  it.each(["Space", "Enter"])(
    "ignores the bubbling %s pickup and accepts immediate arrow/drop keys",
    (dropCode) => {
      const session = pickup(ReadyKeyboardSensor, dropCode);
      expect(session.onStart).toHaveBeenCalledOnce();
      expect(session.onEnd).not.toHaveBeenCalled();
      expect(session.coordinateGetter).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(session.handle);

      expect(key(session.handle, "ArrowDown").defaultPrevented).toBe(true);
      expect(session.onMove).toHaveBeenCalledWith({ x: 20, y: 20 });
      expect(key(session.handle, dropCode).defaultPrevented).toBe(true);
      expect(session.onEnd).toHaveBeenCalledOnce();
      expect(session.onCancel).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(session.pendingBeforePickup);

      vi.runOnlyPendingTimers();
      expect(key(session.handle, "ArrowDown").defaultPrevented).toBe(false);
      key(session.handle, dropCode);
      window.dispatchEvent(new Event("resize"));
      expect(session.onMove).toHaveBeenCalledOnce();
      expect(session.onEnd).toHaveBeenCalledOnce();
      expect(session.onCancel).not.toHaveBeenCalled();
    },
  );

  it("accepts immediate Escape and removes listeners without a delayed reattach", () => {
    const session = pickup(ReadyKeyboardSensor);
    expect(key(session.handle, "Escape").defaultPrevented).toBe(true);
    expect(session.onCancel).toHaveBeenCalledOnce();
    expect(session.onEnd).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(session.pendingBeforePickup);

    vi.runOnlyPendingTimers();
    key(session.handle, "ArrowDown");
    key(session.handle, "Space");
    window.dispatchEvent(new Event("visibilitychange"));
    expect(session.onMove).not.toHaveBeenCalled();
    expect(session.onEnd).not.toHaveBeenCalled();
    expect(session.onCancel).toHaveBeenCalledOnce();
  });

  it("continues receiving follow-up keys after focus leaves the handle", () => {
    const session = pickup(ReadyKeyboardSensor);
    session.handle.blur();
    expect(document.activeElement).toBe(document.body);
    key(document.body, "ArrowDown");
    key(document.body, "Space");
    expect(session.onMove).toHaveBeenCalledOnce();
    expect(session.onEnd).toHaveBeenCalledOnce();
  });

  it.each(["resize", "visibilitychange"])(
    "preserves upstream cancellation on %s and removes all listeners",
    (type) => {
      const session = pickup(ReadyKeyboardSensor);
      window.dispatchEvent(new Event(type));
      expect(session.onCancel).toHaveBeenCalledOnce();
      key(session.handle, "ArrowDown");
      key(session.handle, "Space");
      window.dispatchEvent(new Event(type));
      expect(session.onMove).not.toHaveBeenCalled();
      expect(session.onEnd).not.toHaveBeenCalled();
      expect(session.onCancel).toHaveBeenCalledOnce();
    },
  );
});
