import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">Welcome to</span>
          <span className="block bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            CloudApp
          </span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          A powerful image management solution that combines cloud storage with local backups
        </p>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Cloudinary Integration</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Upload and manage your images in the cloud with automatic backup
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <Link
              to="/cloudinary"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              View Cloudinary Images →
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Local Storage</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Access your local backups and manage them efficiently
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <Link
              to="/local"
              className="text-sm font-medium text-green-600 hover:text-green-500"
            >
              View Local Storage →
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Open Source</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Check out the source code and contribute to the project
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <a
              href="https://github.com/yourusername"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-purple-600 hover:text-purple-500"
            >
              View GitHub Profile →
            </a>
          </div>
        </div>
      </div>

      {/* Instructions Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900">How to Use</h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                  <span className="text-sm font-medium text-blue-600">1</span>
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  Upload your images to Cloudinary through our intuitive interface
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                  <span className="text-sm font-medium text-blue-600">2</span>
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  Automatic local backups are created for every upload
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                  <span className="text-sm font-medium text-blue-600">3</span>
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  Restore missing images from local backups with a single click
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 