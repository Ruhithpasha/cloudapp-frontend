import { useState, useEffect } from 'react';

const LocalStorage = () => {
  const [localBackups, setLocalBackups] = useState([]);

  useEffect(() => {
    // Load local backups from localStorage
    const loadLocalBackups = () => {
      const backups = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('backup_image_')) {
          const data = localStorage.getItem(key);
          try {
            const backupData = JSON.parse(data);
            backups.push({
              key,
              ...backupData,
              timestamp: new Date(parseInt(key.split('_')[2])).toLocaleString()
            });
          } catch (e) {
            console.error('Error parsing backup data:', e);
          }
        }
      }
      setLocalBackups(backups.sort((a, b) => b.timestamp - a.timestamp));
    };

    loadLocalBackups();
    window.addEventListener('storage', loadLocalBackups);
    return () => window.removeEventListener('storage', loadLocalBackups);
  }, []);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Local Storage Backups</h2>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your local image backups
          </p>
        </div>
      </div>

      {localBackups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No backups found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload some images to create local backups
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {localBackups.map((backup) => (
            <div
              key={backup.key}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-4">
                <div className="aspect-w-16 aspect-h-9 mb-4">
                  <img
                    src={backup.data}
                    alt={backup.originalName}
                    className="object-cover rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {backup.originalName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Backed up on {backup.timestamp}
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <svg
                      className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {new Date(backup.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocalStorage; 