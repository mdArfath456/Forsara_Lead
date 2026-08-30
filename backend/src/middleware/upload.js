import multer from 'multer';

// Memory storage — CSVs are parsed immediately and never written to disk,
// so there's nothing to clean up afterward and no path traversal surface.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB — generous for a lead list, blocks accidental huge uploads
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Only .csv files are accepted'));
    }
    cb(null, true);
  },
});
