import { useRef, useState, useEffect, useCallback } from "react";
import { API_URL } from "../config";
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
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [galleryImages, setGalleryImages] = useState([]);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [imageToRestore, setImageToRestore] = useState(null);
  const [missingForRestore, setMissingForRestore] = useState([]);
  const [suppressedKeys, setSuppressedKeys] = useState(() => {
    // Load suppressed keys from localStorage on component mount
    const saved = localStorage.getItem('suppressedKeys');
    return saved ? JSON.parse(saved) : [];
  });

  // Save suppressed keys to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('suppressedKeys', JSON.stringify(suppressedKeys));
  }, [suppressedKeys]);

  // Check if an image exists on Cloudinary with timeout
  const checkCloudinaryImage = async (url) => {
    if (!url) {
      console.log("No Cloudinary URL provided");
      return false;
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      // Extract the public ID from the Cloudinary URL
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const publicId = pathParts[pathParts.length - 1].split('.')[0];
      
      // Construct the Cloudinary URL for checking
      const checkUrl = `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;
      console.log("Checking Cloudinary URL:", checkUrl);

      const resp = await fetch(checkUrl, { 
        method: "HEAD",
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'image/*'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (resp.ok) {
        console.log("Image exists:", checkUrl);
        return true;
      }

      console.log("Image not found:", checkUrl);
      return false;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("Image check timed out:", url);
      } else {
        console.error("Error checking Cloudinary image:", err);
      }
      return false;
    }
  };

  // Check if local file exists
  const checkLocalFile = async (filename) => {
    try {
      const response = await fetch(`${API_URL}/uploads/${filename}`, {
        method: 'HEAD'
      });
      return response.ok;
    } catch (err) {
      console.error("Error checking local file:", err);
      return false;
    }
  };

  // Load gallery images with status check
  const loadGalleryImages = async () => {
    try {
      console.log("Fetching gallery images from:", `${API_URL}/local-images`);
      const response = await fetch(`${API_URL}/local-images`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.statusText}`);
      }
      
      const images = await response.json();
      console.log("Successfully received images:", images);
      
      // Update images with suppressed status
      const updatedImages = images.map(img => ({
        ...img,
        canRestore: img.status === 'missing' && !suppressedKeys.includes(img.filename)
      }));
      
      console.log("Updated images with restore status:", updatedImages);
      setGalleryImages(updatedImages);

      // Only show restore dialog for images that are missing and can be restored
      const missingImages = updatedImages.filter(img => 
        img.status === 'missing' && 
        img.canRestore && 
        !suppressedKeys.includes(img.filename)
      );

      console.log("Missing images that can be restored:", missingImages);
      console.log("Current suppressed keys:", suppressedKeys);

      if (missingImages.length > 0 && !restoreDialogOpen) {
        console.log("Found missing images that can be restored:", missingImages);
        setMissingForRestore(missingImages);
        setImageToRestore(missingImages[0]);
        setRestoreDialogOpen(true);
      }
    } catch (err) {
      console.error("Error loading gallery images:", err);
      setErrorMsg("Failed to load images: " + err.message);
    }
  };

  // Load gallery on mount
  useEffect(() => {
    loadGalleryImages();
  }, []);

  // Create preview URL when file is selected
  useEffect(() => {
    if (selectedFile && selectedFile instanceof File) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  // File selection handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    setErrorMsg("");
  };

  // Upload handler
  const handleUpload = async (file) => {
    try {
      setUploading(true);
      setErrorMsg(null);

      console.log("Starting upload to:", `${API_URL}/upload`);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      console.log("Upload response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Upload successful:", data);
      
      // Refresh gallery
      await loadGalleryImages();
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMsg("Failed to upload image: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Handle restore request
  const handleRestoreRequest = (img) => {
    console.log("Restore requested for image:", img);
    setImageToRestore(img);
    setRestoreDialogOpen(true);
  };

  // Handle restore confirmation
  const handleRestoreConfirm = async (image) => {
    if (!image || !image.filename) {
      console.error("No image selected for restoration");
      return;
    }

    // Close dialog and clear states immediately
    setRestoreDialogOpen(false);
    setImageToRestore(null);
    setMissingForRestore([]);

    try {
      setUploading(true);
      console.log("Restoring image:", image);
      
      const response = await fetch(`${API_URL}/restore/${image.filename}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Restore failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Image restored successfully:", result);

      // Add the image to suppressed keys to prevent showing restore dialog again
      setSuppressedKeys(prev => {
        const newKeys = [...prev, image.filename];
        // Save to localStorage immediately
        localStorage.setItem('suppressedKeys', JSON.stringify(newKeys));
        return newKeys;
      });

      // Update the gallery state directly with the restored image data
      setGalleryImages(prev => prev.map(img => 
        img.filename === image.filename 
          ? {
              ...img,
              cloudinaryUrl: result.data.cloudinaryUrl,
              cloudinaryPublicId: result.data.cloudinaryPublicId,
              status: 'available',
              canRestore: false
            }
          : img
      ));

      // Clear suppressed keys after successful restore
      setSuppressedKeys([]);
      localStorage.removeItem('suppressedKeys');

      // Refresh the gallery after a short delay to ensure everything is in sync
      setTimeout(() => {
        loadGalleryImages();
      }, 1000);
    } catch (err) {
      console.error("Error restoring image:", err);
      setErrorMsg("Failed to restore image: " + (err.message || "Network error. Please try again."));
    } finally {
      setUploading(false);
    }
  };

  const handleRestoreCancel = () => {
    console.log("Restore cancelled for image:", imageToRestore);
    setRestoreDialogOpen(false);
    setImageToRestore(null);
    setMissingForRestore([]);
  };

  // Queue management for missing images
  const enqueueMissingForRestore = useCallback((missingImages) => {
    setMissingForRestore((prev) => [...prev, ...missingImages]);
  }, []);

  const dequeueNextRestore = useCallback(() => {
    setMissingForRestore((prev) => {
      const [, ...rest] = prev;
      // Open dialog for next in line, if any
      if (rest.length > 0) {
        setImageToRestore(rest[0]);
        setRestoreDialogOpen(true);
        return rest.slice(1);
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

  // Add periodic status check with debounce
  useEffect(() => {
    let timeoutId;
    let isChecking = false;

    const checkStatus = async () => {
      if (isChecking || galleryImages.length === 0) return;
      
      isChecking = true;
      console.log("Running periodic status check");
      
      try {
        // Refresh the gallery to get updated statuses
        await loadGalleryImages();
      } catch (err) {
        console.error("Error in periodic status check:", err);
      } finally {
        isChecking = false;
      }
    };

    const debouncedCheck = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkStatus, 30000); // Check every 30 seconds
    };

    debouncedCheck();
    return () => {
      clearTimeout(timeoutId);
    };
  }, [galleryImages, restoreDialogOpen, suppressedKeys]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
        Local Image Manager
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
            onClick={() => handleUpload(selectedFile)}
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
        {selectedFile && (
          <div className="mt-4 text-gray-600 text-sm bg-gray-50 px-4 py-2 rounded-lg">
            Selected: <span className="font-medium">{selectedFile.name}</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {galleryImages.map((image) => (
              <div
                key={image.filename}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100"
              >
                <div className="aspect-square relative bg-gray-50">
                  <img
                    src={image.cloudinaryUrl || `${API_URL}/uploads/${image.filename}`}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      console.error('Error loading image:', image.filename);
                      if (image.cloudinaryUrl && e.target.src === image.cloudinaryUrl) {
                        e.target.src = `${API_URL}/uploads/${image.filename}`;
                        setGalleryImages(prev => 
                          prev.map(img => 
                            img.filename === image.filename 
                              ? { ...img, status: 'missing' }
                              : img
                          )
                        );
                      } else {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGQ9Ik00IDE2bDQuNTg2LTQuNTg2YTIgMiAwIDAxMi44MjggMEwxNiAxNm0tMi0ybDEuNTg2LTEuNTg2YTIgMiAwIDAxMi44MjggMEwyMCAxNG0tNi02aC4wMU02IDIwaDEyYTIgMiAwIDAwMi0yVjZhMiAyIDAgMDAtMi0ySDZhMiAyIDAgMDAtMiAydjEyYTIgMiAwIDAwMiAyeiIvPjwvc3ZnPg==';
                      }
                    }}
                  />
                  {image.status === 'missing' && (
                    <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-semibold">Missing</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-2 truncate" title={image.originalName}>
                    {image.originalName}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500">
                      {image.size ? `${(image.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      image.status === 'missing' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {image.status === 'missing' ? 'Missing' : 'Available'}
                    </div>
                  </div>
                  {image.status === 'missing' && image.canRestore && (
                    <button
                      className="w-full mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-300 flex items-center justify-center gap-2"
                      onClick={() => handleRestoreRequest(image)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
