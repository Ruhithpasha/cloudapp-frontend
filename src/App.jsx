import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ImageUploader from './components/ImageUploader';
import LocalStorage from './pages/LocalStorage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cloudinary" element={<ImageUploader />} />
          <Route path="/local" element={<LocalStorage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
