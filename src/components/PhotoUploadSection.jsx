
import React, { useState, useEffect } from 'react';
import { Camera, Upload, X, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { analyzePropertyPhoto } from '@/services/claudeVisionService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const PhotoUploadSection = ({ deal, onPhotosUpdated }) => {
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [photos, setPhotos] = useState(deal.photos || []);

  // Sync with deal when it loads or is updated (e.g. from DB) so we use stored scan results
  useEffect(() => {
    const stored = deal?.photos;
    if (Array.isArray(stored) && stored.length >= 0) {
      setPhotos(stored);
    }
  }, [deal?.photos]);

  const handleFileUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    const newPhotos = [];
    const errors = [];

    try {
      for (const file of e.target.files) {
        try {
          const fileName = `${currentUser.id}/${deal.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          
          // 1. Upload to Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('property-photos')
            .upload(fileName, file);

          if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

          // 2. Get Public URL
          const { data: { publicUrl } } = supabase.storage
            .from('property-photos')
            .getPublicUrl(fileName);

          // 3. Analyze with Vision AI
          const analysis = await analyzePropertyPhoto(publicUrl);

          newPhotos.push({
            url: publicUrl,
            path: fileName,
            analysis,
            uploaded_at: new Date().toISOString()
          });
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          errors.push(file.name);
        }
      }

      if (newPhotos.length > 0) {
        // 4. Update Deal Record
        const updatedPhotos = [...photos, ...newPhotos];
        const { error: dbError } = await supabase
          .from('deals')
          .update({ photos: updatedPhotos })
          .eq('id', deal.id);

        if (dbError) throw new Error(`Database update failed: ${dbError.message}`);

        setPhotos(updatedPhotos);
        if (onPhotosUpdated) onPhotosUpdated(updatedPhotos);
        toast({ title: "Photos Uploaded", description: `Analyzed ${newPhotos.length} photos successfully.` });
      }

      if (errors.length > 0) {
        toast({ 
          variant: "destructive", 
          title: "Some uploads failed", 
          description: `Failed to upload: ${errors.join(', ')}` 
        });
      }

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Upload Process Failed", description: error.message });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (photoPath) => {
     try {
       const updatedPhotos = photos.filter(p => p.path !== photoPath);
       
       // Update DB first to update UI
       const { error: dbError } = await supabase.from('deals').update({ photos: updatedPhotos }).eq('id', deal.id);
       if (dbError) throw dbError;

       setPhotos(updatedPhotos);
       
       // Then try delete from storage (optional, can fail silently)
       const { error: storageError } = await supabase.storage.from('property-photos').remove([photoPath]);
       if (storageError) console.warn("Storage delete warning:", storageError);
       
       toast({ title: "Photo Deleted", description: "Photo removed from deal." });
     } catch (error) {
       toast({ variant: "destructive", title: "Delete Failed", description: error.message });
     }
  };

  const handleRefreshAnalysis = async () => {
    if (!photos.length) return;
    setRefreshing(true);
    try {
      const updatedPhotos = await Promise.all(
        photos.map(async (photo) => {
          const url = photo.url || photo;
          const analysis = await analyzePropertyPhoto(url);
          return {
            ...photo,
            analysis,
            uploaded_at: photo.uploaded_at || new Date().toISOString()
          };
        })
      );
      const { error: dbError } = await supabase
        .from('deals')
        .update({ photos: updatedPhotos })
        .eq('id', deal.id);
      if (dbError) throw dbError;
      setPhotos(updatedPhotos);
      if (onPhotosUpdated) onPhotosUpdated(updatedPhotos);
      toast({ title: "Analysis refreshed", description: "Scan results updated for all photos." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Refresh failed", description: error.message });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-card p-6 rounded-2xl border border-border mb-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
           <Camera className="w-5 h-5 text-primary" /> Site Photos & AI Analysis
        </h3>
        <div className="flex items-center gap-2">
          {photos.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || refreshing}
              onClick={handleRefreshAnalysis}
              className="border-border text-foreground hover:bg-accent"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {refreshing ? 'Re-analyzing...' : 'Refresh analysis'}
            </Button>
          )}
          <div className="relative">
             <input 
               type="file" 
               multiple 
               accept="image/*"
               onChange={handleFileUpload}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
               disabled={uploading}
             />
             <Button disabled={uploading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? 'Analyzing...' : 'Upload Photos'}
             </Button>
          </div>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
           <p className="text-muted-foreground">Upload photos to detect damages and estimate repair needs automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {photos.map((photo, idx) => (
             <div key={idx} className="bg-muted/50 rounded-lg overflow-hidden border border-border group relative">
                <img src={photo.url} alt="Property" className="w-full h-40 object-cover" />
                <button 
                  onClick={() => handleDelete(photo.path)}
                  className="absolute top-2 right-2 bg-background/80 p-1 rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X size={14} />
                </button>
                <div className="p-3">
                   <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                         photo.analysis?.condition === 'Needs Repair' ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-600'
                      }`}>
                         {photo.analysis?.condition || 'Analyzed'}
                      </span>
                   </div>
                   <p className="text-xs text-muted-foreground line-clamp-2">{photo.analysis?.observations}</p>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUploadSection;
