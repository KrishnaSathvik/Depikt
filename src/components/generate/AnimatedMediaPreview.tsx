import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaMetadata } from "@/lib/generation/media";

export function AnimatedMediaPreview({
  url,
  alt,
  metadata,
}: {
  url: string;
  alt: string;
  metadata?: MediaMetadata;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [restart, setRestart] = useState(0);
  useEffect(() => {
    setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [url]);
  const freeze = () => {
    const image = imageRef.current,
      canvas = canvasRef.current;
    if (!image || !canvas) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
    setPlaying(false);
  };
  return (
    <div className="relative h-full w-full">
      <img
        key={`${url}:${restart}`}
        ref={imageRef}
        src={url}
        alt={alt}
        onLoad={() => {
          if (!playing) freeze();
        }}
        className={
          playing
            ? "h-full w-full object-contain"
            : "absolute h-full w-full object-contain invisible"
        }
      />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        className={playing ? "hidden" : "h-full w-full object-contain"}
      />
      <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-background p-1 text-foreground">
        <Button
          size="icon"
          className="min-h-11 min-w-11"
          variant="outline"
          aria-label={playing ? "Pause animation" : "Play animation"}
          title={playing ? "Pause animation" : "Play animation"}
          onClick={() => (playing ? freeze() : setPlaying(true))}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button
          size="icon"
          className="min-h-11 min-w-11"
          variant="outline"
          aria-label="Restart animation"
          title="Restart animation"
          onClick={() => {
            setRestart((n) => n + 1);
            setPlaying(true);
          }}
        >
          <RotateCcw className="size-4" />
        </Button>
        {metadata?.durationMs && (
          <span className="text-body-sm">
            {metadata.frameCount} frames · {(metadata.durationMs / 1000).toFixed(2)} s
          </span>
        )}
      </div>
    </div>
  );
}
