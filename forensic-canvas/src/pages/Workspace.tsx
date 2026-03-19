import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, History, Layers, Plus, Mic, Square, FileAudio } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { ApiError, addRefinement, generateSketch, getCase, getTimeline, transcribeAudio } from "@/lib/api";
import { appRoutes } from "@/lib/routes";

type CaseData = {
  case_id: string;
  title?: string;
  description?: string;
};

type TimelineEvent = {
  event_type: "sketch" | "refinement";
  created_at?: string;
  payload: any;
};

function TimelineItem({
  version,
  type,
  time,
  desc,
  active = false,
}: {
  version: string;
  type: string;
  time: string;
  desc: string;
  active?: boolean;
}) {
  return (
    <div className="relative">
      <div
        className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 bg-card ${
          active ? "border-primary" : "border-border"
        }`}
      />
      <div className="flex justify-between items-start mb-1">
        <span className="font-mono-data text-[10px] font-bold text-muted-foreground">
          V.{version} - {type}
        </span>
        <span className="font-mono-data text-[10px] text-muted-foreground">{time}</span>
      </div>
      <p className={`text-xs leading-snug ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        {desc}
      </p>
    </div>
  );
}

function formatTime(value?: string) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Workspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const caseId = (searchParams.get("case_id") || "").trim();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [description, setDescription] = useState("");
  const [refinement, setRefinement] = useState("");
  const [attributeType, setAttributeType] = useState("general");
  const [xCoord, setXCoord] = useState("");
  const [yCoord, setYCoord] = useState("");
  const [busyGenerate, setBusyGenerate] = useState(false);
  const [busyRefine, setBusyRefine] = useState(false);
  const [busyTranscribe, setBusyTranscribe] = useState(false);
  const [recording, setRecording] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [caseImages, setCaseImages] = useState<string[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const loadTimeline = async (selectedCaseId: string) => {
    const timelineData = await getTimeline(selectedCaseId);
    setTimeline((timelineData.timeline || []) as TimelineEvent[]);

    const sketches = timelineData.sketches || [];
    if (sketches.length > 0) {
      const latest = sketches[0];
      setImageUrl(latest.signed_image_url || "");
    }
    const ordered = [...sketches]
      .reverse()
      .map((s) => (s?.signed_image_url || "").trim())
      .filter((url) => !!url);
    setCaseImages(ordered);
  };

  useEffect(() => {
    const load = async () => {
      if (!caseId) {
        toast.error("Select a case from dashboard first.");
        navigate(appRoutes.dashboard);
        return;
      }

      try {
        const caseRow = await getCase(caseId);
        setCaseData(caseRow);
        await loadTimeline(caseId);
      } catch (err) {
        const error = err as ApiError;
        toast.error(error.message || "Failed to load case workspace.");
      }
    };

    load();
  }, [caseId, navigate]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const timelineRows = useMemo(() => {
    return timeline.map((event) => {
      if (event.event_type === "sketch") {
        return {
          version: String(event.payload?.version ?? "?"),
          type: "Sketch",
          time: formatTime(event.created_at || event.payload?.created_at),
          desc: event.payload?.image_url || "Sketch generated",
          active: false,
        };
      }

      return {
        version: "R",
        type: event.payload?.attribute_type || "Refinement",
        time: formatTime(event.created_at || event.payload?.created_at),
        desc: event.payload?.description || "Refinement applied",
        active: false,
      };
    });
  }, [timeline]);

  if (!caseData) {
    return <div className="p-8 text-sm text-muted-foreground">Loading workspace...</div>;
  }

  const generateBase = async () => {
    if (!description.trim()) {
      toast.error("Suspect description is required.");
      return;
    }

    setBusyGenerate(true);
    try {
      const out = await generateSketch(caseData.case_id, description.trim());
      setImageUrl(out.signed_image_url || "");
      await loadTimeline(caseData.case_id);
      toast.success("Base sketch generated.");
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || "Failed to generate sketch.");
    } finally {
      setBusyGenerate(false);
    }
  };

  const applyRefinement = async () => {
    if (!description.trim()) {
      toast.error("Base description is required.");
      return;
    }
    if (!refinement.trim()) {
      toast.error("Refinement description is required.");
      return;
    }

    setBusyRefine(true);
    try {
      const out = await addRefinement({
        caseId: caseData.case_id,
        description: description.trim(),
        refinement: refinement.trim(),
        attributeType,
        xCoord,
        yCoord,
      });
      setImageUrl(out.signed_image_url || "");
      setRefinement("");
      await loadTimeline(caseData.case_id);
      toast.success("Refinement applied.");
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || "Failed to apply refinement.");
    } finally {
      setBusyRefine(false);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Microphone is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        if (!blob.size) {
          toast.error("No audio captured. Please try again.");
          return;
        }

        setBusyTranscribe(true);
        try {
          const out = await transcribeAudio(blob);
          setDescription((prev) => {
            const prefix = prev.trim();
            const next = out.text.trim();
            if (!next) return prev;
            return prefix ? `${prefix} ${next}`.trim() : next;
          });
          toast.success("Voice transcript added to description.");
        } catch (err) {
          const error = err as ApiError;
          toast.error(error.message || "Voice transcription failed.");
        } finally {
          setBusyTranscribe(false);
        }
      };

      recorder.start();
      setRecording(true);
      toast.success("Recording started.");
    } catch {
      toast.error("Unable to access microphone.");
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") {
      return;
    }
    recorderRef.current.stop();
    toast.success("Recording stopped. Transcribing...");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
      className="flex h-full min-h-0 overflow-hidden bg-background"
    >
      <aside className="w-72 min-h-0 border-r border-border bg-card p-5 flex flex-col gap-6 overflow-y-scroll shrink-0">
        <section>
          <h2 className="label-uppercase mb-3">Case Metadata</h2>
          <div className="space-y-1">
            <h1 className="text-base font-medium text-foreground font-mono-data">{caseData.case_id}</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {(caseData.description || "No case description.").trim() || "No case description."}
            </p>
          </div>
        </section>

        <section>
          <h2 className="label-uppercase mb-3">Base Sketch</h2>
          <div className="w-full aspect-square bg-secondary border border-border rounded flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              <img src={imageUrl} alt="Base sketch" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <Search className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-[10px] font-mono-data text-muted-foreground">NO BASE GENERATED</p>
              </div>
            )}
          </div>
        </section>

        <section className="flex-1">
          <h2 className="label-uppercase mb-3 flex items-center gap-2">
            <History className="h-3 w-3" /> Refinement Timeline
          </h2>
          <div className="relative border-l-2 border-muted ml-2 pl-6 space-y-6">
            {timelineRows.length === 0 && <p className="text-xs text-muted-foreground">No timeline entries yet.</p>}
            {timelineRows.map((item, index) => (
              <TimelineItem
                key={`${item.type}-${index}`}
                version={item.version}
                type={item.type}
                time={item.time}
                desc={item.desc}
                active={index === 0}
              />
            ))}
          </div>
        </section>
      </aside>

      <main className="flex-1 h-full min-h-0 p-8 flex flex-col items-center justify-start relative overflow-y-scroll overflow-x-hidden">
        <div className="absolute inset-0 grid-blueprint opacity-30 pointer-events-none" />

        <div className="w-full max-w-xl aspect-[3/4] bg-card border border-border relative flex flex-col items-center justify-center z-10 overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt="Generated output" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center mx-auto text-muted-foreground">
                <Search className="h-8 w-8" />
              </div>
              <p className="font-mono-data text-xs text-muted-foreground uppercase">Synthesized Output Placeholder</p>
              <p className="text-[10px] text-muted-foreground">Generated sketch will appear here</p>
            </div>
          )}
        </div>

        <div className="mt-6 w-full max-w-xl surface-card rounded-lg p-4 flex gap-3 items-end z-10">
          <div className="flex-1 space-y-3">
            <label className="label-uppercase">Suspect Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-forensic resize-none"
              placeholder="Describe facial features, hair, and distinguishing marks..."
              rows={2}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={startRecording}
                disabled={recording || busyTranscribe}
                className="bg-secondary hover:bg-secondary/80 text-foreground px-3 py-2 rounded text-xs transition-forensic whitespace-nowrap flex items-center gap-2"
              >
                <Mic className="h-4 w-4" /> Start Voice
              </button>
              <button
                onClick={stopRecording}
                disabled={!recording || busyTranscribe}
                className="bg-secondary hover:bg-secondary/80 text-foreground px-3 py-2 rounded text-xs transition-forensic whitespace-nowrap flex items-center gap-2"
              >
                <Square className="h-4 w-4" /> Stop
              </button>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <FileAudio className="h-3.5 w-3.5" />
                {busyTranscribe ? "Transcribing..." : recording ? "Recording..." : "Voice input ready"}
              </span>
            </div>
          </div>
          <button
            onClick={generateBase}
            disabled={busyGenerate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded font-medium text-sm transition-forensic whitespace-nowrap flex items-center gap-2 shrink-0"
          >
            {busyGenerate ? "Generating..." : "Generate Base"}
          </button>
        </div>

        <div className="mt-6 w-full max-w-5xl surface-card rounded-lg p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="label-uppercase">Case Image Sequence</h3>
            <span className="text-xs text-muted-foreground">{caseImages.length} image(s)</span>
          </div>
          {caseImages.length === 0 ? (
            <p className="text-xs text-muted-foreground">No generated images yet for this case.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {caseImages.map((url, index) => (
                <div key={`${url}-${index}`} className="shrink-0 w-40">
                  <img
                    src={url}
                    alt={`Case sketch ${index + 1}`}
                    className="w-40 h-40 object-cover rounded border border-border"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground font-mono-data text-center">V{index + 1}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <aside className="w-72 min-h-0 border-l border-border bg-card p-5 flex flex-col gap-5 overflow-y-scroll shrink-0">
        <h2 className="label-uppercase">Refinement Tools</h2>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="label-uppercase">Feature Category</label>
            <select
              value={attributeType}
              onChange={(e) => setAttributeType(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground transition-forensic"
            >
              <option value="marks">Distinguishing Marks (Scars/Tattoos)</option>
              <option value="eyes">Ocular Region (Eyes/Brows)</option>
              <option value="nose">Nasal Structure</option>
              <option value="hair">Hairline & Texture</option>
              <option value="jawline">Mouth & Jaw</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="label-uppercase">Refinement Description</label>
            <textarea
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground transition-forensic resize-none"
              placeholder="e.g. Jagged 2-inch scar running vertically through left eyebrow"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="label-uppercase">Coord X</label>
              <input
                type="text"
                value={xCoord}
                onChange={(e) => setXCoord(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono-data text-foreground transition-forensic"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-uppercase">Coord Y</label>
              <input
                type="text"
                value={yCoord}
                onChange={(e) => setYCoord(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono-data text-foreground transition-forensic"
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            onClick={applyRefinement}
            disabled={busyRefine}
            className="w-full bg-foreground hover:bg-foreground/90 text-background py-2.5 rounded font-medium text-sm transition-forensic flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> {busyRefine ? "Applying..." : "Apply Refinement"}
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="label-uppercase">Refined Preview</label>
          <div className="w-full aspect-square bg-secondary border border-border rounded flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              <img src={imageUrl} alt="Refined preview" className="w-full h-full object-cover" />
            ) : (
              <p className="font-mono-data text-[10px] text-muted-foreground text-center px-4">
                REFINEMENT PREVIEW
                <br />
                WILL APPEAR HERE
              </p>
            )}
          </div>
        </div>

        <div className="mt-auto p-3 bg-primary/5 border border-primary/10 rounded">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Layers className="h-3.5 w-3.5" />
            <span className="label-uppercase text-primary">Active Layer</span>
          </div>
          <p className="text-[11px] text-primary/70 leading-tight">
            Latest sketch version and refinements are synced with backend case timeline.
          </p>
        </div>
      </aside>
    </motion.div>
  );
}
