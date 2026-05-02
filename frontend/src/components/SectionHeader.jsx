/**
 * SectionHeader - Clean section divider with title
 */
export default function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-6 pt-2">
      <h2 className="text-lg font-semibold text-white mb-1">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-gray-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}
