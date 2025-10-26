import { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Search, Filter, Package, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { get, post, uploadTrayBundle } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const PhotoManagement = () => {
  // State for image upload
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [trolleyCode, setTrolleyCode] = useState('');
  
  // State for analysis results
  const [analysisResult, setAnalysisResult] = useState(null);

  const { toast } = useToast();
  const { signOut } = useAuth();

  // Ensure trolley exists in backend
  const ensureTrolleyExists = async (code) => {
    if (!code) return false;
    try {
      const list = await get('trolleys');
      const arr = list?.data?.trolleys || list?.trolleys || [];
      const exists = Array.isArray(arr) && arr.some(t => String(t.code).toLowerCase() === code.toLowerCase());
      if (exists) return true;
      
      // Try to create when not present
      const created = await post('trolleys', { code });
      return Boolean(created?.data?.trolley || created?.trolley);
    } catch (e) {
      console.warn('ensureTrolleyExists error (continuing):', e);
      return false;
    }
  };

  // Fetch gallery (uses lib/api -> config.endpoints.photoList)
  const {
    data: photosResp,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['photoList'],
    queryFn: () => fetchPhotoList(),
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
    : (Array.isArray(photosResp?.photos) ? photosResp.photos : []);

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

  // Upload and analyze tray using centralized multipart helper
  const handleAnalyzeTray = async () => {
    if (!frontFile || !backFile) {
      toast({
        title: 'Select both photos',
        description: 'Please provide both front and back photos of the tray.',
        variant: 'destructive',
      });
      return;
    }

    if (!trolleyCode?.trim()) {
      toast({
        title: 'Enter trolley code',
        description: 'Please provide a trolley code (e.g., TRL-001).',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setAnalysisResult(null);

    try {
      // Ensure trolley exists
      await ensureTrolleyExists(trolleyCode.trim());

      // Create FormData with both images
      const formData = new FormData();
      formData.append('front', frontFile);
      formData.append('back', backFile);
      formData.append('trolleyCode', trolleyCode.trim());
      formData.append('specName', 'doubleside.mx');

      // Use centralized multipart upload helper which resolves endpoint keys via config
      // 'analyzeTray' should map to config.endpoints.analyzeTray (e.g. '/api/occupancy/analyze-tray')
      const body = await uploadTrayBundle(...formData);

      // Normalize backend shapes:
      // possible shapes: { success: true, data: { result: {...} } }
      // or { ok: true, result: {...} } or { result: {...} } etc.
      const result =
        body?.data?.result ||
        body?.data ||
        body?.result ||
        (body?.ok && body?.result) ||
        body;

      if (!result) {
        throw new Error('Invalid response from server');
      }

      setAnalysisResult(result);

      toast({
        title: 'Analysis completed',
        description: `Occupancy: ${result?.occupancy?.overall?.percent ?? 'N/A'}% — ${result?.recommendations?.message ?? ''}`,
      });

      // Refresh gallery (server should append new bundle when processed)
      refetch();
    } catch (err) {
      // Unauthorized -> sign out
      if (err?.status === 401) {
        await signOut();
        return;
      }

      toast({
        title: 'Analysis failed',
        description: err.message || 'Could not analyze tray',
        variant: 'destructive',
      });
      console.error('Analysis error', err);
    } finally {
      setUploading(false);
    }
  };

  const clearForm = () => {
    setFrontFile(null);
    setBackFile(null);
    if (frontPreview) { URL.revokeObjectURL(frontPreview); setFrontPreview(null); }
    if (backPreview) { URL.revokeObjectURL(backPreview); setBackPreview(null); }
    setTrolleyCode('');
    setAnalysisResult(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'optimal': return 'default';
      case 'needs_refill': return 'destructive';
      case 'overfilled': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Tray Analysis & Inventory Management</h2>
        <p className="text-muted-foreground mt-1">
          Upload front and back photos to analyze tray occupancy and get inventory recommendations
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Tray Photos</CardTitle>
          <CardDescription>
            Take photos of both sides of the tray for complete analysis
          </CardDescription>
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

            <div className="md:col-span-2 flex flex-col md:flex-row items-stretch md:items-center gap-2">
              <Input
                placeholder="Trolley code (e.g., TRL-001)"
                value={trolleyCode}
                onChange={(e) => setTrolleyCode(e.target.value)}
                className="md:w-64"
              />
              <Button 
                className="w-full md:w-auto" 
                onClick={handleAnalyzeTray} 
                disabled={uploading || !frontFile || !backFile || !trolleyCode}
              >
                {uploading ? 'Analyzing...' : 'Analyze Tray'}
              </Button>
              <Button variant="outline" onClick={clearForm}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <>
          {/* Overall Status */}
          <Alert variant={analysisResult.recommendations.status === 'needs_refill' ? 'destructive' : 'default'}>
            {analysisResult.recommendations.status === 'optimal' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle className="text-lg font-semibold">
              Status: {analysisResult.recommendations.status.replace('_', ' ').toUpperCase()}
            </AlertTitle>
            <AlertDescription>
              {analysisResult.recommendations.message}
            </AlertDescription>
          </Alert>

          {/* Occupancy Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overall Occupancy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {analysisResult.occupancy.overall.percent}%
                </div>
                <Progress value={analysisResult.occupancy.overall.percent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {analysisResult.occupancy.overall.volumeUsedLiters.toFixed(2)}L / {analysisResult.occupancy.overall.totalCapacityLiters.toFixed(2)}L
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Front Side</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">
                  {analysisResult.occupancy.front.overallPercent}%
                </div>
                <Progress value={analysisResult.occupancy.front.overallPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {analysisResult.inventory.front.currentProducts.length} product types detected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Back Side</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">
                  {analysisResult.occupancy.back.overallPercent}%
                </div>
                <Progress value={analysisResult.occupancy.back.overallPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {analysisResult.inventory.back.currentProducts.length} product types detected
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Current Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Current Products in Tray
              </CardTitle>
              <CardDescription>Products detected by computer vision analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {/* Front Side Products */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Front Side</h4>
                  {analysisResult.inventory.front.currentProducts.length > 0 ? (
                    <div className="space-y-2">
                      {analysisResult.inventory.front.currentProducts.map((product, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                          <div>
                            <p className="font-medium text-sm">{product.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.detected} units • {product.totalVolume.toFixed(2)}L
                            </p>
                          </div>
                          <Badge variant="outline">{product.detected}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No products detected</p>
                  )}
                </div>

                {/* Back Side Products */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-muted-foreground">Back Side</h4>
                  {analysisResult.inventory.back.currentProducts.length > 0 ? (
                    <div className="space-y-2">
                      {analysisResult.inventory.back.currentProducts.map((product, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                          <div>
                            <p className="font-medium text-sm">{product.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.detected} units • {product.totalVolume.toFixed(2)}L
                            </p>
                          </div>
                          <Badge variant="outline">{product.detected}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No products detected</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shopping List */}
          {analysisResult.shoppingList && analysisResult.shoppingList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recommended Shopping List
                </CardTitle>
                <CardDescription>Products needed to optimize tray capacity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisResult.shoppingList.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.notes}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={item.priority === 'high' ? 'destructive' : 'secondary'}>
                          {item.priority}
                        </Badge>
                        <div className="text-right">
                          <p className="font-bold text-lg">{item.quantity}</p>
                          <p className="text-xs text-muted-foreground">units</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
      {/*
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search analysis history..." className="pl-9" />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div>Loading photos...</div>
        ) : error ? (
          <div className="text-destructive">Error loading photos</div>
        ) : photos.length > 0 ? (
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
        ) : (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            No analysis history yet. Upload your first tray photos above.
          </div>
        )}
      </div>
      */}
    </div>
  );
};

export default PhotoManagement;