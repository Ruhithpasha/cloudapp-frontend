import { useRef, useState, useEffect, useCallback } from "react";
import RestoreDialog from "./RestoreDialog";

/**
 * ImageUploader component:
 * - Lets user select, preview, and upload an image to Cloudinary
 * - Stores both secure_url and local backup in localStorage for gallery/restore
 * - Checks gallery Cloudinary URLs for existence, and allows restore if missing
 * - Integrates RestoreDialog for restoration if image is gone from Cloudinary
 * - NOW: Periodically (every 30s) checks for missing images and auto-prompts restore dialog
 * - NO createObjectURL errors: all uses are gated with instanceof File
 * 
 * For Vite, requires .env in frontend root:
 *   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
 */
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const LOCAL_STORAGE_IMAGE_KEY_PREFIX = 'cloud_image_';
const LOCAL_BACKUP_IMAGE_KEY_PREFIX = 'backup_image_';
const POLL_INTERVAL_MS = 30000; // 30 seconds
// Polling interval for checking missing images
// and restoring them if needed


// ImageUploader component
// This component allows users to upload images to Cloudinary and manage local backups
// It provides a gallery view of uploaded images and handles restoration of missing images
// It also includes a restore dialog for user confirmation before restoring images
// It uses localStorage to store image data and backup keys
// It uses the Cloudinary API for image uploads and checks for image existence
// It uses React hooks for state management and side effects
// It uses functional components and hooks for better performance and readability
// It uses Tailwind CSS for styling and layout
// It uses the Fetch API for network requests and error handling
// It uses the FileReader API for reading files and creating local backups
const ImageUploader = () => {
  const fileInputRef = useRef();
  const [selectedFile, setSelectedFile] = useState(null);        // Always a File or null
  const [selectedFileBackupKey, setSelectedFileBackupKey] = useState(null);  // backupKey for pending upload
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [galleryImages, setGalleryImages] = useState([]);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [imageToRestore, setImageToRestore] = useState(null);
  
  // For tracking queue of missing images for restore
  const [missingForRestore, setMissingForRestore] = useState([]);
  
  // Track images that user has explicitly cancelled restoring
  const [suppressedKeys, setSuppressedKeys] = useState([]);

  // Helper: Safe base64 backup creator
  const createLocalBackup = (image) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(image);
      console.log("Creating local backup for image:", image);
    });
  };

  // Updated to fetch images from the backend and render previews
  const loadGalleryImages = async () => {
    try {
      console.log("Fetching gallery images from backend...");
      const response = await fetch("http://localhost:3001/images");
      if (!response.ok) {
        throw new Error("Failed to fetch images from backend");
      }
      const images = await response.json();
      console.log("Fetched images from backend:", images);
      setGalleryImages(images.filter(img => img.status === 'available'));
    } catch (err) {
      console.error("Error loading gallery images:", err);
      setGalleryImages([]); // Clear gallery on error
    }
  };

  // Load gallery on mount and when storage updates
  useEffect(() => {
    loadGalleryImages();
    const handleStorage = () => loadGalleryImages();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // For preview: only run if selectedFile is a real File
  useEffect(() => {
    if (selectedFile && selectedFile instanceof File) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  // When new upload occurs, update gallery
  useEffect(() => {
    if (uploadedUrl) {
      loadGalleryImages();
    }
  }, [uploadedUrl]);

  // Check if an image exists on Cloudinary by attempting a HEAD request
  const checkCloudinaryImage = async (url) => {
    // Add a random query param to avoid CDN cache confusion
    const urlWithCacheBust = url + (url.includes("?") ? "&" : "?") + "_cb=" + Date.now();

    // Add logging to debug URLs being checked in `checkCloudinaryImage`
    console.log("Checking Cloudinary URL:", urlWithCacheBust);

    try {
      const resp = await fetch(urlWithCacheBust, { method: "HEAD", mode: "cors" });
      if (resp.ok) {
        // 2xx means image exists
        return true;
      } else if (resp.status === 404) {
        // Not found
        return false;
      } else {
        // If any other status (403?), fallback to GET
        const getResp = await fetch(urlWithCacheBust, { method: "GET", mode: "cors" });
        if (getResp.ok) return true;
        if (getResp.status === 404) return false;
        // Any other non-2xx: log and treat as missing
        console.warn("Unexpected Cloudinary response status on GET:", getResp.status);
        return false;
      }
    } catch (err) {
      console.log("CORS/network error when checking Cloudinary image:", err);
      // Most likely image missing or blocked
      return false;
    }
  };

  // Remove image from localStorage and gallery
  const handleRemoveImage = (key, backupKey) => {
    console.log("Removing image from gallery only, no localStorage interaction.");
    loadGalleryImages();
  };

  // For toggling the restore dialog
  const handleRestoreRequest = (img) => {
    setImageToRestore(img);
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    console.log("Restoring image without localStorage backup.");
    alert("Restore functionality is disabled as localStorage is no longer used.");
  };

  const handleRestoreCancel = () => {
    setRestoreDialogOpen(false);
    console.log("Restore cancelled for image:", imageToRestore);
    
    // Suppress this key from restore until reload
    if (imageToRestore && imageToRestore.key) {
      setSuppressedKeys(prev => [...prev, imageToRestore.key]);
      console.log("Suppressed key:", imageToRestore.key);
    }
    setImageToRestore(null);
    dequeueNextRestore();
  };
  
  // Queue management for missing images
  const enqueueMissingForRestore = useCallback((missingImages) => {
    setMissingForRestore((prev) => [...prev, ...missingImages]);
  }, []);

  const dequeueNextRestore = useCallback(() => {
    setMissingForRestore((prev) => {
      const [, ...rest] = prev;
      // Open dialog for next in line, if any (skip those without local backup)
      if (rest.length > 0) {
        let idx = 0;
        while (idx < rest.length && !rest[idx].backupKey) idx++;
        if (idx < rest.length) {
          setImageToRestore(rest[idx]);
          setRestoreDialogOpen(true);
          // Remove all before idx
          return rest.slice(idx);
        }
        // If none have backupKey, just clear the queue
        return [];
      }
      return [];
    });
  }, []);

  // When missingForRestore changes, and dialog is not open, open dialog for first
  useEffect(() => {
    if (!restoreDialogOpen && missingForRestore.length > 0) {
      let idx = 0;
      while (idx < missingForRestore.length && !missingForRestore[idx].backupKey) idx++;
      if (idx < missingForRestore.length) {
        setImageToRestore(missingForRestore[idx]);
        setRestoreDialogOpen(true);
        setMissingForRestore((old) => old.slice(idx)); // trim queue to start at idx
      } else {
        setMissingForRestore([]);
      }
    }
  }, [missingForRestore, restoreDialogOpen]);

  // AUTO POLLING: periodically check Cloudinary for missing images
  useEffect(() => {
    let polling = true;
    const poll = async () => {
      if (!galleryImages || galleryImages.length === 0) return;
      const missingImages = [];
      await Promise.all(
        galleryImages.map(async (img) => {
          // Only if the entry has a Cloudinary URL and backupKey (can restore)
          // And not in the suppressed list (user previously cancelled)
          if (img.url && img.backupKey && !suppressedKeys.includes(img.key)) {
            const exists = await checkCloudinaryImage(img.url);
            if (!exists) missingImages.push(img);
          }
        })
      );
      if (polling && missingImages.length > 0) {
        // Only enqueue images not already in the current restore queue or being shown
        setMissingForRestore((prev) => {
          const needed = missingImages.filter(
            (img) =>
              !prev.some((q) => q.key === img.key) &&
              (!imageToRestore || img.key !== imageToRestore.key)
          );
          return prev.concat(needed);
        });
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    // Also, do the initial poll as soon as images change
    poll();

    return () => {
      polling = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryImages, imageToRestore, suppressedKeys]);

  // File selection handler; always set selectedFile to a File, and store backupKey separately
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    setSelectedFile(file || null);
    setUploadedUrl(null);
    setErrorMsg("");
    setPreviewUrl(null);
    setSelectedFileBackupKey(null);

    if (file) {
      const backupKey = `${LOCAL_BACKUP_IMAGE_KEY_PREFIX}${Date.now()}`;
      const dataUrl = await createLocalBackup(file);
      setSelectedFileBackupKey(backupKey);
    }
  };

  // Removed logic for saving the image in the browser's local storage
  const handleUploadClick = async () => {
    if (!selectedFile || !(selectedFile instanceof File)) {
      setErrorMsg("No file selected.");
      return;
    }

    setUploading(true);
    setErrorMsg("");

    // Updated the field name to match the backend
    const formData = new FormData();
    formData.append("image", selectedFile); // Changed "file" to "image"

    try {
      const response = await fetch("http://localhost:3001/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.json();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await response.json();
      alert("File uploaded successfully!");
      setUploadedUrl(data.path); // Use the server path for the uploaded file
    } catch (err) {
      setErrorMsg("Failed to upload: " + err.message);
    } finally {
      setUploading(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  // Gallery grid: shows restore for missing images, and avoids crash if old data format exists
  // Updated the GalleryGrid component to hide file names and show only image previews
  // Updated logic to ensure images are rendered correctly
  // Ensure the `GalleryGrid` function renders images correctly
  const GalleryGrid = () => {
    if (!galleryImages || galleryImages.length === 0) {
      return <div className="text-gray-400 text-center">No images available</div>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {galleryImages.map((image) => (
          <div
            key={image.id}
            className="bg-gray-900 rounded-lg flex flex-col items-center justify-center p-2 shadow relative"
          >
            {image.filename ? (
              <img
                src={`http://localhost:3001/uploads/${image.filename}`}
                alt="Image preview"
                className="max-h-32 w-auto rounded mb-2"
                style={{ background: "#222" }}
              />
            ) : (
              <div className="text-gray-400 text-center">No preview available</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Cloud &amp; Local Image Manager</h2>
      {/* Uploader section */}
      <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-md mb-8 w-full">
        <div className="w-60 h-60 flex items-center justify-center bg-gray-100 rounded mb-4 overflow-hidden">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="object-contain max-h-full max-w-full"
            />
          ) : (
            <span className="text-gray-400">Image preview will appear here</span>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          id="file-upload"
          onChange={handleFileChange}
        />
        <div className="flex gap-2 w-full justify-center">
          <label
            htmlFor="file-upload"
            className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 transition text-center"
          >
            Choose Image
          </label>
          <button
            className={`px-6 py-2 bg-green-500 text-white rounded shadow hover:bg-green-600 transition ${
              !selectedFile || uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={handleUploadClick}
            disabled={!selectedFile || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        {selectedFile && selectedFile instanceof File && (
          <div className="mt-2 text-gray-700 text-sm">
            Selected: <span className="font-medium">{selectedFile.name}</span>
          </div>
        )}
        {uploadedUrl && (
          <div className="mt-4 text-green-400 break-words text-xs">
            Uploaded! <a href={uploadedUrl} className="underline" target="_blank" rel="noopener noreferrer">{uploadedUrl}</a>
          </div>
        )}
        {errorMsg && (
          <div className="mt-2 text-red-400 text-xs">{errorMsg}</div>
        )}
      </div>

      {/* Gallery section */}
      <section className="py-4 px-2">
        <h3 className="text-xl font-semibold mb-4 text-center">
          Images on the Local Storage
        </h3>
        {galleryImages.length === 0 ? (
          <div className="text-gray-400 text-center">
            No images found in local storage.
          </div>
        ) : (
          <GalleryGrid />
        )}
      </section>
      <RestoreDialog
        open={restoreDialogOpen}
        image={imageToRestore}
        onRestore={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
      />
    </div>
  );
};

export default ImageUploader;
