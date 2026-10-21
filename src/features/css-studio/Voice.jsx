import { useEffect, useRef, useState } from "react";
export default function Voice({ setDraft }) {
  const [status, setStatus] = useState("");
  const [listening, setListening] = useState(false);
  const recognition = useRef(null);
  const Recognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  useEffect(
    () => () => {
      const r = recognition.current;
      if (r) {
        r.onresult = null;
        r.onerror = null;
        r.onend = null;
        r.abort();
      }
    },
    [],
  );
  function start() {
    if (!Recognition) return;
    try {
      const r = new Recognition();
      recognition.current = r;
      r.interimResults = false;
      r.continuous = false;
      r.onresult = (event) => {
        const text = Array.from(event.results)
          .filter((result) => result.isFinal)
          .map((result) => result[0].transcript)
          .join(" ");
        setDraft((current) => (current + " " + text).trim().slice(0, 4000));
        setStatus("Transcript added. Edit it, then choose Send.");
      };
      r.onend = () => setListening(false);
      r.onerror = () => {
        setListening(false);
        setStatus(
          "Microphone unavailable or permission denied. You can still type.",
        );
      };
      r.start();
      setListening(true);
      setStatus("Listening…");
    } catch {
      setStatus("Microphone unavailable. You can still type.");
    }
  }
  return (
    <>
      <button
        disabled={!Recognition}
        onClick={() => {
          if (listening) {
            recognition.current?.stop();
            setListening(false);
            setStatus("Listening stopped. Edit your message before sending.");
          } else start();
        }}
      >
        {listening ? "Stop listening" : "Use microphone"}
      </button>
      <p role="status">
        {Recognition
          ? status
          : "Speech recognition is unavailable in this browser. You can still type."}
      </p>
    </>
  );
}
