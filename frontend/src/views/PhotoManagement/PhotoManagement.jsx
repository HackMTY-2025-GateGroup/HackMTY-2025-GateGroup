import { useState } from 'react';
import { Upload, Image as ImageIcon, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const PhotoManagement = () => {
  const [selectedFile, setSelectedFile] = useState(null);

  // TODO: Replace with actual Supabase storage upload
  // Example: const { mutate: uploadPhoto } = useMutation(uploadToSupabase);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // TODO: Upload to Supabase storage
      console.log('File selected:', file.name);
    }
  };

  // Placeholder photo data
  const photos = [
    {
      id: 1,
      url: '/placeholder.svg',
      filename: 'cart_loading_flight_aa101.jpg',
      uploadedAt: '2024-01-20 14:30',
      status: 'analyzed',
      tags: ['cart', 'loading', 'efficient'],
      aiResults: {
        efficiency: '94%',
        wasteDetected: 'Low',
        recommendations: 'Optimal loading pattern detected',
      },
    },
    {
      id: 2,
      url: '/placeholder.svg',
      filename: 'waste_analysis_ua205.jpg',
      uploadedAt: '2024-01-20 13:15',
      status: 'analyzing',
      tags: ['waste', 'analysis'],
      aiResults: null,
    },
    {
      id: 3,
      url: '/placeholder.svg',
      filename: 'inventory_check_morning.jpg',
      uploadedAt: '2024-01-20 09:00',
      status: 'analyzed',
      tags: ['inventory', 'morning'],
      aiResults: {
        efficiency: '87%',
        wasteDetected: 'Medium',
        recommendations: 'Consider adjusting beverage quantities',
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Photo Management</h2>
        <p className="text-muted-foreground mt-1">
          Upload and analyze cart loading photos with computer vision
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Photo for Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <label
              htmlFor="photo-upload"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP up to 10MB
                </p>
                {selectedFile && (
                  <p className="mt-2 text-sm font-medium text-primary">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              <input
                id="photo-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
            <Button className="w-full md:w-auto" disabled={!selectedFile}>
              <Upload className="mr-2 h-4 w-4" />
              Analyze Photo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search photos..." className="pl-9" />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Photo Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden">
            <div className="aspect-video bg-muted flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-sm truncate">
                    {photo.filename}
                  </h3>
                  <Badge
                    variant={
                      photo.status === 'analyzed' ? 'default' : 'secondary'
                    }
                  >
                    {photo.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {photo.uploadedAt}
                </p>
                <div className="flex flex-wrap gap-1">
                  {photo.tags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                {photo.aiResults && (
                  <div className="pt-2 border-t border-border space-y-1">
                    <p className="text-xs">
                      <span className="font-medium">Efficiency:</span>{' '}
                      {photo.aiResults.efficiency}
                    </p>
                    <p className="text-xs">
                      <span className="font-medium">Waste:</span>{' '}
                      {photo.aiResults.wasteDetected}
                    </p>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full mt-2">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PhotoManagement;
