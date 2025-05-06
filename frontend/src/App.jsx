import React from 'react';
// import HeroSection from './components/HeroSection';
import ImageUploader from './components/ImageUploader';

const App = () => {
  return (
    <div className="app-container">
      {/* <HeroSection />
       */}
      <h1 className="text-3xl font-bold text-center my-8">Image Uploader</h1>
      <ImageUploader />
    </div>
  );
};

export default App;
