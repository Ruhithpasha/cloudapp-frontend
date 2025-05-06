const ImageList = ({ images }) => (
  <div>
    <h2 className="font-bold mb-3 text-lg">Images</h2>
    {images.length === 0 ? (
      <p>No images found. Upload one to get started.</p>
    ) : (
      <ul className="flex flex-col gap-2">
        {images.map(img => (
          <li
            key={img.id}
            className="flex items-center gap-2 border p-2 rounded"
          >
            <span>{img.originalName}</span>
            {img.cloudinaryUrl && img.status !== "missing" && (
              <a
                href={img.cloudinaryUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 underline"
              >
                [View]
              </a>
            )}
            {img.status === "missing" && (
              <span className="px-2 py-1 text-sm text-white bg-red-500 rounded">
                Missing on Cloudinary
              </span>
            )}
          </li>
        ))}
      </ul>
    )}
  </div>
);
export default ImageList;