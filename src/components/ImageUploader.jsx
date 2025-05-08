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

// Add this helper function at the top of the file, after the imports
const getOptimizedImageUrl = (url) => {
  if (!url) return '';
  // If it's a Cloudinary URL, add optimization parameters
  if (url.includes('cloudinary.com')) {
    // Add f_auto for automatic format selection
    // Add q_auto for automatic quality optimization
    // Add w_auto for automatic width based on device
    // Add c_scale for proper scaling
    return url.replace('/upload/', '/upload/f_auto,q_auto,w_auto,c_scale/');
  }
  return url;
};

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
      reader.onload = (e) => {
        const backupData = {
          data: e.target.result,
          originalName: image.name,
          timestamp: new Date().toISOString(),
          type: image.type,
          size: image.size
        };
        resolve(backupData);
      };
      reader.onerror = reject;
      reader.readAsDataURL(image);
      console.log("Creating local backup for image:", image.name);
    });
  };

  // Updated to fetch images from the backend and render previews
  const loadGalleryImages = async () => {
    try {
      console.log("Fetching gallery images from backend...");
      const response = await fetch("/api/images");
      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.statusText}`);
      }
      const images = await response.json();
      
      // Enhance images with local backup data
      const enhancedImages = images.map(image => {
        const backupKey = image.backupKey;
        if (backupKey) {
          const backupData = localStorage.getItem(backupKey);
          if (backupData) {
            try {
              const parsedBackup = JSON.parse(backupData);
              return {
                ...image,
                localBackup: parsedBackup
              };
            } catch (e) {
              console.error("Error parsing backup data:", e);
            }
          }
        }
        return image;
      });

      console.log("Fetched images with local backups:", enhancedImages);
      setGalleryImages(enhancedImages);
    } catch (err) {
      console.error("Error loading gallery images:", err);
      setErrorMsg("Failed to load images: " + (err.message || "Network error. Please try again."));
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

  // Updated `handleRestoreConfirm` to restore images to Cloudinary
  const handleRestoreConfirm = async () => {
    if (!imageToRestore || !imageToRestore.id) {
      alert("No image selected for restoration.");
      return;
    }

    try {
      setUploading(true);
      const response = await fetch(`/api/restore/${imageToRestore.id}`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Restore failed: ${response.statusText}`);
      }

      const restoredImage = await response.json();
      alert("Image restored successfully!");

      // Update the gallery after restoration
      loadGalleryImages();
    } catch (err) {
      console.error("Error restoring image:", err);
      alert("Failed to restore image: " + (err.message || "Network error. Please try again."));
    } finally {
      setUploading(false);
      setRestoreDialogOpen(false);
      setImageToRestore(null);
    }
  };

  const handleRestoreCancel = () => {
    setRestoreDialogOpen(false);
    console.log("Restore cancelled for image:", imageToRestore);
    
    // Suppress this key from restore until reload
    if (imageToRestore && imageToRestore.id) {
      setSuppressedKeys(prev => [...prev, imageToRestore.id]);
      console.log("Suppressed key:", imageToRestore.id);
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
      const nextImage = missingForRestore[0];
      if (nextImage) {
        setImageToRestore(nextImage);
        setRestoreDialogOpen(true);
        setMissingForRestore(prev => prev.slice(1)); // Remove the first item
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
          // Check if image has a Cloudinary URL and is not already marked as missing
          if (img.cloudinaryUrl && img.status !== 'missing' && !suppressedKeys.includes(img.id)) {
            const exists = await checkCloudinaryImage(img.cloudinaryUrl);
            if (!exists) {
              console.log("Image missing in Cloudinary:", img.cloudinaryUrl);
              missingImages.push({...img, status: 'missing'});
            }
          }
        })
      );
      if (polling && missingImages.length > 0) {
        console.log("Found missing images:", missingImages);
        // Only enqueue images not already in the current restore queue or being shown
        setMissingForRestore((prev) => {
          const needed = missingImages.filter(
            (img) =>
              !prev.some((q) => q.id === img.id) &&
              (!imageToRestore || img.id !== imageToRestore.id)
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
      try {
        const backupKey = `${LOCAL_BACKUP_IMAGE_KEY_PREFIX}${Date.now()}`;
        const backupData = await createLocalBackup(file);
        localStorage.setItem(backupKey, JSON.stringify(backupData));
        setSelectedFileBackupKey(backupKey);
        console.log("Local backup created with key:", backupKey);
      } catch (err) {
        console.error("Error creating local backup:", err);
        setErrorMsg("Failed to create local backup");
      }
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

    try {
      // Create local backup before uploading
      const backupKey = `${LOCAL_BACKUP_IMAGE_KEY_PREFIX}${Date.now()}`;
      const backupData = await createLocalBackup(selectedFile);
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      console.log("Local backup created with key:", backupKey);

      // Updated the field name to match the backend
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("backupKey", backupKey);
      formData.append("backupData", JSON.stringify(backupData));
      formData.append("originalName", selectedFile.name);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      alert("File uploaded successfully!");
      setUploadedUrl(data.path);
      loadGalleryImages(); // Refresh gallery after upload
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMsg("Failed to upload: " + (err.message || "Network error. Please try again."));
    } finally {
      setUploading(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  // Gallery grid: shows restore for missing images, and avoids crash if old data format exists
  const GalleryGrid = () => {
    if (!galleryImages || galleryImages.length === 0) {
      return <div className="text-gray-400 text-center">No images available</div>;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {galleryImages.map((image) => (
          <div
            key={image.id}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100"
          >
            <div className="aspect-square relative bg-gray-50">
              {image.filename ? (
                <img
                  src={`/api/uploads/${image.filename}`}
                  alt={image.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : image.cloudinaryUrl ? (
                <img
                  src={getOptimizedImageUrl(image.cloudinaryUrl)}
                  alt={image.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    console.error('Error loading image:', image.cloudinaryUrl);
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik00IDE2bDQuNTg2LTQuNTg2YTIgMiAwIDAxMi44MjggMEwxNiAxNm0tMi0ybDEuNTg2LTEuNTg2YTIgMiAwIDAxMi44MjggMEwyMCAxNG0tNi02aC4wMU02IDIwaDEyYTIgMiAwIDAwMi0yVjZhMiAyIDAgMDAtMi0ySDZhMiAyIDAgMDAtMiAydjEyYTIgMiAwIDAwMiAyeiIvPjwvc3ZnPg==';
                  }}
                />
              ) : image.localBackup?.data ? (
                <img
                  src={image.localBackup.data}
                  alt={image.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="text-sm text-gray-600 mb-2 truncate" title={image.originalName}>
                {image.originalName}
              </div>
              {image.status === 'missing' && image.localBackup && (
                <button
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-300 flex items-center justify-center gap-2"
                  onClick={() => handleRestoreRequest(image)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Restore
                </button>
              )}
              {image.status === 'missing' && !image.localBackup && (
                <div className="w-full px-4 py-2 bg-red-100 text-red-600 rounded-lg flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  No Backup
                </div>
              )}
              {image.status === 'available' && (
                <div className="w-full px-4 py-2 bg-green-100 text-green-600 rounded-lg flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Available
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
        Cloud &amp; Local Image Manager
      </h2>
      
      {/* Uploader section */}
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl mb-12 w-full bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="w-72 h-72 flex items-center justify-center bg-gray-50 rounded-lg mb-6 overflow-hidden border-2 border-gray-100">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="object-contain max-h-full max-w-full rounded-lg"
            />
          ) : (
            <div className="text-center p-6">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-500">Image preview will appear here</span>
            </div>
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
        <div className="flex gap-4 w-full justify-center">
          <label
            htmlFor="file-upload"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 shadow-md flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Choose Image
          </label>
          <button
            className={`px-6 py-3 bg-green-500 text-white rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 flex items-center gap-2 ${
              !selectedFile || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'
            }`}
            onClick={handleUploadClick}
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </>
            )}
          </button>
        </div>
        {selectedFile && selectedFile instanceof File && (
          <div className="mt-4 text-gray-600 text-sm bg-gray-50 px-4 py-2 rounded-lg">
            Selected: <span className="font-medium">{selectedFile.name}</span>
          </div>
        )}
        {uploadedUrl && (
          <div className="mt-4 text-green-600 bg-green-50 px-4 py-2 rounded-lg text-sm">
            Uploaded! <a href={uploadedUrl} className="underline hover:text-green-700" target="_blank" rel="noopener noreferrer">{uploadedUrl}</a>
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Gallery section */}
      <section className="py-8 px-4 bg-white rounded-xl shadow-sm">
        <h3 className="text-2xl font-semibold mb-8 text-center text-gray-800">
          Your Images
        </h3>
        {galleryImages.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500">No images found. Upload one to get started.</p>
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
