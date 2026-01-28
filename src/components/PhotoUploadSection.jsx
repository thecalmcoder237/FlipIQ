
import React, { useState } from 'react';
import { Camera, Upload, X, Loader2, Eye } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { analyzePropertyPhoto } from '@/services/claudeVisionService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const PhotoUploadSection = ({ deal, onPhotosUpdated }) => {
  const [uploading, setUploading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [photos, setPhotos] = useState(deal.photos || []);

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

  return (
    <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/10 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
           <Camera className="w-5 h-5 text-gold-400" /> Site Photos & AI Analysis
        </h3>
        <div className="relative">
           <input 
             type="file" 
             multiple 
             accept="image/*"
             onChange={handleFileUpload}
             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
             disabled={uploading}
           />
           <Button disabled={uploading} className="bg-white/10 hover:bg-white/20 text-white">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? 'Analyzing...' : 'Upload Photos'}
           </Button>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-xl">
           <p className="text-gray-500">Upload photos to detect damages and estimate repair needs automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {photos.map((photo, idx) => (
             <div key={idx} className="bg-slate-900 rounded-lg overflow-hidden border border-white/10 group relative">
                <img src={photo.url} alt="Property" className="w-full h-40 object-cover" />
                <button 
                  onClick={() => handleDelete(photo.path)}
                  className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                >
                  <X size={14} />
                </button>
                <div className="p-3">
                   <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                         photo.analysis?.condition === 'Needs Repair' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                         {photo.analysis?.condition || 'Analyzed'}
                      </span>
                   </div>
                   <p className="text-xs text-gray-400 line-clamp-2">{photo.analysis?.observations}</p>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUploadSection;
