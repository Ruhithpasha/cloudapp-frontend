# Frontend Documentation

## Overview

The frontend of the Cloud & Local Image Manager is built with React.js and Vite, providing a modern and responsive user interface for managing images with Cloudinary integration and local backup support.

## Core Components

### 1. App Configuration (`App.jsx`)
- Main application component
- Routing setup
- Global state management
- Layout structure

### 2. Image Management Components
- `ImageUpload.jsx`: File upload interface
- `ImageList.jsx`: Grid display of images
- `ImageCard.jsx`: Individual image display
- `ImageStatus.jsx`: Status indicators
- `RestoreButton.jsx`: Image restoration controls

### 3. API Integration (`api.js`)
- API client setup
- Request/response handling
- Error management
- Authentication handling

## Component Structure

### ImageUpload Component
```jsx
<ImageUpload>
  <Dropzone />           // File drop area
  <UploadProgress />     // Upload status
  <ErrorDisplay />       // Error messages
</ImageUpload>
```

### ImageList Component
```jsx
<ImageList>
  <ImageCard>           // Individual image cards
    <ImagePreview />    // Image thumbnail
    <ImageStatus />     // Status indicators
    <ActionButtons />   // Control buttons
  </ImageCard>
</ImageList>
```

## State Management

### Global State
```javascript
{
  images: [],           // List of images
  loading: boolean,     // Loading states
  error: string,        // Error messages
  uploadProgress: number // Upload progress
}
```

### Image Object Structure
```javascript
{
  id: string,
  filename: string,
  originalName: string,
  localPath: string,
  cloudinaryUrl: string,
  cloudinaryPublicId: string,
  uploadedAt: string,
  status: "available" | "missing",
  hasLocalFile: boolean
}
```

## API Integration

### Endpoints

#### 1. Upload Image
```javascript
POST /api/upload
Content-Type: multipart/form-data
Body: {
  image: File,
  backupKey: string,
  backupData: string,
  originalName: string
}
```

#### 2. List Images
```javascript
GET /api/images
Response: Image[]
```

#### 3. Restore Image
```javascript
POST /api/restore/:id
Response: Image
```

#### 4. Delete Image
```javascript
DELETE /api/images/:id
Response: { success: boolean }
```

## File Structure

```
frontend/
├── src/
│   ├── components/     # React components
│   │   ├── ImageUpload.jsx
│   │   ├── ImageList.jsx
│   │   ├── ImageCard.jsx
│   │   ├── ImageStatus.jsx
│   │   └── RestoreButton.jsx
│   ├── pages/         # Page components
│   │   ├── Home.jsx
│   │   └── NotFound.jsx
│   ├── api/           # API integration
│   │   └── api.js
│   ├── utils/         # Utility functions
│   │   ├── formatters.js
│   │   └── validators.js
│   ├── styles/        # CSS styles
│   │   └── main.css
│   ├── App.jsx        # Main app component
│   └── main.jsx       # Entry point
├── public/            # Static assets
├── index.html         # HTML template
├── vite.config.js     # Vite configuration
└── package.json       # Dependencies
```

## Environment Variables

Required environment variables:
```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

## Dependencies

- `react`: UI library
- `react-dom`: DOM rendering
- `react-router-dom`: Routing
- `axios`: HTTP client
- `tailwindcss`: CSS framework
- `@headlessui/react`: UI components
- `@heroicons/react`: Icons

## Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Start development server:
```bash
npm run dev
```

## Production Build

1. Build the application:
```bash
npm run build
```

2. Preview the build:
```bash
npm run preview
```

## UI/UX Features

1. Responsive Design
   - Mobile-first approach
   - Responsive grid layout
   - Adaptive image sizing

2. User Feedback
   - Loading states
   - Progress indicators
   - Error messages
   - Success notifications

3. Image Handling
   - Drag and drop upload
   - Image preview
   - Status indicators
   - Restore functionality

## Performance Optimization

1. Image Loading
   - Lazy loading
   - Progressive loading
   - Thumbnail generation
   - Caching strategies

2. Code Optimization
   - Code splitting
   - Tree shaking
   - Bundle optimization
   - Asset compression

## Testing

Run tests with:
```bash
npm test
```

## Contributing

1. Follow the coding standards
2. Write tests for new features
3. Update documentation
4. Submit pull requests

## Troubleshooting

Common issues and solutions:

1. Build Issues
   - Clear node_modules
   - Update dependencies
   - Check Vite configuration

2. API Connection
   - Verify environment variables
   - Check CORS settings
   - Validate API endpoints

3. UI Issues
   - Clear browser cache
   - Check browser console
   - Verify CSS loading
