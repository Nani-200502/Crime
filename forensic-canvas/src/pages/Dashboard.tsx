import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Image, Briefcase, CalendarDays, Search } from "lucide-react";
import { motion } from "framer-motion";
import DescriptionPanel from "@/components/workspace/DescriptionPanel";
import AttributePanel from "@/components/workspace/AttributePanel";
import SketchPlaceholder from "@/components/SketchPlaceholder";
import ImageLightbox from "@/components/ImageLightbox";
import {
  addRefinement,
  CaseRecord,
  generateSketch,
  getCurrentCaseId,
  getTimeline,
  listCases,
  setCurrentCaseId,
} from "@/lib/api";

const navTabs = [
  { label: "Generate Portrait", to: "/dashboard" },
  { label: "Image Gallery", to: "/image-gallery" },
  { label: "Case Management", to: "/case-management" },
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Dashboard() {
  const location = useLocation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("stabilityai/stable-diffusion-xl-base-1.0");
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [refinementText, setRefinementText] = useState("");
  const [strength, setStrength] = useState(0.25);
  const [attributes, setAttributes] = useState<Record<string, string>>({});

  const activeCase = useMemo(() => cases.find((c) => c.case_id === selectedCaseId) || null, [cases, selectedCaseId]);

  const stats = [
    { label: "Generated Images", value: imageUrl ? "1" : "0", icon: Image, color: "text-primary" },
    { label: "Active Cases", value: String(cases.length), icon: Briefcase, color: "text-primary" },
    { label: "This Month", value: String(cases.length), icon: CalendarDays, color: "text-primary" },
  ];

  const attributeSummary = useMemo(() => {
    const parts = Object.entries(attributes)
      .filter(([, value]) => !!(value || "").trim())
      .map(([label, value]) => `${label}: ${value}`);
    return parts.join(", ");
  }, [attributes]);

  const loadCases = async () => {
    try {
      const rows = await listCases();
      setCases(rows);

      const saved = getCurrentCaseId();
      const resolved = saved && rows.some((r) => r.case_id === saved) ? saved : (rows[0]?.case_id || "");
      setSelectedCaseId(resolved);
      if (resolved) {
        setCurrentCaseId(resolved);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load cases.");
    }
  };

  const loadTimelinePreview = async (caseId: string) => {
    if (!caseId) {
      setImageUrl("");
      return;
    }
    try {
      const timeline = await getTimeline(caseId);
      const sketches = timeline.sketches || [];
      const latest = sketches[0]?.signed_image_url || sketches[0]?.image_url || "";
      setImageUrl(latest);
    } catch {
      setImageUrl("");
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    if (!selectedCaseId) return;
    setCurrentCaseId(selectedCaseId);
    loadTimelinePreview(selectedCaseId);
  }, [selectedCaseId]);

  const onGenerate = async () => {
    if (!selectedCaseId || !description.trim() || generating) return;
    setError("");
    setStatus("");
    setGenerating(true);
    try {
      const finalDescription = attributeSummary
        ? `${description.trim()}. Facial attributes: ${attributeSummary}.`
        : description.trim();
      const out = await generateSketch(selectedCaseId, finalDescription, model);
      const nextImage = out?.signed_image_url || out?.image_url || "";
      if (nextImage) setImageUrl(nextImage);
      setStatus("Portrait generated.");
    } catch (err: any) {
      setError(err?.message || "Failed to generate portrait.");
    } finally {
      setGenerating(false);
    }
  };

  const onRefine = async () => {
    if (!selectedCaseId || !description.trim() || !refinementText.trim() || refining) return;
    setError("");
    setStatus("");
    setRefining(true);
    try {
      const out = await addRefinement({
        caseId: selectedCaseId,
        description: description.trim(),
        refinement: refinementText.trim(),
        attributeType: "general",
        strength,
      });
      const nextImage = out?.signed_image_url || out?.image_url || "";
      if (nextImage) setImageUrl(nextImage);

      if (out?.fallback_used) {
        setStatus(`Refinement applied with fallback (${out?.fallback_reason || "unknown"}).`);
      } else {
        setStatus("Refinement applied via img2img.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to apply refinement.");
    } finally {
      setRefining(false);
    }
  };

  const onAttributeChange = (label: string, value: string) => {
    setAttributes((prev) => ({ ...prev, [label]: value }));
  };

  return (
    <>
      <div className="max-w-7xl mx-auto py-6 px-6">
        <motion.div variants={stagger} initial="hidden" animate="show">
          {/* Stats Cards */}
          <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" variants={stagger}>
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                whileHover={{ scale: 1.02, y: -2 }}
                className="stat-card flex items-center gap-4 cursor-default group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-forensic group-hover:bg-primary/20">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground font-mono-data">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Navigation Tabs */}
          <motion.div variants={fadeUp} className="flex items-center gap-1 mb-0 border-b border-border pb-0">
            {navTabs.map((tab) => (
              <Link
                key={tab.label}
                to={tab.to}
                className={`px-4 py-2.5 text-sm font-medium transition-forensic border-b-2 -mb-px hover:text-foreground ${
                  location.pathname === tab.to
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </motion.div>
        </motion.div>

        {activeCase ? (
          <p className="text-xs text-muted-foreground mt-3">Active case: <span className="text-foreground">{activeCase.title || activeCase.case_id}</span></p>
        ) : (
          <p className="text-xs text-amber-500 mt-3">
            No case selected. <Link to="/create-case" className="underline underline-offset-2">Create a case</Link> to generate portraits.
          </p>
        )}

        {status ? <p className="text-xs text-emerald-500 mt-2">{status}</p> : null}
        {error ? <p className="text-xs text-destructive mt-2">{error}</p> : null}
      </div>

      {/* Portrait Generator - Full Width */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.15 }}
        className="flex flex-1 overflow-hidden bg-background border-t border-border"
        style={{ height: "calc(100vh - 56px - 180px)" }}
      >
        {/* Left Panel */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="w-80 border-r border-border bg-card p-5 overflow-y-auto shrink-0"
        >
          <DescriptionPanel
            cases={cases}
            selectedCaseId={selectedCaseId}
            onSelectCase={setSelectedCaseId}
            description={description}
            onDescriptionChange={setDescription}
            model={model}
            onModelChange={setModel}
            onGenerate={onGenerate}
            generating={generating}
          />
        </motion.aside>

        {/* Center Panel */}
        <main className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-auto">
          <div className="absolute inset-0 grid-blueprint opacity-20 pointer-events-none" />
          {!selectedCaseId ? (
            <div className="w-full max-w-xl rounded-lg border border-border bg-card p-8 text-center relative z-10">
              <p className="text-sm text-foreground font-medium">No active case selected</p>
              <p className="text-xs text-muted-foreground mt-2">Create a case first, then add a suspect description to generate a portrait.</p>
              <Link
                to="/create-case"
                className="inline-flex items-center justify-center mt-5 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm transition-forensic"
              >
                Create Case
              </Link>
            </div>
          ) : imageUrl ? (
            <button
              onClick={() => setLightboxOpen(true)}
              className="w-full max-w-lg aspect-[3/4] rounded-lg border border-border bg-card p-3"
            >
              <img src={imageUrl} alt="Generated portrait" className="w-full h-full object-contain rounded" />
            </button>
          ) : (
            <SketchPlaceholder onClick={() => setLightboxOpen(true)} />
          )}
        </main>

        {/* Right Panel */}
        <motion.aside
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="w-72 border-l border-border bg-card p-5 overflow-y-auto shrink-0"
        >
          <AttributePanel
            selectedAttributes={attributes}
            onAttributeChange={onAttributeChange}
            refinementText={refinementText}
            onRefinementTextChange={setRefinementText}
            strength={strength}
            onStrengthChange={setStrength}
            onRefine={onRefine}
            refining={refining}
            disabled={!selectedCaseId || !description.trim()}
          />
        </motion.aside>
      </motion.div>

      {/* Lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title="Portrait Preview"
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Portrait Preview" className="w-[500px] max-w-[80vw] h-auto rounded-lg border border-border bg-card" />
        ) : (
          <div className="w-[500px] aspect-[3/4] bg-card border border-border rounded-lg flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
              <Search className="h-8 w-8" />
            </div>
            <p className="font-mono-data text-xs text-muted-foreground uppercase mt-4">No Portrait Generated</p>
            <p className="text-[11px] text-muted-foreground mt-1">Generate a sketch to view it here</p>
          </div>
        )}
      </ImageLightbox>
    </>
  );
}
