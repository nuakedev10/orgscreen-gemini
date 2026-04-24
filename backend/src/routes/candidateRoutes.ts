import { Router } from 'express';
import {
  addCandidates,
  uploadCSVCandidates,
  uploadPDFCandidate,
  uploadMultiplePDFs,
  getCandidates,
  updateCandidateStatus
} from '../controllers/candidateController';
import { upload, resumeUpload } from '../middleware/upload';

const router = Router();

router.post('/', addCandidates);
router.post('/upload/csv', upload.single('file'), uploadCSVCandidates);
router.post('/upload/pdf', upload.single('file'), uploadPDFCandidate);
router.post('/upload/pdfs', resumeUpload.array('files', 25), uploadMultiplePDFs);
router.get('/', getCandidates);
router.patch('/:id/status', updateCandidateStatus);

export default router;
