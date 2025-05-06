import React from "react";

const BACKEND_URL = "http://localhost:3001";

const LocalImageList = ({ images }) => (
  <div>
    <h2 className="font-bold mb-3 text-lg">Local Storage Images</h2>
    {images.length === 0 ? (
      <p>No local images found.</p>
    ) : (
      <ul className="flex flex-col gap-2">
        {images.map((img) => (
          <li key={img.id} className="flex items-center gap-3 border p-2 rounded">
            <span>{img.originalName}</span>
            <img
              src={`${BACKEND_URL}/local/${img.filename}`}
              alt={img.originalName}
              className="w-16 h-16 object-cover border rounded"
              style={{ background: "#eee" }}
              loading="lazy"
            />
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default LocalImageList;