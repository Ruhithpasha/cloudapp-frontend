# Cloud & Local Image Manager

A full-stack application for managing images with both cloud storage (Cloudinary) and local backup support. This application ensures your images are never lost by maintaining both cloud and local copies.

## Features

- 📤 Upload images to Cloudinary with automatic local backup
- 🔍 Check image existence in Cloudinary
- 🔄 Restore missing images from local backups
- 📱 Responsive and modern UI
- 🔒 Secure image storage and management
- 📊 Image status monitoring
- 🚀 Fast and efficient image loading

## Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- React Router

### Backend
- Node.js
- Express.js
- Cloudinary SDK
- Multer (for file uploads)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Cloudinary account
- Git

## Environment Variables

### Backend (.env)
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=3001
```

### Frontend (.env)
```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cloudapp.git
cd cloudapp
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

3. Access the application at `http://localhost:3000`

## API Documentation

### Endpoints

#### 1. Upload Image
- **POST** `/api/upload`
- Uploads an image to Cloudinary and creates a local backup
- **Body**: `multipart/form-data`
  - `image`: Image file
  - `backupKey`: Unique key for local backup
  - `backupData`: Base64 encoded backup data
  - `originalName`: Original filename

#### 2. List Images
- **GET** `/api/images`
- Returns list of all images with their status
- **Response**: Array of image objects with status

#### 3. Restore Image
- **POST** `/api/restore/:id`
- Restores a missing image from local backup to Cloudinary
- **Params**: 
  - `id`: Image ID

#### 4. Delete Image
- **DELETE** `/api/images/:id`
- Deletes an image from both Cloudinary and local storage
- **Params**:
  - `id`: Image ID

#### 5. Health Check
- **GET** `/api/health`
- Returns server status
- **Response**: `{ status: 'ok', timestamp: string }`

## Project Structure

```
cloudapp/
├── backend/
│   ├── index.js          # Main server file
│   ├── cloudinary.js     # Cloudinary configuration and helpers
│   ├── database.js       # Database operations
│   ├── routes/           # API routes
│   └── uploads/          # Local image storage
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   └── App.jsx       # Main app component
│   └── vite.config.js    # Vite configuration
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Cloudinary](https://cloudinary.com/) for image management
- [React](https://reactjs.org/) for the frontend framework
- [Express](https://expressjs.com/) for the backend framework
- [Tailwind CSS](https://tailwindcss.com/) for styling 