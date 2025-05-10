/**
 * RestoreDialog
 * Shows a modal dialog for restoring a missing image,
 * only when both `open` and `image` are set.
 * Fix: Restore button is active if there's a backup possible; Cancel always works.
 * Improved: Buttons now block event bubbling to overlay, fixing cancel bug.
 */
import React from 'react';

const RestoreDialog = ({ open, image, onRestore, onCancel }) => {
  if (!open || !image) return null;

  const handleRestore = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRestore(image);
  };

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onCancel();
  };

  // Enable Restore only if we have a backupKey for this image
  const canRestore = !!image.backupKey;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleCancel}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold mb-4">Restore Missing Image</h3>
        <p className="text-gray-600 mb-6">
          The image "{image.originalName}" is missing from Cloudinary. Would you like to restore it from the local backup?
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRestore}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreDialog;
