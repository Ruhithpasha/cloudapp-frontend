/**
 * RestoreDialog
 * Shows a modal dialog for restoring a missing image,
 * only when both `open` and `image` are set.
 * Fix: Restore button is active if there's a backup possible; Cancel always works.
 * Improved: Buttons now block event bubbling to overlay, fixing cancel bug.
 */
const RestoreDialog = ({ open, image, onRestore, onCancel }) => {
  if (!open || !image) return null;

  // Enable Restore only if we have a backupKey for this image
  const canRestore = !!image.backupKey;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 transition-opacity opacity-100 z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-96 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Restore Image</h2>
          <p className="text-sm text-gray-600">
            Image <b>{image.originalName || image.key}</b> is missing on Cloudinary.
            <br />
            <span>
              {canRestore
                ? "Restore it from local backup?"
                : "No local backup found. You cannot restore this image."}
            </span>
          </p>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${
              !canRestore ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={e => {
              e.stopPropagation();
              if (canRestore && onRestore) onRestore(e);
            }}
            disabled={!canRestore}
            type="button"
          >
            Restore
          </button>
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={e => {
              e.stopPropagation();
              if (onCancel) onCancel(e);
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreDialog;
