import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Image, Loader2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { photosService } from '@/services/projectManagementService';

const PhotoJournal = ({ dealId, sowItems = [], tasks = [], photos = [], onPhotosChange }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ label: '', notes: '', sow_id: '', task_id: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [viewPhoto, setViewPhoto] = useState(null);
  const fileRef = useRef();
  const { toast } = useToast();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const { url } = await photosService.upload(dealId, selectedFile, {
        sowId: uploadForm.sow_id || undefined,
        taskId: uploadForm.task_id || undefined,
      });
      const created = await photosService.create(dealId, {
        url,
        label: uploadForm.label || null,
        notes: uploadForm.notes || null,
        sow_id: uploadForm.sow_id || null,
        task_id: uploadForm.task_id || null,
        taken_at: new Date().toISOString(),
      });
      onPhotosChange?.([created, ...photos]);
      setUploadModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadForm({ label: '', notes: '', sow_id: '', task_id: '' });
      toast({ title: 'Photo uploaded' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Upload failed', description: e.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo) => {
    if (!confirm('Delete this photo?')) return;
    try {
      await photosService.delete(photo.id);
      onPhotosChange?.((photos || []).filter((p) => p.id !== photo.id));
      toast({ title: 'Photo deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const sowName = (sowId) => sowItems.find((s) => s.id === sowId)?.name || '';
  const taskName = (taskId) => tasks.find((t) => t.id === taskId)?.title || '';

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Photo Journal ({photos.length})
          </h3>
          <Button
            onClick={() => setUploadModal(true)}
            size="sm"
            className="gap-2 bg-accentBrand hover:bg-accentBrand/90 text-white"
          >
            <Upload className="w-4 h-4" />
            Upload Photo
          </Button>
        </div>

        {photos.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No photos yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload before/after photos, progress shots, and milestones.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square bg-muted rounded-xl overflow-hidden border border-border cursor-pointer"
                onClick={() => setViewPhoto(photo)}
              >
                <img
                  src={photo.url}
                  alt={photo.label || 'Rehab photo'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden w-full h-full items-center justify-center bg-muted">
                  <Image className="w-8 h-8 text-muted-foreground" />
                </div>

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(photo); }}
                    className="self-end p-1 bg-destructive/80 rounded-lg text-white hover:bg-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div>
                    {photo.label && (
                      <p className="text-xs font-medium text-white truncate">{photo.label}</p>
                    )}
                    {photo.sow_id && (
                      <p className="text-xs text-white/70 truncate">{sowName(photo.sow_id)}</p>
                    )}
                    <p className="text-xs text-white/50">
                      {new Date(photo.taken_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={uploadModal} onOpenChange={setUploadModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* File picker */}
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-h-40 mx-auto rounded-lg object-contain" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select a photo</p>
                  <p className="text-xs text-muted-foreground">JPEG, PNG, WEBP</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Label / Caption</label>
              <input
                className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder='e.g. "Before drywall", "After tile install"'
                value={uploadForm.label}
                onChange={(e) => setUploadForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
              <textarea
                className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={2}
                value={uploadForm.notes}
                onChange={(e) => setUploadForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Scope Item</label>
                <select
                  className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={uploadForm.sow_id}
                  onChange={(e) => setUploadForm((p) => ({ ...p, sow_id: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {sowItems.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Task</label>
                <select
                  className="w-full bg-muted border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={uploadForm.task_id}
                  onChange={(e) => setUploadForm((p) => ({ ...p, task_id: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModal(false)} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo viewer */}
      {viewPhoto && (
        <Dialog open={!!viewPhoto} onOpenChange={() => setViewPhoto(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewPhoto.label || 'Photo'}</DialogTitle>
            </DialogHeader>
            <img
              src={viewPhoto.url}
              alt={viewPhoto.label || 'Rehab photo'}
              className="w-full max-h-[60vh] object-contain rounded-lg"
            />
            <div className="text-sm text-muted-foreground space-y-1">
              {viewPhoto.notes && <p>{viewPhoto.notes}</p>}
              {viewPhoto.sow_id && <p>Scope: {sowName(viewPhoto.sow_id)}</p>}
              {viewPhoto.task_id && <p>Task: {taskName(viewPhoto.task_id)}</p>}
              <p>{new Date(viewPhoto.taken_at).toLocaleString()}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default PhotoJournal;
