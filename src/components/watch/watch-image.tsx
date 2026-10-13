import { Watch as WatchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Image privée servie par /api/files/image/[id] (autorisation vérifiée à chaque requête).
 * next/image n'est pas utilisé : son optimiseur ne transmettrait pas le cookie de session.
 */
export function WatchImage({ imageId, alt, className }: { imageId?: string | null; alt: string; className?: string }) {
  if (!imageId) {
    return (
      <div className={cn("flex items-center justify-center bg-mist text-line-strong", className)} aria-hidden>
        <WatchIcon className="size-10" strokeWidth={1} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/files/image/${imageId}`}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("bg-mist object-cover", className)}
    />
  );
}
