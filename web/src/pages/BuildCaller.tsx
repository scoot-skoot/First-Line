import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

export function BuildCaller() {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);

  async function generate() {
    if (!description.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.buildCaller(description.trim());
      setPreview(res.persona as unknown as Record<string, unknown>);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAndPlay() {
    if (!description.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.buildCaller(description.trim(), { save: true });
      setPreview(res.persona as unknown as Record<string, unknown>);
      if (res.scenarioId) {
        const trainees = await api.trainees();
        const traineeId = trainees.trainees[0]?.id;
        if (!traineeId) throw new Error("No demo trainee");
        const started = await api.startSession({
          traineeId,
          scenarioId: res.scenarioId,
          mode: "text",
        });
        navigate(`/call/${started.session.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="text-sm text-ink-500 hover:text-teal-700">
        ← Practice list
      </Link>
      <h1 className="font-display mt-4 text-3xl font-bold text-ink-900">
        Build a caller
      </h1>
      <p className="mt-2 text-ink-700">
        Describe a fictional training caller in a short phrase. Gemini drafts a
        full persona (non-graphic). Save it as a playable scenario.
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        placeholder="e.g. college student, homesick, exam stress, lonely in dorm"
        className="mt-5 w-full rounded-2xl border border-line bg-white px-4 py-3 text-ink-900 outline-none focus:border-teal-500/50"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !description.trim()}
          onClick={() => void generate()}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink-700 disabled:opacity-50"
        >
          {busy ? "Generating…" : "Preview persona"}
        </button>
        <button
          type="button"
          disabled={busy || !description.trim()}
          onClick={() => void saveAndPlay()}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save & start practice
        </button>
      </div>
      {error && (
        <p className="mt-4 rounded-xl border border-rose-100 bg-rose-100/60 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
      {preview && (
        <pre className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white p-4 text-xs text-ink-700">
          {JSON.stringify(preview, null, 2)}
        </pre>
      )}
    </div>
  );
}
