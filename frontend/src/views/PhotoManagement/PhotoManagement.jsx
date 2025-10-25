import { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { get, uploadMultipart } from '@/lib/api';
import config from '@/config/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const PhotoManagement = () => {
  // two-photo bundle state
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { toast } = useToast();
  const { signOut } = useAuth();

  // Fetch gallery (uses lib/api -> config.endpoints.photoList)
  const {
    data: photosResp,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['photoList'],
    queryFn: () => get('photoList'),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    onError: (err) => {
      if (err?.status === 401) signOut();
      else {
        console.error('Error loading photos', err);
      }
    },
  });

  // Normalize backend response -> array of bundles
  const photos = Array.isArray(photosResp?.data?.photos)
    ? photosResp.data.photos
    : (Array.isArray(photosResp?.photos) ? photosResp.photos : [
      // fallback placeholders
      {
        id: 1,
        frontUrl: '/placeholder-front.svg',
        backUrl: '/placeholder-back.svg',
        filename: 'bundle_aa101_front/back',
        uploadedAt: '2024-01-20 14:30',
        status: 'analyzed',
        tags: ['cart', 'loading'],
        aiResults: { efficiency: '94%', wasteDetected: 'Low' },
      },
    ]);

  useEffect(() => {
    return () => {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      if (backPreview) URL.revokeObjectURL(backPreview);
    };
  }, [frontPreview, backPreview]);

  const handleFrontChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFrontFile(f);
      setFrontPreview(URL.createObjectURL(f));
    }
  };

  const handleBackChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setBackFile(f);
      setBackPreview(URL.createObjectURL(f));
    }
  };

  // Upload bundle using same pattern as other components: endpoint from config + token from localStorage
  const handleUploadBundle = async () => {
    if (!frontFile || !backFile) {
      toast({
        title: 'Select both photos',
        description: 'Please provide both front and back photos of the trolley.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('front', frontFile);
      fd.append('back', backFile);
      // optional metadata (trolleyId, flightId) may be appended here

      // Use centralized upload helper
      const result = await uploadMultipart('photoUpload', fd);

      toast({
        title: 'Upload successful',
        description: 'Bundle uploaded. Backend will process analysis.',
      });

      // clear inputs and previews
      setFrontFile(null);
      setBackFile(null);
      if (frontPreview) { URL.revokeObjectURL(frontPreview); setFrontPreview(null); }
      if (backPreview) { URL.revokeObjectURL(backPreview); setBackPreview(null); }

      // refresh gallery
      refetch();
    } catch (err) {
      // Unauthorized -> sign out
      if (err?.status === 401) {
        await signOut();
        return;
      }

      toast({
        title: 'Upload failed',
        description: err.message || 'Could not upload photos',
        variant: 'destructive',
      });
      console.error('Upload error', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Photo Management</h2>
        <p className="text-muted-foreground mt-1">
          Upload and analyze cart loading photos (front + back bundle)
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Front & Back Photos (Bundle)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 items-start">
            <label
              htmlFor="photo-front"
              className="flex flex-col items-center justify-center h-44 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="mb-1 text-sm text-muted-foreground">Front photo</p>
                {frontPreview && (
                  <img src={frontPreview} alt="front preview" className="mt-3 max-h-28 object-contain" />
                )}
              </div>
              <input id="photo-front" type="file" className="hidden" accept="image/*" onChange={handleFrontChange} />
            </label>

            <label
              htmlFor="photo-back"
              className="flex flex-col items-center justify-center h-44 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="mb-1 text-sm text-muted-foreground">Back photo</p>
                {backPreview && (
                  <img src={backPreview} alt="back preview" className="mt-3 max-h-28 object-contain" />
                )}
              </div>
              <input id="photo-back" type="file" className="hidden" accept="image/*" onChange={handleBackChange} />
            </label>

            <div className="md:col-span-2 flex items-center gap-2">
              <Button className="w-full md:w-auto" onClick={handleUploadBundle} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Bundle for Analysis'}
              </Button>
              <Button variant="outline" onClick={() => {
                setFrontFile(null); setBackFile(null);
                if (frontPreview) { URL.revokeObjectURL(frontPreview); setFrontPreview(null); }
                if (backPreview) { URL.revokeObjectURL(backPreview); setBackPreview(null); }
              }}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search / Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search bundles..." className="pl-9" />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Photo Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div>Loading photos...</div>
        ) : error ? (
          <div className="text-destructive">Error loading photos</div>
        ) : (
          photos.map((bundle) => (
            <Card key={bundle.id} className="overflow-hidden">
              <div className="flex gap-2 p-2 bg-muted/10">
                <div className="flex-1 aspect-video bg-black/5 flex items-center justify-center">
                  <img src={bundle.frontUrl || bundle.front || bundle.url || '/placeholder-front.svg'} alt="front" className="max-h-44 object-contain" />
                </div>
                <div className="flex-1 aspect-video bg-black/5 flex items-center justify-center">
                  <img src={bundle.backUrl || bundle.back || '/placeholder-back.svg'} alt="back" className="max-h-44 object-contain" />
                </div>
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm truncate">{bundle.filename || bundle.id}</h3>
                    <Badge variant={bundle.status === 'analyzed' ? 'default' : 'secondary'}>{bundle.status || 'pending'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{bundle.uploadedAt}</p>
                  <div className="flex flex-wrap gap-1">
                    {(bundle.tags || []).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>

                  {bundle.aiResults && (
                    <div className="pt-2 border-t border-border space-y-1">
                      <p className="text-xs"><span className="font-medium">Efficiency:</span> {bundle.aiResults.efficiency}</p>
                      <p className="text-xs"><span className="font-medium">Waste:</span> {bundle.aiResults.wasteDetected}</p>
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full mt-2">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PhotoManagement;
