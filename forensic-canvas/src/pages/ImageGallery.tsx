import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FolderOpen, Image } from "lucide-react";
import { getCurrentCaseId, getTimeline } from "@/lib/api";

type GalleryItem = {
  url: string;
  createdAt: string;
};

export default function ImageGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [error, setError] = useState("");
  const [activeCaseId] = useState(getCurrentCaseId());

  useEffect(() => {
    const run = async () => {
      if (!activeCaseId) return;
      try {
        const timeline = await getTimeline(activeCaseId);
        const events = (timeline.timeline || [])
          .filter((e) => e?.event_type === "sketch")
          .map((e) => ({
            url: (e.payload?.signed_image_url || e.payload?.image_url || "").trim(),
            createdAt: e.payload?.created_at || "",
          }))
          .filter((x) => !!x.url);
        setItems(events);
      } catch (err: any) {
        setError(err?.message || "Failed to load gallery.");
      }
    };
    run();
  }, [activeCaseId]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-forensic"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Image className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-medium text-foreground">Image Gallery</h1>
          <p className="text-xs text-muted-foreground">Latest generated and refined portraits for active case.</p>
        </div>
      </div>

      {!activeCaseId ? (
        <div className="surface-card rounded-lg p-8 text-sm text-muted-foreground">
          No active case selected. Select one in <Link to="/case-management" className="text-primary underline">Case Management</Link>.
        </div>
      ) : error ? (
        <div className="surface-card rounded-lg p-8 text-sm text-destructive">{error}</div>
      ) : items.length === 0 ? (
        <div className="surface-card rounded-lg p-12 text-center">
          <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground opacity-50 mb-3" />
          <p className="text-sm text-muted-foreground">No images yet for this case.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <div key={`${item.url}-${idx}`} className="surface-card rounded-lg p-3">
              <img src={item.url} alt="Case portrait" className="w-full aspect-[3/4] object-contain rounded bg-card border border-border" />
              <p className="text-[11px] text-muted-foreground mt-2">{item.createdAt || "Unknown time"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
