import { BannerOptions } from "../types";

interface Props extends BannerOptions {
  onClose: () => void;
}

export default function AppBanner({
  title,
  description,
  variant = "info",
  onClose,
}: Props) {
  const variantStyles = {
    success: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
    warning: "bg-yellow-100 text-yellow-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <div className={`p-4 ${variantStyles[variant]} flex justify-between`}>
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="text-sm">{description}</p>}
      </div>
      <button onClick={onClose}>✕</button>
    </div>
  );
}