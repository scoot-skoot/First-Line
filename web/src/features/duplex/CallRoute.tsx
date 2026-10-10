import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Call } from "../../pages/Call";
import { duplexApi } from "./api";
import { DuplexCall } from "./DuplexCall";

/**
 * Chooses PTT Call vs DuplexCall based on server CALL_MODE and whether this
 * session was bootstrapped as duplex (sessionStorage boot cache).
 */
export function CallRoute() {
  const { id = "" } = useParams();
  const [mode, setMode] = useState<"loading" | "ptt" | "duplex">("loading");

  useEffect(() => {
    void (async () => {
      try {
        const status = await duplexApi.status();
        const hasBoot = Boolean(
          sessionStorage.getItem(`firstline.duplex.boot.${id}`),
        );
        if (status.duplexEnabled || hasBoot) {
          setMode("duplex");
        } else {
          setMode("ptt");
        }
      } catch {
        // If duplex status endpoint fails, fall back to classic PTT.
        setMode(
          sessionStorage.getItem(`firstline.duplex.boot.${id}`)
            ? "duplex"
            : "ptt",
        );
      }
    })();
  }, [id]);

  if (mode === "loading") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 font-mono text-sm text-ink-muted">
        Loading call…
      </div>
    );
  }
  return mode === "duplex" ? <DuplexCall /> : <Call />;
}
