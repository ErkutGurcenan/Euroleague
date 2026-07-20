export default function Headshot({
  src,
  name,
  size = 24,
}: {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="shrink-0 rounded-full bg-neutral-800 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-neutral-800 font-medium text-neutral-500"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name?.trim().charAt(0) ?? "?"}
    </span>
  );
}
